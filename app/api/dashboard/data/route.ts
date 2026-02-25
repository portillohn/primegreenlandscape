/**
 * GET /api/dashboard/data
 *
 * Server-side dashboard data fetcher using firebase-admin.
 * Bypasses Firestore security rules — auth is enforced via Firebase ID token.
 *
 * DESIGN NOTES:
 * - Uses simple single-field WHERE queries (no composite indexes required)
 * - Sort/filter done in JS after fetching to avoid index errors
 * - Falls back to customerUid for legacy docs
 * - All Firestore Timestamps serialized to ISO strings
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { timestampToNYDateString } from "@/lib/timeUtils";

/** Serialize Firestore Timestamps and nested objects */
function serialize<T>(obj: T): T {
    return JSON.parse(
        JSON.stringify(obj, (_, v) => {
            if (v && typeof v === "object" && typeof v.toDate === "function") {
                return (v as { toDate: () => Date }).toDate().toISOString();
            }
            return v;
        })
    );
}

export async function GET(req: NextRequest) {
    // ── 1. Auth via Bearer token ──────────────────────────────────────────────
    const raw = req.headers.get("authorization") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
        return NextResponse.json({ ok: false, error: "Unauthorized — no token" }, { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
    } catch (authErr) {
        const msg = authErr instanceof Error ? authErr.message : String(authErr);
        console.error("[api/dashboard/data] Auth error:", msg);
        return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    // ── 2. Main data fetching ─────────────────────────────────────────────────
    try {
        const today = timestampToNYDateString(new Date());

        // ── Profile ───────────────────────────────────────────────────────────
        const userSnap = await adminDb.collection("users").doc(uid).get();
        const profile: Record<string, unknown> = userSnap.exists
            ? { uid, ...userSnap.data() }
            : { uid };

        // ── Active service plan ───────────────────────────────────────────────
        // Simple single-field query — no composite index required.
        // We do filter by status in JS to avoid a compound index.
        let planDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

        const byOwnerSnap = await adminDb
            .collection("servicePlans")
            .where("ownerUid", "==", uid)
            .get();

        planDoc = byOwnerSnap.docs.find(
            d => d.data().status === "active" || d.data().status === "paused"
        ) ?? null;

        // Fallback: legacy docs created before ownerUid was introduced
        if (!planDoc) {
            const byCustomerSnap = await adminDb
                .collection("servicePlans")
                .where("customerUid", "==", uid)
                .get();
            planDoc = byCustomerSnap.docs.find(
                d => d.data().status === "active" || d.data().status === "paused"
            ) ?? null;
        }

        let plan: Record<string, unknown> | null = null;
        let upcomingVisits: Record<string, unknown>[] = [];
        let completedVisits: Record<string, unknown>[] = [];

        if (planDoc) {
            const planData = planDoc.data();

            // ── Property ──────────────────────────────────────────────────────
            let property: Record<string, unknown> = {};
            if (planData.propertyId) {
                try {
                    const propSnap = await adminDb
                        .collection("properties")
                        .doc(planData.propertyId as string)
                        .get();
                    if (propSnap.exists) property = { id: propSnap.id, ...propSnap.data() };
                } catch (propErr) {
                    console.warn("[api/dashboard/data] property fetch failed:", propErr);
                }
            }

            plan = { ...planData, id: planDoc.id, property };

            // ── Visits: single WHERE on ownerUid (no compound index needed) ───
            let visitDocs: Record<string, unknown>[] = [];

            const visitsByOwner = await adminDb
                .collection("visits")
                .where("ownerUid", "==", uid)
                .get();

            if (!visitsByOwner.empty) {
                // IMPORTANT: id/visitId MUST come AFTER ...d.data() spread.
                // If the document has a stored 'id' field (from booking/migration),
                // putting it first lets the spread overwrite it with a wrong value.
                visitDocs = visitsByOwner.docs.map(d => ({
                    ...d.data(),
                    id: d.id,  // true Firestore doc ID — never overridden
                    visitId: d.id,  // explicit alias used by SkipModal submit
                }) as Record<string, unknown>);
            } else {
                // Fallback: query by servicePlanId for legacy docs
                const visitsByPlan = await adminDb
                    .collection("visits")
                    .where("servicePlanId", "==", planDoc.id)
                    .get();
                visitDocs = visitsByPlan.docs.map(d => ({
                    ...d.data(),
                    id: d.id,
                    visitId: d.id,
                }) as Record<string, unknown>);
            }

            // Map safe date strings
            const mappedVisits = visitDocs.map(v => {
                const isStr = typeof v.scheduledDate === "string";
                return {
                    ...v,
                    _safeDateStr: isStr ? (v.scheduledDate as string) : timestampToNYDateString(v.scheduledDate),
                    scheduledDate: isStr ? (v.scheduledDate as string) : timestampToNYDateString(v.scheduledDate),
                } as Record<string, unknown> & { _safeDateStr: string };
            });

            // ── Upcoming: scheduled only, sorted asc (skipped visits must NOT appear here) ─────
            upcomingVisits = mappedVisits
                .filter(v => (v.completionStatus as string) === "scheduled")
                .sort((a, b) => a._safeDateStr.localeCompare(b._safeDateStr))
                .slice(0, 8);

            // Log server error if active plan has zero scheduled visits
            if (upcomingVisits.length === 0 && (planDoc.data().status === "active")) {
                console.error(`[api/dashboard/data] CRITICAL BUG: Active plan ${planDoc.id} has 0 upcoming scheduled visits for user ${uid}`);
            }

            // ── History: completed visits + admin-approved skips ONLY ────────────────────
            // "skipped" visits from schedule rebuilds must NOT appear.
            // Only skipped visits with skipSource="client_request_approved" are shown.
            // Legacy ghost skips (no skipSource) are also excluded.
            completedVisits = mappedVisits
                .filter(v => {
                    const cs = v.completionStatus as string;
                    if (cs === "completed") return true;
                    if (cs === "skipped") return !!(v.skipSource);  // only admin-approved skips
                    return false;
                })
                .sort((a, b) => b._safeDateStr.localeCompare(a._safeDateStr))
                .slice(0, 25);
        }

        return NextResponse.json({
            ok: true,
            profile: serialize(profile),
            plan: plan ? serialize(plan) : null,
            upcomingVisits: upcomingVisits.map(serialize),
            // Both keys kept for backwards compat while we update the UI
            completedVisits: completedVisits.map(serialize),
            historyVisits: completedVisits.map(serialize),
        });

    } catch (err) {
        // ── Structured 500 with full diagnostic info ──────────────────────────
        const message = err instanceof Error ? err.message : String(err);
        const code = (err as { code?: string }).code ?? "unknown";
        const stack = err instanceof Error ? err.stack : undefined;

        console.error("[api/dashboard/data] 500", {
            uid,
            code,
            message,
            stack,
        });

        return NextResponse.json(
            {
                ok: false,
                error: message,
                code,
                hint: code === "9" || code.includes("failed-precondition")
                    ? "Firestore composite index missing. Check Firebase Console → Firestore → Indexes."
                    : code === "7" || code.includes("permission-denied")
                        ? "Firestore permission denied. Deploy firestore.rules and run /api/admin/backfill-owner-uid."
                        : "See server logs for details.",
            },
            { status: 500 }
        );
    }
}
