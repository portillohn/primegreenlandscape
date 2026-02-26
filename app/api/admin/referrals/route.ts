export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

export async function PUT(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { referralId, action } = await req.json();

        if (!referralId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const referralRef = adminDb.collection("referrals").doc(referralId);
        const referralSnap = await referralRef.get();

        if (!referralSnap.exists) {
            return NextResponse.json({ error: "Referral not found" }, { status: 404 });
        }

        const refData = referralSnap.data()!;

        if (refData.rewardStatus !== "pending") {
            return NextResponse.json({ error: "Referral already processed" }, { status: 400 });
        }

        const batch = adminDb.batch();

        if (action === "approve") {
            // Find referrer and referee plans
            const [referrerPlans, refereePlans] = await Promise.all([
                adminDb.collection("servicePlans").where("referralCode", "==", refData.referralCode).limit(1).get(),
                adminDb.collection("properties").where("customerUid", "==", refData.referredUid).limit(1).get()
            ]);

            if (!referrerPlans.empty) {
                batch.update(referrerPlans.docs[0].ref, { creditsBalance: FieldValue.increment(25) });
            }

            if (!refereePlans.empty) {
                const refereePropId = refereePlans.docs[0].id;
                const refereePlanQuery = await adminDb.collection("servicePlans").where("propertyId", "==", refereePropId).limit(1).get();
                if (!refereePlanQuery.empty) {
                    batch.update(refereePlanQuery.docs[0].ref, { creditsBalance: FieldValue.increment(25) });
                }
            }

            batch.update(referralRef, { rewardStatus: "earned" });

        } else if (action === "deny") {
            batch.update(referralRef, { rewardStatus: "denied" });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        await batch.commit();

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[/api/admin/referrals]", err);
        return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
    }
}
