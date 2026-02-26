export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { timestampToNYDateString } from "@/lib/timeUtils";

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = await adminAuth.verifyIdToken(token);
        // Only admin UID can fetch
        if (decoded.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 1. Fetch active service plans
        const plansSnap = await adminDb
            .collection("servicePlans")
            .where("status", "==", "active")
            .get();

        const clientsData = [];
        const todayStr = timestampToNYDateString(new Date());

        // 2. Fetch related nodes (users, properties) by ownerUid
        for (const planDoc of plansSnap.docs) {
            const plan = planDoc.data();
            const planId = planDoc.id;
            const ownerUid = plan.ownerUid || plan.customerUid;
            const propertyId = plan.propertyId;

            // Failsafe for missing ownerUid
            if (!ownerUid) {
                console.warn(`[admin/clients] Plan ${planId} missing ownerUid`);
                continue;
            }

            try {
                // Fetch User
                const userSnap = await adminDb.collection("users").doc(ownerUid).get();
                const userData = userSnap.exists ? userSnap.data() : null;

                if (!userData) {
                    console.warn(`[admin/clients] Missing user doc for UID: ${ownerUid}`);
                }

                // Fetch Property
                let propertyData = null;
                if (propertyId) {
                    const propSnap = await adminDb.collection("properties").doc(propertyId).get();
                    if (propSnap.exists) propertyData = propSnap.data();
                }

                // Determine next visit
                let nextVisitDate: string | null = null;
                const visitsSnap = await adminDb.collection("visits")
                    .where("servicePlanId", "==", planId)
                    .where("completionStatus", "==", "scheduled")
                    .get();

                if (!visitsSnap.empty) {
                    const futureVisits = visitsSnap.docs
                        .map(d => {
                            const val = d.data().scheduledDate;
                            return typeof val === "string" ? val : timestampToNYDateString(val);
                        })
                        .sort();

                    if (futureVisits.length > 0) {
                        nextVisitDate = futureVisits[0];
                    }
                } else {
                    console.warn(`[admin/clients] No scheduled visit found for plan ${planId} (ownerUid: ${ownerUid})`);
                }

                clientsData.push({
                    planId,
                    ownerUid,
                    name: userData?.fullName || userData?.displayName || "Unknown User",
                    email: userData?.email || "Unknown Email",
                    phone: userData?.phone || "No phone",
                    address: propertyData?.address || "No address on file",
                    tier: plan.tier || plan.planTier || "Unknown Tier",
                    frequency: plan.frequency || "weekly",
                    pricePerVisit: plan.pricePerVisit || 0,
                    status: plan.status,
                    nextVisitDate: nextVisitDate || "Not Scheduled",
                    missingUserDoc: !userData, // For frontend badging/logging
                });
            } catch (err) {
                console.error(`[admin/clients] Error processing plan ${planId}:`, err);
            }
        }

        return NextResponse.json({ clients: clientsData });
    } catch (err) {
        console.error("[/api/admin/clients] Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
