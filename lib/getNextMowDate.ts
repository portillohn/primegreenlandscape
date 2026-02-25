export const DAY_MAP: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

export function getNextMowDate(preferredDay: string): Date {
    const today = new Date();
    const targetDay = DAY_MAP[preferredDay] ?? 5; // default Friday
    const todayDay = today.getDay();

    let daysUntil = targetDay - todayDay;
    // If today IS the preferred day, next one is in 7 days
    if (daysUntil <= 0) daysUntil += 7;

    const next = new Date(today);
    next.setDate(today.getDate() + daysUntil);
    next.setHours(0, 0, 0, 0);
    return next;
}

export function formatMowDate(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}
