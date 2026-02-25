export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Simple mapping for common zipcodes around Gaithersburg area as a fallback,
// ideally we'd use a real Geocoding API if this scales.
// Open-Meteo requires latitude and longitude.
const ZIP_TO_COORDS: Record<string, { lat: number, lon: number }> = {
    "20877": { lat: 39.1439, lon: -77.1947 }, // Gaithersburg
    "20878": { lat: 39.1235, lon: -77.2383 }, // Gaithersburg
    "20879": { lat: 39.1678, lon: -77.1843 }, // Gaithersburg
    "20886": { lat: 39.1643, lon: -77.2023 }, // Montgomery Village
    "20850": { lat: 39.0839, lon: -77.1528 }, // Rockville
    "20852": { lat: 39.0438, lon: -77.1130 }, // Rockville
    "20901": { lat: 39.0234, lon: -77.0143 }, // Silver Spring
    "20902": { lat: 39.0345, lon: -77.0428 }, // Silver Spring
    "20904": { lat: 39.0594, lon: -76.9911 }, // Silver Spring
    "20906": { lat: 39.0763, lon: -77.0655 }, // Silver Spring
};

// Default (Gaithersburg)
const DEFAULT_COORDS = { lat: 39.1439, lon: -77.1947 };

async function fetchPrecipitationProbability(lat: number, lon: number): Promise<number> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_probability_max&timezone=America/New_York&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) return 0;
        const data = await res.json();
        const prob = data.daily?.precipitation_probability_max?.[0] ?? 0;
        return prob;
    } catch {
        return 0; // Fail open
    }
}

export async function GET(req: NextRequest) {
    // 1. Authenticate Request via Vercel Cron Secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD

        // 2. Fetch all pending visits for TODAY
        const visitsQuery = await adminDb.collection("visits")
            .where("scheduledDate", "==", todayStr)
            .where("completionStatus", "==", "pending")
            .get();

        if (visitsQuery.empty) {
            return NextResponse.json({ success: true, processed: 0, message: "No visits scheduled today." });
        }

        const batch = adminDb.batch();
        let delayedCount = 0;

        for (const doc of visitsQuery.docs) {
            const vData = doc.data();

            // Ignore if already weather delayed manually somehow
            if (vData.weatherDelayed) continue;

            const planSnap = await adminDb.collection("servicePlans").doc(vData.servicePlanId).get();
            if (!planSnap.exists) continue;
            const planData = planSnap.data()!;

            const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
            if (!propSnap.exists) continue;
            const propData = propSnap.data()!;

            const zipCode = propData.zipcode;
            const coords = ZIP_TO_COORDS[zipCode] || DEFAULT_COORDS;

            const precipProb = await fetchPrecipitationProbability(coords.lat, coords.lon);

            // 3. Logic Trigger
            if (precipProb > 60) {
                // Find next viable date based on RouteGroup or preferred day
                let routeDayNum: number | null = null;
                if (propData.routeGroupId) {
                    const routeGroupSnap = await adminDb.collection("routeGroups").doc(propData.routeGroupId).get();
                    if (routeGroupSnap.exists) {
                        routeDayNum = routeGroupSnap.data()?.serviceWeekday;
                    }
                }

                const daysMap: Record<string, number> = {
                    "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
                };

                // Fallback to plan preferred day if no RouteGroup active
                const targetDayNum = routeDayNum !== null ? routeDayNum : (daysMap[planData.preferredServiceDay] ?? 1);
                const nextDate = new Date();
                nextDate.setHours(12, 0, 0, 0); // avoid TZ offsets

                // Push +7 or +14 based on freq
                let skipWeeks = planData.frequency === "biweekly" ? 2 : 1;

                while (skipWeeks > 0) {
                    nextDate.setDate(nextDate.getDate() + 7);
                    skipWeeks--;
                }

                // Align to correct weekday
                const currentDay = nextDate.getDay();
                if (currentDay !== targetDayNum) {
                    const diff = (targetDayNum - currentDay + 7) % 7;
                    nextDate.setDate(nextDate.getDate() + diff);
                }

                const nextDateStr = nextDate.toISOString().split("T")[0];

                // Check against seasonal pause if applicable
                // In a robust implementation, verify nextDate is not inside [seasonalPauseStart, seasonalPauseEnd]

                // Reschedule the current visit
                batch.update(doc.ref, {
                    scheduledDate: nextDateStr,
                    weatherDelayed: true,
                    delayReason: "weather",
                    originalDate: todayStr,
                    updatedAt: new Date().toISOString()
                });

                delayedCount++;
            }
        }

        await batch.commit();

        return NextResponse.json({ success: true, processed: visitsQuery.size, delayed: delayedCount });

    } catch (err: any) {
        console.error("Cron Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
