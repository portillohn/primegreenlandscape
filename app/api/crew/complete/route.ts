import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendRetentionEmail } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { timestampToNYDateString } from "@/lib/timeUtils";


export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const visitId = formData.get("visitId") as string;
        const notes = formData.get("notes") as string;
        const photo = formData.get("photo") as File;

        if (!visitId || !photo) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const visitRef = adminDb.collection("visits").doc(visitId);
        const visitSnap = await visitRef.get();
        if (!visitSnap.exists) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;
        const safeDateStr = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        if (visitData.completionStatus === "completed") {
            return NextResponse.json({ error: "Visit already marked complete." }, { status: 400 });
        }
        if (visitData.weatherDelayed) {
            return NextResponse.json({ error: "Cannot complete a weather-delayed visit." }, { status: 400 });
        }

        // Relational Lookups
        const planSnap = await adminDb.collection("servicePlans").doc(visitData.servicePlanId).get();
        if (!planSnap.exists) return NextResponse.json({ error: "Service Plan not found" }, { status: 404 });
        const planData = planSnap.data()!;

        const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
        if (!propSnap.exists) return NextResponse.json({ error: "Property not found" }, { status: 404 });
        const propData = propSnap.data()!;

        const userRef = adminDb.collection("users").doc(propData.customerUid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
        const userData = userSnap.data()!;

        if (!userData.stripeCustomerId || !userData.paymentMethodId) {
            return NextResponse.json({ error: "User lacks a saved payment method." }, { status: 400 });
        }

        // 1. Upload Photo to Firebase Storage
        let photoURL = null;
        try {
            const buffer = Buffer.from(await photo.arrayBuffer());
            const filename = `visits/photos/${visitId}_${Date.now()}.jpg`;
            const fileRef = adminStorage.bucket().file(filename);

            await fileRef.save(buffer, {
                metadata: { contentType: photo.type }
            });

            try {
                // Attempt to make public, this can fail if IAM lacks Storage Admin
                await fileRef.makePublic();
            } catch (e) {
                console.warn("Could not make file public; relying on signed URLs or bucket policy.");
            }

            photoURL = `https://storage.googleapis.com/${adminStorage.bucket().name}/${filename}`;
        } catch (storageErr: any) {
            console.error("Storage upload error:", storageErr);
            return NextResponse.json({ error: "Failed to upload photo: " + storageErr.message }, { status: 500 });
        }

        // 2. Process Stripe Charge
        let amountCents = Math.round((planData.pricePerVisit ?? 0) * 100);

        // Calculate potential Referral Credits
        const availableCredits = planData.creditsBalance || 0;
        let consumedCredits = 0;

        // Fetch attached Add-Ons
        const addOnReqsSnap = await adminDb.collection("addOnRequests")
            .where("assignedVisitId", "==", visitId)
            .where("status", "==", "scheduled")
            .get();

        const activeAddOnReqs = addOnReqsSnap.docs;
        let addOnsDescription = "";

        if (activeAddOnReqs.length > 0) {
            const addOnsSnap = await adminDb.collection("addOns").get();
            const addOnsMap = new Map(addOnsSnap.docs.map(d => [d.id, d.data()]));

            for (const reqDoc of activeAddOnReqs) {
                const reqData = reqDoc.data();
                const addOn = addOnsMap.get(reqData.addOnId);
                if (addOn && addOn.price) {
                    amountCents += Math.round(addOn.price * 100);
                    addOnsDescription += ` + ${addOn.name}`;
                }
            }
        }

        // Apply Credits
        if (availableCredits > 0) {
            const creditsCents = Math.round(availableCredits * 100);
            if (amountCents - creditsCents < 50) {
                // Prevent dipping below Stripe $0.50 minimum
                consumedCredits = (amountCents - 50) / 100;
                amountCents = 50;
            } else {
                consumedCredits = availableCredits;
                amountCents -= creditsCents;
            }
            if (consumedCredits > 0) {
                addOnsDescription += ` (Applied $${consumedCredits.toFixed(2)} Referral Credit)`;
            }
        }

        let paymentIntentId = null;
        let chargeStatus = "pending";

        try {
            const pi = await stripe.paymentIntents.create({
                amount: amountCents,
                currency: "usd",
                customer: userData.stripeCustomerId,
                payment_method: userData.paymentMethodId,
                confirm: true,
                off_session: true,
                description: `Prime Green — ${planData.planTier ?? planData.planName} Plan${addOnsDescription} · ${safeDateStr}`,
                receipt_email: userData.email,
                metadata: { clientUid: propData.customerUid, visitId, planId: visitData.servicePlanId },
            });

            paymentIntentId = pi.id;
            chargeStatus = pi.status;

            // Update legacy user totals
            await userRef.update({
                lastVisit: safeDateStr,
                totalVisits: FieldValue.increment(1)
            });

            // 3. Customer Retention Engine Executed on Success
            if (userData.email) {
                await sendRetentionEmail(userData.email, "visit_completed", { visitDate: safeDateStr });

                const completedVisits = (userData.totalVisits || 0) + 1;
                const emailsSent: string[] = planData.retentionEmailsSent || [];

                if (completedVisits === 3 && !emailsSent.includes("review_request")) {
                    await sendRetentionEmail(userData.email, "review_request");
                    await adminDb.collection("servicePlans").doc(visitData.servicePlanId).update({
                        retentionEmailsSent: FieldValue.arrayUnion("review_request")
                    });
                }

                if (completedVisits === 5 && (planData.planTier === "Essential" || planData.planName === "Essential") && !emailsSent.includes("upgrade_offer")) {
                    await sendRetentionEmail(userData.email, "upgrade_offer");
                    await adminDb.collection("servicePlans").doc(visitData.servicePlanId).update({
                        retentionEmailsSent: FieldValue.arrayUnion("upgrade_offer")
                    });
                }
            }

        } catch (stripeErr: any) {
            console.error("Crew Charge failed:", stripeErr);
            chargeStatus = "failed";

            if (userData.email) {
                await sendRetentionEmail(userData.email, "payment_failed", { amount: amountCents / 100 });
            }
        }

        // 4. Update Visit Document
        await visitRef.update({
            completionStatus: "completed",
            charged: chargeStatus === "succeeded",
            stripePaymentIntentId: paymentIntentId,
            chargeStatus: chargeStatus,
            chargeError: chargeStatus === "failed" ? "Crew Stripe Off-Session failure" : FieldValue.delete(),
            completionTimestamp: new Date().toISOString(),
            completionPhotoURL: photoURL,
            crewNotes: notes || null,
        });

        // 4.5. Atomic Add-On Finalization
        if (chargeStatus === "succeeded" && (activeAddOnReqs.length > 0 || consumedCredits > 0)) {
            const batch = adminDb.batch();

            if (activeAddOnReqs.length > 0) {
                activeAddOnReqs.forEach(reqDoc => {
                    batch.update(reqDoc.ref, { status: "completed" });
                });
            }

            if (consumedCredits > 0) {
                batch.update(adminDb.collection("servicePlans").doc(visitData.servicePlanId), {
                    creditsBalance: FieldValue.increment(-consumedCredits)
                });
            }

            await batch.commit();
        }

        // 5. Final State Return
        if (chargeStatus === "failed") {
            return NextResponse.json({ error: "Visit completed but charge failed. Check Stripe logs." }, { status: 500 });
        }

        return NextResponse.json({ success: true, status: "completed", photoURL });

    } catch (err: any) {
        console.error("[/api/crew/complete]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
