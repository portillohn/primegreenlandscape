export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getNYDayBounds, timestampToNYDateString } from "@/lib/timeUtils";

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

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "all";
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");
    const routeFilter = searchParams.get("route");
    const statusFilter = searchParams.get("status");

    try {
        // Build plan lookup map (planId → plan+property+user data)
        const [plansSnap, propsSnap, usersSnap] = await Promise.all([
            adminDb.collection("servicePlans").get(),
            adminDb.collection("properties").get(),
            adminDb.collection("users").get(),
        ]);

        const propMap = new Map(propsSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
        const userMap = new Map(usersSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

        const planMap = new Map<string, Record<string, unknown>>();
        plansSnap.docs.forEach(planDoc => {
            const pl = planDoc.data();
            const prop = propMap.get(pl.propertyId) as Record<string, unknown> | undefined;
            const user = prop ? userMap.get(prop.customerUid as string) as Record<string, unknown> | undefined : undefined;
            planMap.set(planDoc.id, {
                id: planDoc.id,
                planTier: pl.planTier ?? "unknown",
                frequency: pl.frequency ?? "weekly",
                pricePerVisit: pl.pricePerVisit ?? 0,
                preferredServiceDay: pl.preferredServiceDay ?? "",
                status: pl.status ?? "active",
                propertyId: pl.propertyId,
                // Property info
                address: (prop as Record<string, unknown>)?.address ?? "Unknown",
                routeGroupId: (prop as Record<string, unknown>)?.routeGroupId ?? null,
                // User info
                clientUid: (user as Record<string, unknown>)?.id ?? null,
                clientName: (user as Record<string, unknown>)?.fullName ?? (user as Record<string, unknown>)?.displayName ?? (user as Record<string, unknown>)?.name ?? "Unknown",
                clientEmail: (user as Record<string, unknown>)?.email ?? null,
                cardLast4: (user as Record<string, unknown>)?.cardLast4 ?? null,
            });
        });

        // Query visits based on view
        let visitsQuery = adminDb.collection("visits") as FirebaseFirestore.Query;

        if (view === "today") {
            const { startTs, endTs } = getNYDayBounds();
            visitsQuery = visitsQuery
                .where("scheduledDate", ">=", startTs)
                .where("scheduledDate", "<", endTs)
                .where("completionStatus", "==", "scheduled");
        } else if (view === "failed") {
            visitsQuery = visitsQuery.where("chargeStatus", "==", "failed");
        } else {
            // "all" — apply optional filters (Timestamps)
            if (fromDate) visitsQuery = visitsQuery.where("scheduledDate", ">=", getNYDayBounds(fromDate).startTs);
            if (toDate) visitsQuery = visitsQuery.where("scheduledDate", "<", getNYDayBounds(toDate).endTs);
            if (statusFilter) visitsQuery = visitsQuery.where("completionStatus", "==", statusFilter);
        }

        const visitsSnap = await visitsQuery.get();

        let visits: Record<string, unknown>[] = visitsSnap.docs.map(vDoc => {
            const v = vDoc.data();
            const planInfo = planMap.get(v.servicePlanId) ?? {};

            // Format Timestamp robustly
            const dateStr = typeof v.scheduledDate === "string"
                ? v.scheduledDate
                : timestampToNYDateString(v.scheduledDate);

            return {
                id: vDoc.id,
                servicePlanId: v.servicePlanId,
                scheduledDate: dateStr,
                completionStatus: v.completionStatus,
                clientRequest: v.clientRequest ?? null,
                chargeStatus: v.chargeStatus ?? "pending",
                charged: v.charged ?? false,
                amount: v.amount ?? (planInfo.pricePerVisit as number) ?? 0,
                stripePaymentIntentId: v.stripePaymentIntentId ?? null,
                stripeReceiptUrl: v.stripeReceiptUrl ?? null,
                chargeError: v.chargeError ?? null,
                weatherDelayed: v.weatherDelayed ?? false,
                completionTimestamp: v.completionTimestamp?.toDate?.()?.toISOString() ?? null,
                // Joined plan/property/user data
                ...planInfo,
            };
        });

        // Apply route filter in memory (since routeGroupId is on property, not visit)
        if (routeFilter) {
            visits = visits.filter(v => (v.routeGroupId as string | null) === routeFilter);
        }

        // Sort descending generally, or ascending for today
        if (view === "today") {
            visits.sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)));
        } else {
            visits.sort((a, b) => String(b.scheduledDate).localeCompare(String(a.scheduledDate)));
        }


        return NextResponse.json({ visits, total: visits.length });

    } catch (err: unknown) {
        console.error("[/api/admin/visits]", err);
        return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
    }
}
