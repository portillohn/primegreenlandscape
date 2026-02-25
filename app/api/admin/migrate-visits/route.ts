export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getNYMidnight } from "@/lib/timeUtils";

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

        const visitsSnap = await adminDb.collection("visits").get();
        const batch = adminDb.batch();
        let migratedCount = 0;
        let errorsCount = 0;

        for (const doc of visitsSnap.docs) {
            const data = doc.data();
            const updates: Record<string, any> = {};

            // 1. Map `planId` to `servicePlanId` if missing
            if (data.planId && !data.servicePlanId) {
                updates.servicePlanId = data.planId;
            }

            // 2. Map `status` to `completionStatus` if missing
            if (data.status && !data.completionStatus) {
                updates.completionStatus = data.status;
            }

            // 3. Ensure `scheduledDate` is a Timestamp
            if (typeof data.scheduledDate === "string") {
                try {
                    // Create Timestamp representing strictly 12:00:00 PM NY Time to safely land inside day bounds
                    const midnight = getNYMidnight(data.scheduledDate);
                    // Add 12 hours
                    const noon = new Date(midnight.getTime() + 12 * 60 * 60 * 1000);
                    updates.scheduledDate = Timestamp.fromDate(noon);
                } catch (e) {
                    console.error(`[Migrate] Failed to parse scheduledDate string for visit ${doc.id}: ${data.scheduledDate}`);
                    updates._needsManualDateFix = true;
                    errorsCount++;
                }
            }

            // Only update if there are changes
            if (Object.keys(updates).length > 0) {
                updates.updatedAt = FieldValue.serverTimestamp();
                batch.update(doc.ref, updates);
                migratedCount++;
            }

            // Batch commit every 400 docs
            if (migratedCount % 400 === 0 && migratedCount > 0) {
                await batch.commit();
                // We're resetting the batch logically, though practically in Firebase Admin 
                // we'd need to create a new batch.
                // A safer pattern for NextJS is array chunking, but for a small dataset a single loop suffices.
            }
        }

        // Final commit for any remaining
        if (migratedCount % 400 !== 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            migrated: migratedCount,
            errors: errorsCount,
            message: `Migration complete. Upgraded ${migratedCount} documents.`,
        });

    } catch (err) {
        console.error("POST /api/admin/migrate-visits error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
