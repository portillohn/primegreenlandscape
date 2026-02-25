import Link from "next/link";

export const metadata = {
    title: "About Us | Prime Green Landscape LLC",
    description: "Learn about Prime Green Landscape LLC — Montgomery County's premium lawn care service.",
};

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* 1. Hero */}
            <section className="relative bg-[#0f2419] text-white py-24 px-4 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('/grass-bg.jpg')] bg-cover bg-center mix-blend-overlay" />
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg">
                        Montgomery County&apos;s Most Trusted Lawn Care Team
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow">
                        Founded right here in Montgomery County, MD. We built Prime Green on one simple promise: show up, do great work, and only charge you after we deliver.
                    </p>
                </div>
            </section>

            {/* 2. Our Story */}
            <section className="py-20 px-4">
                <div className="max-w-3xl mx-auto space-y-6 text-lg text-gray-500 leading-relaxed font-medium">
                    <p>
                        Prime Green Landscape LLC was born out of a simple frustration: lawn care companies that charged upfront, showed up late, and did mediocre work. We decided to flip the model. We mow first. You pay after. No contracts, no deposits, no surprises.
                    </p>
                    <p>
                        We serve homeowners across Montgomery County — from Gaithersburg to Bethesda, Germantown to Silver Spring. Every crew member is trained, insured, and dedicated to the same standard of quality every single visit.
                    </p>
                </div>
            </section>

            {/* 3. Values */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
                        <h3 className="text-xl font-black text-gray-900 mb-3 flex items-center gap-2">🌿 Quality First</h3>
                        <p className="text-gray-500 leading-relaxed">
                            We treat every lawn like it&apos;s our own. Consistent cuts, clean edges, perfect stripes — every time.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
                        <h3 className="text-xl font-black text-gray-900 mb-3 flex items-center gap-2">🔒 No Contracts</h3>
                        <p className="text-gray-500 leading-relaxed">
                            We earn your business visit by visit. Stay because you love the results, not because you&apos;re locked in.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
                        <h3 className="text-xl font-black text-gray-900 mb-3 flex items-center gap-2">⚡ Transparent Pricing</h3>
                        <p className="text-gray-500 leading-relaxed">
                            Instant satellite-based quotes. The price you see is the price you pay. No hidden fees, ever.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. Stats bar */}
            <section className="bg-[#1B4332] text-white py-12 px-4">
                <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-10 md:gap-20 text-center">
                    <div>
                        <p className="text-3xl md:text-4xl font-black mb-1">500+</p>
                        <p className="text-xs text-white/70 uppercase tracking-widest font-bold">Visits Completed</p>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-black mb-1">5.0 ⭐</p>
                        <p className="text-xs text-white/70 uppercase tracking-widest font-bold">Rating</p>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-black mb-1">$0</p>
                        <p className="text-xs text-white/70 uppercase tracking-widest font-bold">Upfront</p>
                    </div>
                    <div>
                        <p className="text-3xl md:text-4xl font-black mb-1">100%</p>
                        <p className="text-xs text-white/70 uppercase tracking-widest font-bold">Satisfaction</p>
                    </div>
                </div>
            </section>

            {/* 5. Contact section */}
            <section className="py-20 px-4 bg-white text-center">
                <h2 className="text-3xl font-black text-gray-900 mb-8">Get in Touch</h2>
                <div className="space-y-4 text-lg text-gray-600 font-medium">
                    <p>
                        <a href="tel:5714050031" className="hover:text-[#1B4332] transition-colors">📞 571-405-0031</a>
                    </p>
                    <p>
                        <a href="mailto:contact@primegreenlandscape.com" className="hover:text-[#1B4332] transition-colors">✉️ contact@primegreenlandscape.com</a>
                    </p>
                    <p>📍 Montgomery County, MD</p>
                </div>
            </section>

            {/* 6. CTA section */}
            <section className="py-24 px-4 bg-gray-50 text-center">
                <h2 className="text-3xl font-black text-gray-900 mb-8">Ready for a Perfect Lawn?</h2>
                <Link href="/#quote" className="inline-block px-8 py-4 bg-[#1B4332] hover:bg-[#2d6a4f] text-white font-black text-lg rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    Get My Free Instant Quote →
                </Link>
            </section>
        </main>
    );
}
