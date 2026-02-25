import { Timestamp } from "firebase-admin/firestore";

export const BUSINESS_TIMEZONE = "America/New_York";

/**
 * Returns a precise UTC Date object representing 00:00:00 in America/New_York
 * for either "today" or a specific provided date string (YYYY-MM-DD).
 */
export function getNYMidnight(dateArg?: Date | string): Date {
    let y: string, m: string, d: string;

    if (typeof dateArg === "string") {
        [y, m, d] = dateArg.split("-");
    } else {
        const target = dateArg || new Date();
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: BUSINESS_TIMEZONE,
            year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(target);

        y = parts.find(p => p.type === "year")!.value;
        m = parts.find(p => p.type === "month")!.value;
        d = parts.find(p => p.type === "day")!.value;
    }

    // Create a UTC Noon date for that valid day
    const utcNoon = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));

    // Determine the GMT offset string (e.g., "GMT-4", "GMT-05:00") for that specific moment
    const offsetParts = new Intl.DateTimeFormat("en-US", {
        timeZone: BUSINESS_TIMEZONE,
        timeZoneName: "shortOffset"
    }).formatToParts(utcNoon);

    const offsetStr = offsetParts.find(p => p.type === "timeZoneName")?.value;
    let offsetString = "-05:00"; // Fallback to EST

    if (offsetStr && offsetStr.includes("GMT")) {
        const match = offsetStr.match(/GMT([+-]\d+)(?::\d+)?/);
        if (match) {
            const num = parseInt(match[1], 10);
            const sign = num < 0 ? "-" : "+";
            const val = Math.abs(num).toString().padStart(2, "0");
            offsetString = `${sign}${val}:00`;
        } else if (offsetStr === "GMT") {
            offsetString = "Z";
        }
    }

    return new Date(`${y}-${m}-${d}T00:00:00${offsetString}`);
}

/**
 * Gets the start and end of day in NY as Firestore Timestamps
 */
export function getNYDayBounds(dateArg?: Date | string): { startTs: Timestamp, endTs: Timestamp } {
    const startOfDay = getNYMidnight(dateArg);
    // Add 25 hours to guarantee we securely step into the next calendar day exactly, regardless of 23hr/25hr DST shifts
    const endOfDay = getNYMidnight(new Date(startOfDay.getTime() + 25 * 60 * 60 * 1000));

    return {
        startTs: Timestamp.fromDate(startOfDay),
        endTs: Timestamp.fromDate(endOfDay)
    };
}

/**
 * Creates a deterministic Firestore Timestamp for a given Date, fixed at 12:00:00 Noon UTC.
 * Since UTC Noon is 07:00 or 08:00 AM NY time, it perfectly falls inside NY day bounds.
 */
export function createNoonTimestamp(d: Date): Timestamp {
    const y = d.getFullYear();
    const m = d.getMonth();
    const dt = d.getDate();
    return Timestamp.fromDate(new Date(Date.UTC(y, m, dt, 12, 0, 0)));
}

/**
 * Converts a Firestore Timestamp back to a YYYY-MM-DD string mapped inside NY timezone.
 */
export function timestampToNYDateString(ts: Timestamp | { _seconds: number } | any): string {
    if (!ts) return "Unknown";
    let dateObj: Date;
    if (typeof ts.toDate === "function") dateObj = ts.toDate();
    else if (ts._seconds) dateObj = new Date(ts._seconds * 1000);
    else if (ts.seconds) dateObj = new Date(ts.seconds * 1000);
    else return String(ts);

    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: BUSINESS_TIMEZONE,
        year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(dateObj);

    const y = parts.find(p => p.type === "year")!.value;
    const m = parts.find(p => p.type === "month")!.value;
    const d = parts.find(p => p.type === "day")!.value;
    return `${y}-${m}-${d}`;
}
