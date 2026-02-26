export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ensureRollingVisits } from "@/lib/ensureRollingVisits";
import { timestampToNYDateString } from "@/lib/timeUtils";

async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin(req);

        // ── Fetch supporting maps in parallel ──────────────────────────────────
        const [usersSnap, plansSnap, propsSnap] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("servicePlans").get(),
            adminDb.collection("properties").get(),
        ]);

        const userMap = new Map(usersSnap.docs.map(d => [d.id, d.data()]));
        const planMap = new Map(plansSnap.docs.map(d => [d.id, d.data()]));
        const propMap = new Map(propsSnap.docs.map(d => [d.id, d.data()]));

        // ── Primary query: indexed scalar field, NO orderBy (avoids composite index requirement) ──
        // Sorted in memory below.
        let primaryDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
        try {
            const primarySnap = await adminDb.collection("visits")
                .where("clientRequestStatus", "==", "pending")
                .get();
            primaryDocs = primarySnap.docs;
            console.log("[admin/requests] PRIMARY query (clientRequestStatus==pending) count:", primaryDocs.length);
        } catch (primaryErr) {
            console.error("[admin/requests] PRIMARY query failed:", primaryErr);
        }

        // ── Fallback debug query: catches legacy visits that have clientRequest but no scalar status field ──
        // This runs every time so we can see if data exists but fields are mismatched.
        try {
            const fallbackSnap = await adminDb.collection("visits")
                .where("clientRequest", "!=", null)
                .limit(10)
                .get();

            if (fallbackSnap.size > 0) {
                console.log("[admin/requests] FALLBACK (clientRequest!=null) found", fallbackSnap.size, "docs:");
                fallbackSnap.docs.slice(0, 3).forEach(doc => {
                    const d = doc.data();
                    console.log("  visitId:", doc.id, {
                        clientRequestStatus: d.clientRequestStatus ?? "MISSING",
                        clientRequestType: d.clientRequestType ?? "MISSING",
                        clientRequest: d.clientRequest,
                        completionStatus: d.completionStatus,
                    });
                });

                // Merge any legacy docs (have clientRequest but no clientRequestStatus) into results
                const primaryIds = new Set(primaryDocs.map(d => d.id));
                const legacyDocs = fallbackSnap.docs.filter(doc => {
                    const d = doc.data();
                    return !primaryIds.has(doc.id)
                        && !d.clientRequestStatus   // missing the new field
                        && d.clientRequest?.type;   // has the old object
                });

                if (legacyDocs.length > 0) {
                    console.log("[admin/requests] Found", legacyDocs.length, "legacy docs with clientRequest but no scalar fields — including them.");
                    primaryDocs = [...primaryDocs, ...legacyDocs];
                }
            } else {
                console.log("[admin/requests] FALLBACK: no visits with clientRequest field found at all.");
            }
        } catch (fallbackErr) {
            console.error("[admin/requests] FALLBACK query failed:", fallbackErr);
        }

        // ── Build response objects ─────────────────────────────────────────────
        const visits = primaryDocs
            .map(doc => {
                const data = doc.data();
                const reqData = data.clientRequest as Record<string, unknown> | null;

                // Skip docs that have been approved/denied (from legacy merge)
                const status = data.clientRequestStatus ?? (reqData?.type ? "pending" : null);
                if (status !== "pending") return null;

                const ownerUid = data.ownerUid ?? data.customerUid;
                const user = userMap.get(ownerUid);
                const plan = planMap.get(data.servicePlanId);
                const prop = plan ? propMap.get(plan.propertyId) : undefined;

                return {
                    // Spread data first so our explicit fields below ALWAYS win.
                    // BUG HISTORY: placing id before ...data let data.id override doc.id
                    ...data,
                    // These MUST come after the spread — they are the source of truth.
                    id: doc.id,   // Firestore document ID
                    visitId: doc.id,   // explicit alias — use in action handlers
                    scheduledDate: typeof data.scheduledDate === "string"
                        ? data.scheduledDate
                        : timestampToNYDateString(data.scheduledDate),
                    clientName: user?.fullName || user?.displayName || "Unknown User",
                    clientEmail: user?.email || null,
                    address: prop?.address ?? null,
                    requestType: data.clientRequestType ?? reqData?.type ?? "skip",
                    requestStatus: status,
                    requestReason: reqData?.reason ?? null,
                };
            })
            .filter(Boolean)
            // Sort by scheduledDate ascending in memory (avoids composite index)
            .sort((a, b) => {
                const aDate = (a as Record<string, unknown>).scheduledDate as string;
                const bDate = (b as Record<string, unknown>).scheduledDate as string;
                return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
            });

        console.log("[admin/requests] Returning", visits.length, "pending requests to admin.");
        return NextResponse.json({ success: true, visits });

    } catch (err) {
        console.error("GET /api/admin/requests error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin(req);

        const { visitId, action } = await req.json();
        if (!visitId || !["approve", "deny"].includes(action)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const visitRef = adminDb.collection("visits").doc(visitId);
        const visitSnap = await visitRef.get();
        if (!visitSnap.exists) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;
        const reqData = visitData.clientRequest as Record<string, unknown> | null;

        // Accept visits that have either the new scalar OR the legacy clientRequest object
        const isPending = visitData.clientRequestStatus === "pending"
            || (!visitData.clientRequestStatus && reqData?.type);

        if (!isPending) {
            return NextResponse.json(
                { error: "Visit has no pending client request" },
                { status: 400 }
            );
        }

        const safeDateStr = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        if (action === "approve") {
            // Log so we can verify the exact doc being updated
            console.log(`[admin/requests] Approving skip for visitId=${visitId}, scheduledDate=${safeDateStr}, ownerUid=${visitData.ownerUid ?? visitData.customerUid}`);

            await visitRef.update({
                completionStatus: "skipped",
                chargeStatus: "not_required",
                clientRequestStatus: "approved",
                clientRequestResolvedAt: FieldValue.serverTimestamp(),
                // Marks this as a real admin-approved skip (not a system rebuild artifact)
                skipSource: "client_request_approved",
                updatedAt: FieldValue.serverTimestamp(),
            });
            await ensureRollingVisits(visitData.servicePlanId);

        } else if (action === "deny") {
            console.log(`[admin/requests] Denying skip for visitId=${visitId}, scheduledDate=${safeDateStr}, ownerUid=${visitData.ownerUid ?? visitData.customerUid}`);

            await visitRef.update({
                clientRequestStatus: "denied",
                clientRequestResolvedAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        console.log("[admin/requests] POST action:", action, "visitId:", visitId, "done.");
        return NextResponse.json({ success: true, action });

    } catch (err) {
        console.error("POST /api/admin/requests error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
