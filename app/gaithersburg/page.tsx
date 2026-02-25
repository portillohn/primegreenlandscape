import Link from "next/link";

export const metadata = {
    title: "Lawn Care Gaithersburg MD | Prime Green Landscape LLC",
    description: "Professional lawn mowing and maintenance in Gaithersburg, MD (20877, 20878, 20879, 20882). Instant quotes, no contracts. Call 571-405-0031.",
};

export default function CityPage() {
    return (
        <main className="min-h-screen">
            {/* 1. Hero */}
            <section className="relative bg-[#0f2419] text-white py-24 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-black/40 z-0" />
                <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg">
                        Lawn Care in Gaithersburg, MD
                    </h1>
                    <p className="text-lg md:text-xl max-w-2xl mx-auto text-white/90 drop-shadow">
                        Serving 20877, 20878, 20879, 20882. Get an instant quote for your Gaithersburg home — no contracts, pay after each visit.
                    </p>
                    <div className="pt-4">
                        <Link href="/#quote" className="inline-block px-8 py-4 bg-[#1B4332] hover:bg-[#2d6a4f] text-white font-black rounded-xl transition-all shadow-lg hover:shadow-xl">
                            Get My Free Quote →
                        </Link>
                    </div>
                </div>
            </section>

            {/* 2. Why Prime Green */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900">Why Gaithersburg Homeowners Choose Prime Green</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <span className="text-4xl mb-4 block">⚡</span>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Quote</h3>
                            <p className="text-gray-500">Satellite-based pricing for any Gaithersburg property in 60 seconds.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <span className="text-4xl mb-4 block">🌿</span>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Weekly Service</h3>
                            <p className="text-gray-500">Consistent crew, consistent results — every week.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <span className="text-4xl mb-4 block">🔒</span>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No Contracts</h3>
                            <p className="text-gray-500">Cancel anytime. We earn your business every visit.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Pricing */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-900">Simple, Transparent Pricing in Gaithersburg</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Essential */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Essential Plan</h3>
                            <p className="text-gray-500 mb-6">Starting at <span className="font-bold text-gray-900">$35 / visit</span></p>
                            <ul className="space-y-3 text-gray-600 mb-8 flex-1 font-medium">
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Professional Mowing</li>
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> String Trimming</li>
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Driveway/Walkway Edging</li>
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Blow Off Hardscapes</li>
                            </ul>
                            <Link href="/#quote" className="w-full inline-block text-center py-3 bg-[#1B4332] text-white font-bold rounded-xl transition-colors hover:bg-[#2d6a4f]">
                                Get Exact Quote →
                            </Link>
                        </div>
                        {/* Premium */}
                        <div className="bg-[#1B4332] p-8 rounded-3xl shadow-lg flex flex-col transform md:-translate-y-4">
                            <div className="bg-[#2d6a4f] text-white text-xs font-bold uppercase tracking-widest py-1 px-3 rounded-full self-start mb-4">Most Popular</div>
                            <h3 className="text-xl font-black text-white mb-2">Premium Plan</h3>
                            <p className="text-white/80 mb-6">Starting at <span className="font-bold text-white">$45 / visit</span></p>
                            <ul className="space-y-3 text-white/90 mb-8 flex-1 font-medium">
                                <li className="flex items-center gap-2"><span>✓</span> Everything in Essential</li>
                                <li className="flex items-center gap-2"><span>✓</span> Garden Bed Weeding</li>
                                <li className="flex items-center gap-2"><span>✓</span> Shrub Trimming (Light)</li>
                            </ul>
                            <Link href="/#quote" className="w-full inline-block text-center py-3 bg-white text-[#1B4332] font-bold rounded-xl transition-colors hover:bg-gray-50">
                                Get Exact Quote →
                            </Link>
                        </div>
                        {/* Ultimate */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                            <h3 className="text-xl font-black text-gray-900 mb-2">Ultimate Plan</h3>
                            <p className="text-gray-500 mb-6">Starting at <span className="font-bold text-gray-900">$65 / visit</span></p>
                            <ul className="space-y-3 text-gray-600 mb-8 flex-1 font-medium">
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Everything in Premium</li>
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Mulch Turning</li>
                                <li className="flex items-center gap-2"><span className="text-[#1B4332]">✓</span> Seasonal Cleanups</li>
                            </ul>
                            <Link href="/#quote" className="w-full inline-block text-center py-3 bg-[#1B4332] text-white font-bold rounded-xl transition-colors hover:bg-[#2d6a4f]">
                                Get Exact Quote →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. FAQ */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-3xl mx-auto space-y-12">
                    <h2 className="text-3xl font-black text-gray-900 text-center">Frequently Asked Questions</h2>
                    <div className="space-y-8">
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Do you serve all of Gaithersburg?</h3>
                            <p className="text-gray-600">Yes, we serve all ZIP codes in Gaithersburg including 20877, 20878, 20879, 20882.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">How do I get a quote for my Gaithersburg home?</h3>
                            <p className="text-gray-600">Enter your address on our homepage for an instant satellite-based quote.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">When do I get charged?</h3>
                            <p className="text-gray-600">Only after we complete each visit. No deposits, no upfront fees.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. CTA */}
            <section className="py-24 px-4 bg-[#1B4332] text-white text-center">
                <h2 className="text-3xl md:text-4xl font-black mb-6">Ready for a Perfect Lawn in Gaithersburg?</h2>
                <Link href="/#quote" className="inline-block px-8 py-4 bg-white text-[#1B4332] font-black rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mb-8">
                    Get My Free Quote →
                </Link>
                <p className="text-white/80 font-medium">
                    571-405-0031 · contact@primegreenlandscape.com
                </p>
            </section>
        </main>
    );
}
