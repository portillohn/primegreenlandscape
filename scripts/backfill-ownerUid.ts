/**
 * scripts/backfill-ownerUid.ts
 *
 * One-time admin script to backfill ownerUid on legacy documents that were
 * created before ownerUid was introduced (they only have customerUid).
 *
 * Run with:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx ts-node scripts/backfill-ownerUid.ts
 *
 * This script is SAFE to run multiple times (idempotent — skips docs that already have ownerUid).
 * It does NOT modify any other fields.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS as string) });
}
const db = getFirestore();

async function backfill(collectionName: string, uidField: string) {
    console.log(`\n[${collectionName}] Scanning for docs missing ownerUid...`);
    const snap = await db.collection(collectionName).get();
    let updated = 0;
    let skipped = 0;

    const batch = db.batch();
    let batchSize = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (data.ownerUid) { skipped++; continue; }

        const uid = data[uidField];
        if (!uid) {
            console.warn(`  [WARN] ${collectionName}/${docSnap.id} has no ${uidField} — skipping`);
            continue;
        }

        batch.update(docSnap.ref, {
            ownerUid: uid,
            updatedAt: FieldValue.serverTimestamp(),
        });
        updated++;
        batchSize++;

        // Firestore batch limit is 500 writes
        if (batchSize === 480) {
            await batch.commit();
            console.log(`  Committed batch of ${batchSize}`);
            batchSize = 0;
        }
    }

    if (batchSize > 0) await batch.commit();
    console.log(`  Done. Updated: ${updated}, Already had ownerUid: ${skipped}`);
}

(async () => {
    await backfill("properties", "customerUid");
    await backfill("servicePlans", "customerUid");
    await backfill("visits", "customerUid");
    console.log("\n✅ Backfill complete.");
})();
