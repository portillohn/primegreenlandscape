export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const RENTCAST_KEY = process.env.RENTCAST_API_KEY!;
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

const MONTGOMERY_ZIPS = new Set([
    "20810", "20811", "20812", "20813", "20814", "20815", "20816", "20817", "20818",
    "20824", "20825", "20827", "20830", "20832", "20833", "20837", "20838", "20839",
    "20841", "20842", "20847", "20848", "20849", "20850", "20851", "20852", "20853",
    "20854", "20855", "20859", "20860", "20861", "20862", "20866", "20868", "20871",
    "20872", "20874", "20875", "20876", "20877", "20878", "20879", "20880", "20882",
    "20883", "20884", "20885", "20886", "20889", "20891", "20892", "20894", "20895",
    "20896", "20897", "20898", "20899", "20901", "20902", "20903", "20904", "20905",
    "20906", "20907", "20908", "20910", "20911", "20912", "20913", "20914", "20915",
    "20916", "20918", "20993"
]);

const MONTGOMERY_CITIES = [
    "gaithersburg", "rockville", "bethesda", "germantown", "silver spring",
    "potomac", "chevy chase", "kensington", "olney", "burtonsville",
    "clarksburg", "damascus", "poolesville", "north bethesda", "wheaton",
    "aspen hill", "colesville", "montgomery village", "darnestown",
    "north potomac", "laytonsville", "sandy spring", "takoma park",
    "cabin john", "glen echo", "garrett park", "forest glen", "kemp mill",
    "white oak", "beltsville", "boyds", "brookeville", "calverton",
    "cloverly", "dickerson", "hyattstown", "layhill", "redland",
    "spencerville", "travilah", "woodfield", "leisure world"
];

