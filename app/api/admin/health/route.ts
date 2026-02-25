export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

        // Fetch active plans + all visits for aggregation
        const plansSnap = await adminDb.collection("servicePlans").where("status", "==", "active").get();
        const activePlans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, any>));

        const visitsSnap = await adminDb.collection("visits").get();
        const allVisits = visitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Record<string, any>));

        // 1. Build Plan Reports
        const planReports = activePlans.map((plan) => {
            const planVisits = allVisits.filter(v => v.servicePlanId === plan.id && v.completionStatus === "scheduled");

            // Extract the timestamp dates safely to compute the earliest one
            const sortedDates = planVisits
                .map(v => typeof v.scheduledDate === "string" ? v.scheduledDate : (v.scheduledDate?.toDate?.()?.toISOString() || ""))
                .filter(Boolean)
                .sort();

            return {
                planId: plan.id,
                ownerUid: plan.ownerUid || plan.customerUid || "MISSING",
                futureScheduledCount: planVisits.length,
                nextVisitDate: sortedDates.length > 0 ? sortedDates[0].split("T")[0] : null
            };
        });

        // 2. Map Anomalies
        const plansWithZeroVisits = planReports.filter(p => p.futureScheduledCount === 0).map(p => p.planId);

        const malformedVisits = allVisits.filter(v => {
            if (!v.servicePlanId) return true;
            if (!v.scheduledDate) return true;
            if (typeof v.scheduledDate === "string") return true;
            if (typeof v.scheduledDate.toDate !== "function") return true;
            return false;
        }).map(v => v.id);

        // Return exact structured spec
        return NextResponse.json({
            activePlansCount: activePlans.length,
            plans: planReports,
            anomalies: {
                plansWithZeroVisits,
                malformedVisits
            }
        });

    } catch (err) {
        console.error("GET /api/admin/health error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
