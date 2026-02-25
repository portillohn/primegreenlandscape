"use client";
import Image from "next/image";

const PHOTOS = [
    {
        src: "/premium-lawn-care-gaithersburg-md.jpg",
        alt: "Premium lawn care — Gaithersburg, MD",
        city: "Gaithersburg",
        caption: "Weekly mowing & cleanup",
    },
    {
        src: "/professional-striped-lawn-mowing-gaithersburg.jpg",
        alt: "Professional striped mowing — Gaithersburg, MD",
        city: "Gaithersburg",
        caption: "Precision stripes every visit",
    },
    {
        src: "/front-yard-landscaping-rockville-md.jpg",
        alt: "Front yard landscaping — Rockville, MD",
        city: "Rockville",
        caption: "Front yard transformation",
    },
    {
        src: "/residential-lawn-mowing-bethesda-md.jpg",
        alt: "Residential lawn mowing — Bethesda, MD",
        city: "Bethesda",
        caption: "Residential weekly service",
    },
    {
        src: "/backyard-lawn-maintenance-potomac-md.jpg",
        alt: "Backyard lawn maintenance — Potomac, MD",
        city: "Potomac",
        caption: "Backyard maintenance",
    },
    {
        src: "/weed-control-lawn-fertilization-montgomery-county.jpg",
        alt: "Weed control & fertilization — Montgomery County",
        city: "Montgomery County",
        caption: "Weed control & fertilization",
    },
    {
        src: "/leaf-blowing-yard-cleanup-germantown-md.jpg",
        alt: "Leaf blowing & yard cleanup — Germantown, MD",
        city: "Germantown",
        caption: "Yard cleanup & leaf removal",
    },
];

export default function GallerySection() {
    return (
        <section
            id="gallery"
            className="bg-white py-20 px-4"
        >
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-[#1B4332]/8
                          border border-[#1B4332]/15 px-4 py-1.5 rounded-full
                          text-[#1B4332] text-sm font-semibold mb-4">
                        📸 Our Work
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#1B4332] mb-3">
                        See the Prime Green Difference
                    </h2>
                    <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto">
                        Real results across Montgomery County — every week.
                    </p>
                </div>

                {/* Grid — 2 cols mobile, 3 tablet, 4 desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {PHOTOS.map((photo, i) => (
                        <div
                            key={photo.src}
                            className="relative aspect-square rounded-xl overflow-hidden
                         group cursor-default select-none"
                        >
                            <Image
                                src={photo.src}
                                alt={photo.alt}
                                fill
                                className="object-cover transition-transform duration-300
                           group-hover:scale-105"
                                sizes="(max-width: 640px) 50vw,
                       (max-width: 1024px) 33vw,
                       25vw"
                                loading={i < 4 ? "eager" : "lazy"}
                                priority={i < 2}
                            />

                            {/* City pill — always visible */}
                            <div className="absolute top-2 left-2 bg-black/50
                              backdrop-blur-sm text-white text-[10px]
                              font-semibold px-2 py-0.5 rounded-full
                              pointer-events-none">
                                📍 {photo.city}
                            </div>

                            {/* Caption — appears on hover, CSS only */}
                            <div className="absolute inset-0 bg-gradient-to-t
                              from-black/65 via-transparent to-transparent
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-200
                              pointer-events-none">
                                <div className="absolute bottom-0 inset-x-0 p-3">
                                    <p className="text-white text-xs font-bold leading-tight">
                                        {photo.caption}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-8">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        className="text-sm text-[#1B4332] font-semibold
                       hover:underline underline-offset-2 transition-all"
                    >
                        Get your free instant quote →
                    </button>
                </div>
            </div>
        </section>
    );
}
