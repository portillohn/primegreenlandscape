/**
 * ensureRollingVisits — Rolling 8-Visit Generator
 *
 * Uses DETERMINISTIC visit IDs: `${servicePlanId}_${YYYYMMDD}`
 * This prevents duplicate visits across concurrent calls.
 *
 * Call after: booking confirmed, visit completed, visit skipped, plan resumed.
 */
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createNoonTimestamp, timestampToNYDateString } from "./timeUtils";

const DAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function toDateKey(d: Date): string {
    return toDateStr(d).replace(/-/g, "");  // YYYYMMDD
}

function addDays(d: Date, n: number): Date {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
}

function isInPauseRange(
    dateStr: string,
    pauseStart?: string | null,
    pauseEnd?: string | null
): boolean {
    if (!pauseStart || !pauseEnd) return false;
    return dateStr >= pauseStart && dateStr <= pauseEnd;
}

export async function ensureRollingVisits(
    servicePlanId: string,
    horizonWeeks = 8
): Promise<void> {
    // 1. Fetch plan + related property/user for denormalized fields
    const planSnap = await adminDb.collection("servicePlans").doc(servicePlanId).get();
    if (!planSnap.exists) {
        console.warn(`[ensureRollingVisits] Plan ${servicePlanId} not found`);
        return;
    }
    const plan = planSnap.data()!;
    if (plan.status === "cancelled") return;

    // Get property + user for denormalization
    const propSnap = await adminDb.collection("properties").doc(plan.propertyId).get();
    const propData = propSnap.data() ?? {};
    const customerUid: string = propData.customerUid ?? plan.customerUid ?? "";
    // ownerUid: the canonical field required by Firestore rules for client reads
    const ownerUid: string = plan.ownerUid ?? propData.ownerUid ?? customerUid;

    // 2. Determine target weekday (route override > preferred day)
    let targetWeekday: number = DAY_MAP[plan.preferredDay ?? plan.preferredServiceDay] ?? 1;
    const routeGroupId = propData.routeGroupId ?? null;

    if (routeGroupId) {
        const routeSnap = await adminDb.collection("routeGroups").doc(routeGroupId).get();
        if (routeSnap.exists && routeSnap.data()?.serviceWeekday != null) {
            targetWeekday = routeSnap.data()!.serviceWeekday;
        }
    }

    const frequency: "weekly" | "biweekly" = plan.frequency ?? "weekly";
    const intervalDays = frequency === "biweekly" ? 14 : 7;

    const pauseStart: string | null = plan.seasonalPauseStart ?? null;
    const pauseEnd: string | null = plan.seasonalPauseEnd ?? null;
    const skipDates: string[] = plan.skipDates ?? [];

    // 3. Fetch existing scheduled visits (all future ones)
    const today = toDateStr(new Date());
    const existingSnap = await adminDb
        .collection("visits")
        .where("servicePlanId", "==", servicePlanId)
        .where("completionStatus", "==", "scheduled")
        .get();

    // Track by BOTH date and visitId to avoid duplicates
    // Convert Firestore Timestamp safely to YYYY-MM-DD
    const existingDates = new Set<string>(
        existingSnap.docs.map((d) => {
            const val = d.data().scheduledDate;
            return typeof val === "string" ? val : timestampToNYDateString(val);
        })
    );
    const existingIds = new Set<string>(existingSnap.docs.map((d) => d.id));

    const futureScheduled = existingSnap.docs
        .map((d) => {
            const val = d.data().scheduledDate;
            return typeof val === "string" ? val : timestampToNYDateString(val);
        })
        .filter((date) => date >= today);

    const needed = horizonWeeks - futureScheduled.length;
    if (needed <= 0) return;

    // 4. Find starting cursor
    const allScheduled = [...futureScheduled].sort();
    let cursor: Date;

    if (allScheduled.length > 0) {
        const lastDate = new Date(allScheduled[allScheduled.length - 1] + "T12:00:00");
        cursor = addDays(lastDate, intervalDays);
    } else {
        // Find next occurrence of targetWeekday
        cursor = new Date();
        cursor.setHours(12, 0, 0, 0);
        let daysUntil = (targetWeekday + 7 - cursor.getDay()) % 7;
        if (daysUntil === 0) daysUntil = intervalDays;
        cursor = addDays(cursor, daysUntil);
    }

    // 5. Generate missing visits using DETERMINISTIC IDs
    const batch = adminDb.batch();
    let generated = 0;
    let safety = 0;

    while (generated < needed && safety < 200) {
        safety++;
        const dateStr = toDateStr(cursor);
        const visitId = `${servicePlanId}_${toDateKey(cursor)}`;

        const isSkipped = skipDates.includes(dateStr);
        const isPaused = isInPauseRange(dateStr, pauseStart, pauseEnd);
        const isDuplicateDate = existingDates.has(dateStr);
        const isDuplicateId = existingIds.has(visitId);

        if (!isDuplicateDate && !isDuplicateId && !isSkipped && !isPaused) {
            const visitRef = adminDb.collection("visits").doc(visitId);
            batch.set(visitRef, {
                servicePlanId,
                propertyId: plan.propertyId ?? "",
                ownerUid,           // ← required by Firestore rules for client reads
                customerUid,        // ← legacy alias for server-only queries
                scheduledDate: createNoonTimestamp(cursor), // Firestore Timestamp enforced
                completionStatus: "scheduled",
                chargeStatus: "pending",
                amount: plan.pricePerVisit ?? 0,
                charged: false,
                weatherDelayed: false,
                delayReason: null,
                stripePaymentIntentId: null,
                completedAt: null,
                createdAt: FieldValue.serverTimestamp(),
            }, { merge: false });

            existingDates.add(dateStr);
            existingIds.add(visitId);
            generated++;
        }

        cursor = addDays(cursor, intervalDays);
    }

    if (generated > 0) {
        await batch.commit();
        console.log(`[ensureRollingVisits] +${generated} visits for plan ${servicePlanId}`);
    }
}

