"use client";


const STATS = [
    { value: "500+", label: "Lawns Serviced", icon: "🌿" },
    { value: "4.9★", label: "Google Rating", icon: "⭐" },
    { value: "98%", label: "On-Time Arrival Rate", icon: "⚡" },
    { value: "$0", label: "Cancellation Fee", icon: "🔒" },
];

const TESTIMONIALS = [
    {
        name: "Sarah M.",
        location: "Bethesda, MD",
        avatar: "SM",
        rating: 5,
        date: "January 2026",
        text: "I got an instant quote in under a minute — no calls, no haggling. The crew showed up exactly on time and my lawn looked better than ever. Highly recommend to anyone in Montgomery County.",
    },
    {
        name: "James R.",
        location: "Rockville, MD",
        avatar: "JR",
        rating: 5,
        date: "February 2026",
        text: "What sold me was the satellite quote. I could see my own property on the map and the price was totally fair. No contracts either — I tried it once and now I'm a weekly subscriber.",
    },
    {
        name: "Linda & Tom K.",
        location: "Gaithersburg, MD",
        avatar: "LK",
        rating: 5,
        date: "December 2025",
        text: "We've used 3 lawn services over the years. Prime Green is the only one that actually shows up every single week without reminders. The app quoting system is genius.",
    },
    {
        name: "Carlos P.",
        location: "Potomac, MD",
        avatar: "CP",
        rating: 5,
        date: "January 2026",
        text: "Our lot is almost half an acre. The price was completely fair and way more transparent than any competitor. We knew exactly what we'd pay before booking.",
    },
    {
        name: "Angela D.",
        location: "Silver Spring, MD",
        avatar: "AD",
        rating: 5,
        date: "February 2026",
        text: "I was skeptical about the instant quote thing but it actually works. My lot size was detected automatically from satellite data. Very impressive tech for a local lawn company.",
    },
    {
        name: "Michael T.",
        location: "Germantown, MD",
        avatar: "MT",
        rating: 5,
        date: "November 2025",
        text: "No contracts means they actually have to earn your business every single week. That's what makes Prime Green different. My lawn is the nicest on the block now.",
    },
];

const GUARANTEES = [
    {
        icon: "🔄",
        title: "Re-Mow Guarantee",
        desc: "Not happy with the result? We come back within 48 hours and redo it free.",
    },
    {
        icon: "🕗",
        title: "On-Time or 10% Off",
        desc: "If our crew is more than 30 minutes late, your visit is automatically discounted.",
    },
    {
        icon: "🚫",
        title: "Zero Contracts",
        desc: "Cancel anytime, no questions asked. We earn your trust visit by visit.",
    },
    {
        icon: "💳",
        title: "Pay After Service",
        desc: "We mow first, then we bill. You only pay once you're satisfied.",
    },
];

function StarRating({ count }: { count: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: count }).map((_, i) => (
                <span key={i} className="text-amber-400 text-sm">★</span>
            ))}
        </div>
    );
}

export default function SocialProof() {
    return (
        <>
            {/* ── 1. Stats Bar ──────────────────────────────────────── */}
            <section className="bg-[#1B4332] py-12 px-4">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
                    {STATS.map((stat, i) => (
                        <div
                            key={stat.label}
                            className="text-center"
                        >
                            <div className="text-3xl mb-1">{stat.icon}</div>
                            <div className="text-3xl md:text-4xl font-black text-white mb-1">
                                {stat.value}
                            </div>
                            <div className="text-white/80 text-sm font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── 2. Testimonials Grid ──────────────────────────────── */}
            <section className="bg-white py-20 px-4" id="reviews">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-amber-50 
                            border border-amber-200 px-4 py-1.5 rounded-full 
                            text-amber-700 text-sm font-semibold mb-4">
                            ⭐ 4.9 out of 5 · 120+ Google Reviews
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#1B4332] mb-3">
                            Montgomery County Homeowners Love Us
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Real reviews from real neighbors. No scripts, no incentives —
                            just honest feedback from people who trust us with their lawn
                            every week.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {TESTIMONIALS.map((t, i) => (
                            <div
                                key={t.name}
                                className="bg-white rounded-2xl p-6 border border-gray-100 
                                     shadow-sm flex flex-col gap-4"
                            >
                                <div className="flex items-center justify-between">
                                    <StarRating count={t.rating} />
                                    <span className="text-gray-400 text-xs">{t.date}</span>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed flex-1">
                                    &ldquo;{t.text}&rdquo;
                                </p>
                                <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                                    <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center
                                            justify-center text-white text-xs font-black shrink-0">
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {t.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            📍 {t.location}
                                        </p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-1 bg-blue-50 
                                            px-2 py-1 rounded-full">
                                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-blue-600 text-xs font-medium">Google</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 3. Guarantees Grid ────────────────────────────────── */}
            <section className="bg-gray-50 py-20 px-4" id="guarantees">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-[#1B4332] mb-3">
                            Our Promises to You
                        </h2>
                        <p className="text-gray-500 max-w-md mx-auto">
                            We don&apos;t hide behind contracts. Every guarantee below is
                            a real commitment we stand behind — no fine print.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {GUARANTEES.map((g, i) => (
                            <div
                                key={g.title}
                                className="text-center p-6 rounded-2xl bg-white 
                                   border border-gray-100 hover:border-[#52B788]/40
                                   hover:bg-[#52B788]/5 transition-all group"
                            >
                                <div className="text-4xl mb-4">{g.icon}</div>
                                <h3 className="font-bold text-gray-900 text-lg mb-2 
                                       group-hover:text-[#1B4332] transition-colors">
                                    {g.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    {g.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. Final CTA Banner ───────────────────────────────── */}
            <section className="bg-white py-16 px-4 border-t border-gray-100">
                <div className="max-w-3xl mx-auto text-center space-y-5">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                        Ready for a lawn you&apos;re proud of?
                    </h2>
                    <p className="text-gray-500 text-lg">
                        Join 500+ Montgomery County homeowners who get a perfect lawn
                        every week — no contracts, no stress.
                    </p>
                    <a
                        href="/#"
                        onClick={(e) => {
                            e.preventDefault();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="inline-block px-10 py-4 bg-[#1B4332] hover:bg-[#2d6a4f]
                                   text-white font-black text-base rounded-xl transition-all shadow-md"
                    >
                        Get My Free Quote →
                    </a>
                    <p className="text-gray-400 text-sm">
                        Takes 60 seconds · No credit card required · Cancel anytime
                    </p>
                </div>
            </section>
        </>
    );
}
