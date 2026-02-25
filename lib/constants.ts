// ─── Montgomery County ZIP codes (validated server-side) ──────────────────────
export const SERVICE_ZIPS = new Set([
    "20850", "20851", "20852", "20853",
    "20874", "20876", "20877", "20878", "20879", "20886",
    "20814", "20817", "20854",
]);

export const SERVICE_CITIES = [
    "Gaithersburg",
    "Rockville",
    "Bethesda",
    "Germantown",
    "Potomac",
    "Silver Spring",
] as const;

export type ServiceCity = (typeof SERVICE_CITIES)[number];

// ─── Per-city SEO metadata ─────────────────────────────────────────────────────
export const CITY_META: Record<
    ServiceCity,
    { title: string; description: string; zip: string; slug: string }
> = {
    Gaithersburg: {
        slug: "gaithersburg",
        zip: "20877",
        title: "Premium Lawn Care in Gaithersburg, MD | Prime Green Landscape",
        description:
            "Instant, satellite-powered lawn care quotes in Gaithersburg, MD. Zero contracts — we mow, then we bill. Book online in 60 seconds.",
    },
    Rockville: {
        slug: "rockville",
        zip: "20850",
        title: "Premium Lawn Care in Rockville, MD | Prime Green Landscape",
        description:
            "Rockville's top-rated lawn mowing service. Real-time pricing based on your exact lot size. No contracts. No hassle.",
    },
    Bethesda: {
        slug: "bethesda",
        zip: "20814",
        title: "Premium Lawn Care in Bethesda, MD | Prime Green Landscape",
        description:
            "Luxury lawn maintenance in Bethesda, MD. Powered by satellite property data. Get your custom price in seconds.",
    },
    Germantown: {
        slug: "germantown",
        zip: "20874",
        title: "Premium Lawn Care in Germantown, MD | Prime Green Landscape",
        description:
            "Reliable, professional lawn care in Germantown, MD. Satellite lot analysis, instant quote, zero commitment.",
    },
    Potomac: {
        slug: "potomac",
        zip: "20854",
        title: "Premium Lawn Care in Potomac, MD | Prime Green Landscape",
        description:
            "Premium lawn mowing for Potomac's finest estates. Personalized pricing from real lot data — not guesswork.",
    },
    "Silver Spring": {
        slug: "silver-spring",
        zip: "20901",
        title: "Premium Lawn Care in Silver Spring, MD | Prime Green Landscape",
        description:
            "Fast, professional lawn care in Silver Spring, MD. Instant quotes, zero contracts, consistent results.",
    },
};
