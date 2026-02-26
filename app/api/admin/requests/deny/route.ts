/**
 * POST /api/admin/requests/deny
 * Body: { visitId: string }
 *
 * Denies a client skip request.
 * ONLY updates visits/{visitId} — never queries by date/planId/ownerUid.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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
    } catch {
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
            console.error(`[deny-skip] visitId=${visitId} NOT FOUND in Firestore`);
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;

        // Validate there's actually a pending request to deny
        const hasPendingScalar = visitData.clientRequestStatus === "pending";
        const hasPendingLegacy = !visitData.clientRequestStatus
            && (visitData.clientRequest as Record<string, unknown> | null)?.type;

        if (!hasPendingScalar && !hasPendingLegacy) {
            return NextResponse.json(
                { error: `Visit ${visitId} has no pending request (status: ${visitData.clientRequestStatus ?? "none"})` },
                { status: 400 }
            );
        }

        const scheduledDate = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        const ownerUid = visitData.ownerUid ?? visitData.customerUid ?? "unknown";

        console.log(`[deny-skip] visitId=${visitId}, scheduledDate=${scheduledDate}, ownerUid=${ownerUid}`);

        // Step 2: Update THIS SAME DOC ONLY — keep visit scheduled, just clear the request
        await visitRef.update({
            clientRequestStatus: "denied",
            clientRequestResolvedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[deny-skip] SUCCESS — visitId=${visitId} (${scheduledDate}) request denied, visit stays scheduled`);

        return NextResponse.json({
            success: true,
            visitId,
            scheduledDate,
            ownerUid,
            action: "denied",
        });

    } catch (err) {
        console.error("[deny-skip] error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
