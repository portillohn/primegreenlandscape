import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import HeroSection from "@/components/HeroSection";
import GallerySection from "@/components/GallerySection";
import Footer from "@/components/Footer";
import { SERVICE_CITIES, CITY_META } from "@/lib/constants";
import type { ServiceCity } from "@/lib/constants";

type Props = { params: Promise<{ city: string }> };

// ─── Slug → City name ─────────────────────────────────────────────────────────
function resolveCity(slug: string): ServiceCity | null {
    return (
        (Object.values(CITY_META).find((m) => m.slug === slug)
            ? SERVICE_CITIES.find(
                (c) => CITY_META[c].slug === slug
            )
            : null) ?? null
    );
}

// ─── Static build params ──────────────────────────────────────────────────────
export function generateStaticParams() {
    return SERVICE_CITIES.map((city) => ({ city: CITY_META[city].slug }));
}

// ─── Per-city SEO metadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { city } = await params;
    const cityName = resolveCity(city);
    if (!cityName) return {};

    const meta = CITY_META[cityName];
    return {
        title: meta.title,
        description: meta.description,
        alternates: { canonical: `/locations/${city}` },
        openGraph: {
            title: meta.title,
            description: meta.description,
            images: [{ url: "/premium-lawn-care-gaithersburg-md.jpg" }],
        },
    };
}

// ─── LocalBusiness JSON-LD ────────────────────────────────────────────────────
function buildSchema(cityName: ServiceCity) {
    const meta = CITY_META[cityName];
    return {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `https://primegreenlandscape.com/locations/${meta.slug}`,
        name: "Prime Green Landscape LLC",
        image: "https://primegreenlandscape.com/premium-lawn-care-gaithersburg-md.jpg",
        url: `https://primegreenlandscape.com/locations/${meta.slug}`,
        telephone: "+1-301-555-0194",
        email: "hello@primegreenlandscape.com",
        priceRange: "$$",
        address: {
            "@type": "PostalAddress",
            streetAddress: "Montgomery County",
            addressLocality: cityName,
            addressRegion: "MD",
            postalCode: meta.zip,
            addressCountry: "US",
        },
        areaServed: {
            "@type": "City",
            name: cityName,
            containedInPlace: {
                "@type": "State",
                name: "Maryland",
            },
        },
        description: meta.description,
        openingHoursSpecification: [
            { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "07:00", closes: "18:00" },
        ],
        hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Lawn Care Services",
            itemListElement: [
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Essential Lawn Mowing" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Premium Lawn Maintenance" } },
                { "@type": "Offer", itemOffered: { "@type": "Service", name: "Ultimate Lawn Care Package" } },
            ],
        },
        sameAs: [
            "https://www.facebook.com/primegreenlandscape",
            "https://www.instagram.com/primegreenlandscape",
        ],
    };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default async function CityPage({ params }: Props) {
    const { city } = await params;
    const cityName = resolveCity(city);
    if (!cityName) notFound();

    const schema = buildSchema(cityName);

    return (
        <>
            <Script
                id={`schema-${city}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />

            <HeroSection />

            {/* City-specific content block for SEO */}
            <section className="bg-white py-14 px-4 text-center border-b border-gray-100">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-[#1B4332] mb-3">
                        Lawn Care in {cityName}, MD
                    </h2>
                    <p className="text-gray-500 leading-relaxed">
                        Prime Green Landscape LLC serves {cityName} homeowners with professional,
                        precision lawn mowing and full maintenance programs. Enter your address
                        above to receive a satellite-powered quote tailored to your exact lot —
                        zero contracts, billed only after your lawn looks perfect.
                    </p>
                </div>
            </section>

            <GallerySection />
            <Footer />
        </>
    );
}
