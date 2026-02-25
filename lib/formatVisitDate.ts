/**
 * formatVisitDate — Centralized, timezone-safe date formatter.
 *
 * RULE: scheduledDate (Firestore Timestamp → "YYYY-MM-DD" string from the API)
 *       is the ONLY source of truth for visit date display.
 *       Never construct dates from year/month/day arithmetic.
 *
 * Accepts:
 *   - "YYYY-MM-DD" string (from API serialization)
 *   - Firestore Timestamp-like object ({ toDate(): Date } or { seconds: number })
 *   - null / undefined → returns "—"
 *
 * Always formats in America/New_York timezone.
 */
export function formatVisitDate(
    value: string | { toDate(): Date } | { seconds: number; nanoseconds?: number } | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!value) return "—";

    let date: Date;

    if (typeof value === "string") {
        // "YYYY-MM-DD" from API — parse at noon UTC so any US timezone stays on the same calendar day
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split("-").map(Number);
            date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        } else {
            // ISO string fallback
            date = new Date(value);
        }
    } else if (typeof (value as { toDate(): Date }).toDate === "function") {
        date = (value as { toDate(): Date }).toDate();
    } else if (typeof (value as { seconds: number }).seconds === "number") {
        date = new Date((value as { seconds: number }).seconds * 1000);
    } else {
        return "—";
    }

    if (isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
        ...options,
    }).format(date);
}

/**
 * daysUntilVisit — Returns days from today (NY midnight) to the visit date.
 * Positive = future, 0 = today, negative = past.
 */
export function daysUntilVisit(
    value: string | { toDate(): Date } | { seconds: number } | null | undefined
): number {
    if (!value) return NaN;

    let visitMs: number;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split("-").map(Number);
        visitMs = Date.UTC(y, m - 1, d, 12, 0, 0);
    } else if (typeof (value as { toDate(): Date }).toDate === "function") {
        visitMs = (value as { toDate(): Date }).toDate().getTime();
    } else if (typeof (value as { seconds: number }).seconds === "number") {
        visitMs = (value as { seconds: number }).seconds * 1000;
    } else {
        return NaN;
    }

    // Today at NY midnight in ms
    const nowNY = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const y = Number(nowNY.find(p => p.type === "year")!.value);
    const mo = Number(nowNY.find(p => p.type === "month")!.value);
    const d = Number(nowNY.find(p => p.type === "day")!.value);
    const todayMs = Date.UTC(y, mo - 1, d, 12, 0, 0);

    return Math.round((visitMs - todayMs) / 86_400_000);
}
