/**
 * GET /api/admin/repair-visit-ids
 *
 * Diagnostic + repair route.
 * Finds visit documents where a stored `id` field inside the document data
 * does NOT match the actual Firestore document ID (doc.id).
 * This mismatch causes the skip modal to submit the wrong visitId.
 *
 * What it does:
 * 1. Scans all visits.
 * 2. Logs any where data.id !== doc.id.
 * 3. DELETES the corrupt `id` field from the document data (so it never interferes).
 *
 * Pass ?dry=true to only report without making changes.
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

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dry = new URL(req.url).searchParams.get("dry") === "true";

    try {
        const snap = await adminDb.collection("visits").get();

        const mismatches: object[] = [];
        const batch = adminDb.batch();
        let repaired = 0;

        for (const doc of snap.docs) {
            const data = doc.data();

            // scheduledDate for human-readable log
            let dateStr = "unknown";
            try {
                dateStr = typeof data.scheduledDate === "string"
                    ? data.scheduledDate
                    : timestampToNYDateString(data.scheduledDate);
            } catch { /* ignore */ }

            const storedId = data.id as string | undefined;

            if (storedId && storedId !== doc.id) {
                const entry = {
                    docId: doc.id,
                    storedId,
                    scheduledDate: dateStr,
                    completionStatus: data.completionStatus,
                    servicePlanId: data.servicePlanId,
                };
                mismatches.push(entry);
                console.log("[repair-visit-ids] MISMATCH:", entry);

                if (!dry) {
                    // Remove the corrupt `id` field so it can never override the real doc.id
                    batch.update(doc.ref, { id: FieldValue.delete() });
                    repaired++;
                }
            }
        }

        if (!dry && repaired > 0) {
            await batch.commit();
            console.log(`[repair-visit-ids] Repaired ${repaired} visit docs`);
        }

        return NextResponse.json({
            scanned: snap.size,
            mismatches: mismatches.length,
            repaired: dry ? 0 : repaired,
            dry,
            details: mismatches,
        });

    } catch (err) {
        console.error("[repair-visit-ids] error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
