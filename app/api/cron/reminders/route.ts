import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { sendRetentionEmail } from "@/lib/email";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
    // 1. Authenticate Request via Vercel Cron Secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

        // 2. Fetch all pending visits for TOMORROW
        const visitsQuery = await adminDb.collection("visits")
            .where("scheduledDate", "==", tomorrowStr)
            .where("completionStatus", "==", "pending")
            .get();

        if (visitsQuery.empty) {
            return NextResponse.json({ success: true, processed: 0, sent: 0, message: "No visits scheduled for tomorrow." });
        }

        const batch = adminDb.batch();
        let sentCount = 0;

        for (const doc of visitsQuery.docs) {
            const vData = doc.data();

            const planRef = adminDb.collection("servicePlans").doc(vData.servicePlanId);
            const planSnap = await planRef.get();
            if (!planSnap.exists) continue;

            const planData = planSnap.data()!;
            const emailsSent: string[] = planData.retentionEmailsSent || [];
            const reminderId = `reminder_${doc.id}`;

            // Prevent duplicate sends
            if (emailsSent.includes(reminderId)) {
                continue;
            }

            const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
            if (!propSnap.exists) continue;
            const propData = propSnap.data()!;

            const userSnap = await adminDb.collection("users").doc(propData.customerUid).get();
            if (!userSnap.exists) continue;
            const userData = userSnap.data()!;

            if (userData.email) {
                // 3. Dispatch Email
                await sendRetentionEmail(userData.email, "reminder", {
                    scheduledDate: tomorrowStr,
                    planName: planData.planTier ?? planData.planName
                });

                // 4. Update the array to strictly enforce idempotency
                batch.update(planRef, {
                    retentionEmailsSent: FieldValue.arrayUnion(reminderId)
                });

                sentCount++;
            }
        }

        if (sentCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, processed: visitsQuery.size, sent: sentCount });

    } catch (err: any) {
        console.error("Cron Reminder Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
