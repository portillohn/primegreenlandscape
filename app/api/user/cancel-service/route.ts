export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function verifyUser(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    return await adminAuth.verifyIdToken(token);
}

export async function POST(req: NextRequest) {
    let decoded;
    try {
        decoded = await verifyUser(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { planId } = await req.json();

        if (!planId) return NextResponse.json({ error: "Missing planId" }, { status: 400 });

        // Verify ownership
        const planSnap = await adminDb.collection("servicePlans").doc(planId).get();
        if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const planData = planSnap.data()!;
        // Ownership: ownerUid canonical, customerUid fallback for legacy docs
        const ownerUid = planData.ownerUid ?? planData.customerUid;
        if (ownerUid !== decoded.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Cancel the plan — mark as cancelled, cancel all future scheduled visits
        await adminDb.collection("servicePlans").doc(planId).update({
            status: "cancelled",
            cancelledAt: FieldValue.serverTimestamp(),
        });

        // Mark all future scheduled visits as skipped
        const futureVisitsSnap = await adminDb.collection("visits")
            .where("servicePlanId", "==", planId)
            .where("completionStatus", "==", "scheduled")
            .get();

        if (!futureVisitsSnap.empty) {
            const batch = adminDb.batch();
            futureVisitsSnap.docs.forEach(vDoc => {
                batch.update(vDoc.ref, {
                    completionStatus: "skipped",
                    chargeStatus: "not_charged",
                    cancelledByUser: true,
                });
            });
            await batch.commit();
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[/api/user/cancel-service]", err);
        return NextResponse.json({ error: "Failed to cancel service" }, { status: 500 });
    }
}
