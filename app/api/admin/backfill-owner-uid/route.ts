/**
 * POST /api/admin/backfill-owner-uid
 *
 * Admin-only route to backfill ownerUid on legacy documents.
 * Looks for docs in properties/servicePlans/visits that have customerUid but no ownerUid,
 * and copies customerUid → ownerUid.
 *
 * This is the FIX for "Missing or insufficient permissions" on legacy data.
 *
 * Call from browser (admin only):
 *   fetch("/api/admin/backfill-owner-uid", {
 *     method: "POST",
 *     headers: { Authorization: "Bearer <admin-id-token>" }
 *   })
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ADMIN_UID = process.env.ADMIN_UID;

async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

async function backfillCollection(
    collectionName: string,
    uidField: string
): Promise<{ updated: number; skipped: number; cannotInfer: string[] }> {
    const snap = await adminDb.collection(collectionName).get();
    let updated = 0;
    let skipped = 0;
    const cannotInfer: string[] = [];
    const batch = adminDb.batch();
    let batchCount = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();

        // Already has ownerUid — skip
        if (data.ownerUid) { skipped++; continue; }

        const uid = data[uidField];
        if (!uid) {
            cannotInfer.push(`${collectionName}/${docSnap.id}`);
            continue;
        }

        batch.update(docSnap.ref, {
            ownerUid: uid,
            updatedAt: FieldValue.serverTimestamp(),
        });
        updated++;
        batchCount++;

        // Commit in chunks of 400 to stay under Firestore limit
        if (batchCount === 400) {
            await batch.commit();
            batchCount = 0;
        }
    }

    if (batchCount > 0) await batch.commit();
    return { updated, skipped, cannotInfer };
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [props, plans, visits] = await Promise.all([
            backfillCollection("properties", "customerUid"),
            backfillCollection("servicePlans", "customerUid"),
            backfillCollection("visits", "customerUid"),
        ]);

        const summary = {
            properties: props,
            servicePlans: plans,
            visits,
            totalUpdated: props.updated + plans.updated + visits.updated,
        };

        console.log("[backfill-owner-uid] Complete:", summary);
        return NextResponse.json({ success: true, summary });

    } catch (err) {
        console.error("[/api/admin/backfill-owner-uid]", err);
        return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
    }
}