/**
 * rebuildSchedule
 *
 * Used when a plan's preferred day / frequency changes.
 *
 * APPROACH A (safe): DELETE all future scheduled visits, then regenerate.
 * We never mark system-torn-down visits as "skipped" because that field
 * means "admin-approved client skip" and shows in the client's history.
 *
 * @param servicePlanId - Canonical Firestore plan ID
 */
export async function rebuildSchedule(servicePlanId: string) {
    const today = toDateStr(new Date());

    // ── Rebuild guard: skip if we ran in the last 30 s (prevents double-calls) ─
    const planRef = adminDb.collection("servicePlans").doc(servicePlanId);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
        console.warn(`[rebuildSchedule] Plan ${servicePlanId} not found, aborting.`);
        return;
    }
    const planData = planSnap.data()!;
    const lastRebuild = planData.lastScheduleRebuildAt?.toDate?.() as Date | undefined;
    if (lastRebuild && (Date.now() - lastRebuild.getTime()) < 30_000) {
        console.log(`[rebuildSchedule] Skipping — last rebuild was <30s ago for plan ${servicePlanId}`);
        return;
    }

    // Stamp the rebuild time immediately (idempotency guard)
    await planRef.update({ lastScheduleRebuildAt: FieldValue.serverTimestamp() });

    // ── Find all future scheduled visits for this plan ─────────────────────────
    const futureSnap = await adminDb
        .collection("visits")
        .where("servicePlanId", "==", servicePlanId)
        .where("completionStatus", "==", "scheduled")
        .get();

    // Delete future visits — do NOT mark as skipped (that pollutes client history)
    const deleteBatch = adminDb.batch();
    let deleted = 0;

    futureSnap.forEach((doc) => {
        const val = doc.data().scheduledDate;
        const dateStr = typeof val === "string" ? val : timestampToNYDateString(val);
        if (dateStr >= today) {
            deleteBatch.delete(doc.ref);
            deleted++;
        }
    });

    if (deleted > 0) {
        await deleteBatch.commit();
        console.log(`[rebuildSchedule] Deleted ${deleted} future visits for plan ${servicePlanId}`);
    }

    // ── Regenerate 8 future visits on the new preferred day ───────────────────
    await ensureRollingVisits(servicePlanId);
    console.log(`[rebuildSchedule] Rebuild complete for plan ${servicePlanId}`);
}