// ── Geocode partial address → full address + ZIP + county ──
async function geocodeAddress(raw: string): Promise<{
    fullAddress: string;
    zip: string;
    county: string;
    lat: number | null;
    lng: number | null;
} | null> {
    if (!MAPS_KEY) return null;

    // Bias search to Maryland if no state given
    const query = raw.toLowerCase().includes(", md") ||
        raw.toLowerCase().includes("maryland")
        ? raw
        : `${raw}, MD`;

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json` +
            `?address=${encodeURIComponent(query)}` +
            `&components=country:US|administrative_area:MD` +
            `&key=${MAPS_KEY}`;

        const res = await fetch(url, { next: { revalidate: 86400 } });
        if (!res.ok) return null;

        const data = await res.json();
        if (data.status !== "OK" || !data.results?.length) return null;

        const result = data.results[0];
        const components = result.address_components as Array<{
            long_name: string;
            short_name: string;
            types: string[];
        }>;

        const getComp = (type: string) =>
            components.find(c => c.types.includes(type));

        const zip = getComp("postal_code")?.short_name ?? "";
        const county = getComp("administrative_area_level_2")?.long_name ?? "";
        const lat = result.geometry?.location?.lat ?? null;
        const lng = result.geometry?.location?.lng ?? null;

        return {
            fullAddress: result.formatted_address,
            zip,
            county,
            lat,
            lng,
        };
    } catch {
        return null;
    }
}

function isInServiceArea(
    address: string,
    zip: string,
    county: string
): boolean {
    // 1. County name from Google Geocoding (most reliable)
    if (county.toLowerCase().includes("montgomery")) return true;

    // 2. ZIP code check
    if (zip && MONTGOMERY_ZIPS.has(zip.substring(0, 5))) return true;

    // 3. ZIP in address string
    const zipMatch = address.match(/\b(20[0-9]{3})\b/);
    if (zipMatch && MONTGOMERY_ZIPS.has(zipMatch[1])) return true;

    // 4. City name in address
    const lower = address.toLowerCase();
    if (MONTGOMERY_CITIES.some(c => lower.includes(c))) return true;

    // 5. If address has "MD" and we can't determine county,
    //    be LENIENT — let it through rather than reject a valid customer
    if (
        (lower.includes(", md") || lower.includes("maryland")) &&
        lower !== "maryland, usa" &&
        lower !== "md, usa"
    ) {
        return true;
    }

    return false;
}

function getMowableArea(lotSize: number, houseSize: number): number {
    // Subtract house footprint from lot
    // House footprint ≈ squareFootage × 0.35 (single story) or × 0.20 (two story)
    // We use 0.25 as a safe average
    const houseFP = houseSize * 0.25;

    // Subtract driveways, patios, paths (~15% of lot)
    const hardscape = lotSize * 0.15;

    // Mowable = lot - house footprint - hardscape
    const mowable = lotSize - houseFP - hardscape;

    // Floor: never less than 40% of lot (some properties are mostly grass)
    return Math.max(mowable, lotSize * 0.40);
}

function calcPrices(sqft: number, demand: number, discount: number, surcharge: number) {
    // Market rates for Montgomery County MD 2026:
    // Essential (mow + edge):     $0.0026/sqft
    // Premium   (+ fertilize):    $0.0045/sqft
    // Ultimate  (+ aerate/seed):  $0.0062/sqft

    const essentialBase = Math.max(35, Math.round(sqft * 0.0026));
    const premiumBase = Math.max(60, Math.round(sqft * 0.0045));
    const ultimateBase = Math.max(85, Math.round(sqft * 0.0062));

    const applyModifiers = (base: number) => {
        let adj = base * demand;
        adj = adj * (1 - discount);
        adj = adj * (1 + surcharge);
        return Math.round(adj);
    };

    return {
        essential: applyModifiers(essentialBase),
        premium: applyModifiers(premiumBase),
        ultimate: applyModifiers(ultimateBase),
        breakdown: {
            baseEssential: essentialBase,
            basePremium: premiumBase,
            baseUltimate: ultimateBase,
            demandMultiplier: demand,
            densityDiscount: discount,
            outOfAreaSurcharge: surcharge
        }
    };
}

function getMapZoom(lotSize: number): number {
    if (lotSize < 5000) return 20; // small lot
    if (lotSize < 10000) return 20; // average lot
    if (lotSize < 20000) return 19; // large lot
    if (lotSize < 40000) return 18; // very large
    return 17;                       // estate/acre+
}

export async function POST(req: NextRequest) {
    try {
        const { address } = await req.json();

        if (!address || typeof address !== "string" || address.trim().length < 4) {
            return NextResponse.json(
                { error: "Please enter a valid address." },
                { status: 400 }
            );
        }

        const rawAddress = address.trim();

        // ── Step 1: Geocode to get full address details ──────────
        const geo = await geocodeAddress(rawAddress);

        const fullAddress = geo?.fullAddress ?? rawAddress;
        const zip = geo?.zip ?? "";
        const county = geo?.county ?? "";
        let lat = geo?.lat ?? null;
        let lng = geo?.lng ?? null;

        // ── Step 2: Service area check ───────────────────────────
        if (!isInServiceArea(fullAddress, zip, county)) {
            return NextResponse.json(
                { error: "outside_service_area" },
                { status: 200 }
            );
        }

        // ── Step 3: RentCast property lookup ─────────────────────
        let lotSize = 0;
        let houseSize = 2000;

        try {
            const rentUrl =
                `https://api.rentcast.io/v1/properties` +
                `?address=${encodeURIComponent(fullAddress)}&limit=1`;

            const rentRes = await fetch(rentUrl, {
                headers: { "X-Api-Key": RENTCAST_KEY },
                next: { revalidate: 86400 },
            });

            if (rentRes.ok) {
                const data = await rentRes.json();
                const prop = Array.isArray(data) ? data[0] : data;

                if (prop) {
                    lotSize = prop.lotSize
                        ?? prop.lot_size
                        ?? prop.lotSizeSquareFeet
                        ?? 0;

                    houseSize = prop.squareFootage ?? prop.square_footage ?? 2000;

                    // Fallback: house sqft × 3 ≈ lot size
                    if (!lotSize || lotSize < 500) {
                        lotSize = houseSize * 3;
                    }

                    // Prefer geocoded coords, fallback to RentCast
                    if (!lat) lat = prop.latitude ?? prop.location?.latitude ?? null;
                    if (!lng) lng = prop.longitude ?? prop.location?.longitude ?? null;
                }
            }
        } catch (e) {
            console.error("[RentCast]", e);
        }

        // ── Step 4: Fallback lot size if nothing returned ────────
        if (!lotSize || lotSize < 500) lotSize = 8500; // avg Montgomery County lot
        lotSize = Math.max(2000, Math.min(lotSize, 100000));

        const sqft = getMowableArea(lotSize, houseSize);

        // ── Step 5: Build satellite map URL ─────────────────────
        let mapImageUrl: string | null = null;
        if (lat && lng && MAPS_KEY) {
            const zoom = getMapZoom(lotSize);
            mapImageUrl =
                `https://maps.googleapis.com/maps/api/staticmap` +
                `?center=${lat},${lng}&zoom=${zoom}&size=640x360` +
                `&maptype=satellite` +
                `&markers=color:green%7C${lat},${lng}` +
                `&key=${MAPS_KEY}`;
        }

        // ── New Step: Compute Dynamic Route Demand ───────────────
        let demandMultiplier = 1.0;
        let densityDiscount = 0.0;
        let outOfAreaSurcharge = 0.0;

        try {
            const routeGroupsSnap = await adminDb.collection("routeGroups").get();
            const routeGroups = routeGroupsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

            const targetGroup = routeGroups.find((g: any) =>
                g.zipcodeCluster && g.zipcodeCluster.includes(zip)
            );

            if (targetGroup) {
                if ((targetGroup.activePlansCount || 0) >= (targetGroup.capacityPerWeek || 50)) {
                    demandMultiplier = (targetGroup.demandMultiplier || 1.0) + 0.10;
                } else {
                    demandMultiplier = targetGroup.demandMultiplier || 1.0;
                }
                densityDiscount = targetGroup.densityDiscount || 0.0;
            } else if (routeGroups.length > 0) {
                // Out of Area Fallback
                const maxSurcharge = Math.max(...routeGroups.map((g: any) => g.outOfAreaSurcharge || 0));
                outOfAreaSurcharge = maxSurcharge > 0 ? maxSurcharge : 0.10;
            }
        } catch (e) {
            console.error("[Dynamic Pricing Engine API Error]", e);
        }

        return NextResponse.json({
            address: fullAddress,
            lotSize: Math.round(lotSize),
            sqft: Math.round(sqft),
            mapImageUrl,
            ...calcPrices(sqft, demandMultiplier, densityDiscount, outOfAreaSurcharge),
        });

    } catch (err) {
        console.error("[/api/quote]", err);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
