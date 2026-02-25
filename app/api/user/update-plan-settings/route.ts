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
        const { planId, preferredServiceDay, seasonalPauseStart, seasonalPauseEnd } = await req.json();

        if (!planId) return NextResponse.json({ error: "Missing planId" }, { status: 400 });

        // Verify the calling user owns this plan (via property)
        const planSnap = await adminDb.collection("servicePlans").doc(planId).get();
        if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const planData = planSnap.data()!;
        const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
        if (!propSnap.exists || propSnap.data()?.customerUid !== decoded.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
        if (preferredServiceDay) updates.preferredServiceDay = preferredServiceDay;
        if (seasonalPauseStart !== undefined) updates.seasonalPauseStart = seasonalPauseStart;
        if (seasonalPauseEnd !== undefined) updates.seasonalPauseEnd = seasonalPauseEnd;

        // Update paused status
        if (seasonalPauseStart) {
            const today = new Date().toISOString().split("T")[0];
            if (today >= seasonalPauseStart && (!seasonalPauseEnd || today <= seasonalPauseEnd)) {
                updates.status = "paused";
            }
        } else {
            // Clearing pause — restore to active if was paused
            if (planData.status === "paused") updates.status = "active";
        }

        await adminDb.collection("servicePlans").doc(planId).update(updates);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[/api/user/update-plan-settings]", err);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
