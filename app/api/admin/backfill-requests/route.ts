export const dynamic = "force-dynamic";
/**
 * GET /api/admin/backfill-requests
 *
 * One-time migration: finds visits that have a clientRequest object but are
 * missing the new scalar fields (clientRequestStatus, clientRequestType).
 * Writes the missing fields so the admin query can find them.
 *
 * Only accessible by the admin UID.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

        // Find visits that have clientRequest but no clientRequestStatus
        const snap = await adminDb.collection("visits")
            .where("clientRequest", "!=", null)
            .get();

        let migrated = 0;
        let skipped = 0;
        const details: object[] = [];

        const batch = adminDb.batch();
        let batchCount = 0;

        for (const doc of snap.docs) {
            const data = doc.data();
            const reqData = data.clientRequest as Record<string, unknown> | null;

            // Skip if already has the new scalar fields
            if (data.clientRequestStatus) {
                skipped++;
                continue;
            }

            // Determine the type from the legacy clientRequest object
            const reqType = (reqData?.type as string) ?? "skip";

            // Only backfill truly pending ones (not already resolved visits)
            // A resolved visit would have completionStatus === "skipped" or clientRequestDenied set
            const alreadyResolved = data.completionStatus === "skipped"
                || data.clientRequestResolved === true
                || data.clientRequestDenied === true;

            const newStatus = alreadyResolved ? "approved" : "pending";

            batch.update(doc.ref, {
                clientRequestStatus: newStatus,
                clientRequestType: reqType,
                updatedAt: FieldValue.serverTimestamp(),
            });
            batchCount++;
            migrated++;

            details.push({
                visitId: doc.id,
                clientRequestStatus: newStatus,
                clientRequestType: reqType,
                completionStatus: data.completionStatus,
            });

            // Firestore batch limit is 500
            if (batchCount >= 490) break;
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        console.log("[backfill-requests] migrated:", migrated, "skipped:", skipped);
        return NextResponse.json({ success: true, migrated, skipped, details });

    } catch (err) {
        console.error("[backfill-requests] error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
