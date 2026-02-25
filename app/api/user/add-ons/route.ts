import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(token);

        const addOnsQuery = await adminDb.collection("addOns").where("active", "==", true).get();
        const addOns = addOnsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let referralCode = null;
        let creditsBalance = 0;

        const propsQuery = await adminDb.collection("properties").where("customerUid", "==", decoded.uid).limit(1).get();
        if (!propsQuery.empty) {
            const propId = propsQuery.docs[0].id;
            const planQuery = await adminDb.collection("servicePlans").where("propertyId", "==", propId).limit(1).get();
            if (!planQuery.empty) {
                const planData = planQuery.docs[0].data();
                referralCode = planData.referralCode || null;
                creditsBalance = planData.creditsBalance || 0;
            }
        }

        return NextResponse.json({ success: true, addOns, referralCode, creditsBalance });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
