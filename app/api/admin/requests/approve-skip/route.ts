/**
 * POST /api/admin/requests/approve-skip
 * Body: { visitId: string }
 *
 * Approves a client skip request.
 * ONLY updates visits/{visitId} — never queries by date/planId/ownerUid.
 */
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

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch (authErr) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let visitId: string;
    try {
        const body = await req.json();
        visitId = body.visitId;
        if (!visitId || typeof visitId !== "string") {
            return NextResponse.json({ error: "Missing or invalid visitId" }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    try {
        // Step 1: Load the EXACT document by its Firestore doc ID
        const visitRef = adminDb.collection("visits").doc(visitId);
        const visitSnap = await visitRef.get();

        if (!visitSnap.exists) {
            console.error(`[approve-skip] visitId=${visitId} NOT FOUND in Firestore`);
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;

        // Step 2: Validate the doc actually has a pending skip request
        const hasPendingScalar = visitData.clientRequestStatus === "pending"
            && visitData.clientRequestType === "skip";
        const hasPendingLegacy = !visitData.clientRequestStatus
            && (visitData.clientRequest as Record<string, unknown> | null)?.type === "skip";

        if (!hasPendingScalar && !hasPendingLegacy) {
            return NextResponse.json(
                { error: `Visit ${visitId} has no pending skip request (status: ${visitData.clientRequestStatus ?? "none"})` },
                { status: 400 }
            );
        }

        // Resolve scheduledDate for the log (deterministic ID encodes date but log confirms)
        const scheduledDate = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        const ownerUid = visitData.ownerUid ?? visitData.customerUid ?? "unknown";

        // Step 3: Server log to prove the correct doc is being updated
        console.log(`[approve-skip] visitId=${visitId}, scheduledDate=${scheduledDate}, ownerUid=${ownerUid}`);

        // Step 4: Update THIS SAME DOC ONLY
        await visitRef.update({
            completionStatus: "skipped",
            chargeStatus: "not_required",
            clientRequestStatus: "approved",
            clientRequestResolvedAt: FieldValue.serverTimestamp(),
            // skipSource distinguishes admin-approved skips from system rebuild artifacts.
            // Client dashboard history ONLY shows skipped visits that carry this field.
            skipSource: "client_request_approved",
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[approve-skip] SUCCESS — visitId=${visitId} (${scheduledDate}) marked skipped`);

        // Step 5: Ensure rolling visits still covers 8 future visits after removing this one
        if (visitData.servicePlanId) {
            await ensureRollingVisits(visitData.servicePlanId);
        }

        return NextResponse.json({
            success: true,
            visitId,
            scheduledDate,
            ownerUid,
            action: "approved",
        });

    } catch (err) {
        console.error("[approve-skip] error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
