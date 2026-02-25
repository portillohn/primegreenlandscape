import Link from "next/link";
import Image from "next/image";
export default function Footer() {
    return (
        <footer className="bg-[#0f2419] text-white pt-16 pb-8 px-4">
            <div className="max-w-6xl mx-auto">

                {/* ── Top grid ─────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12
                        border-b border-white/10">

                    {/* Brand — wider column */}
                    <div className="md:col-span-4">
                        <div className="mb-5">
                            <Image
                                src="/logo.png"
                                alt="Prime Green Landscape LLC"
                                width={180}
                                height={61}
                                className="h-14 w-auto object-contain brightness-0 invert"
                            />
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed mb-5 max-w-xs">
                            Montgomery County&apos;s premium lawn care service.
                            Satellite-powered pricing, zero contracts, professional
                            results — guaranteed every single visit.
                        </p>
                        <div className="space-y-1.5 text-white/70 text-xs">
                            <p>
                                <a href="tel:5714050031" className="hover:text-white transition-colors">📞 571-405-0031</a>
                            </p>
                            <p>
                                <a href="mailto:contact@primegreenlandscape.com" className="hover:text-white transition-colors">📧 contact@primegreenlandscape.com</a>
                            </p>
                            <p>📍 Montgomery County, MD</p>
                        </div>
                    </div>

                    {/* Service Areas — 3 columns of 2 cities each */}
                    <div className="md:col-span-5">
                        <h4 className="font-bold text-white mb-5 text-xs
                           uppercase tracking-widest">
                            Service Areas
                        </h4>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                            {[
                                { name: "Gaithersburg", slug: "gaithersburg" },
                                { name: "Rockville", slug: "rockville" },
                                { name: "Bethesda", slug: "bethesda" },
                                { name: "Germantown", slug: "germantown" },
                                { name: "Potomac", slug: "potomac" },
                                { name: "Silver Spring", slug: "silver-spring" },
                            ].map((city) => (
                                <Link
                                    key={city.name}
                                    href={`/${city.slug}`}
                                    className="text-white/70 hover:text-white text-sm
                             transition-colors leading-tight"
                                >
                                    {city.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Company links */}
                    <div className="md:col-span-3">
                        <h4 className="font-bold text-white mb-5 text-xs
                           uppercase tracking-widest">
                            Company
                        </h4>
                        <ul className="space-y-3 text-white/70 text-sm">
                            {[
                                { href: "/", label: "Get a Free Quote" },
                                { href: "/dashboard", label: "Client Portal" },
                                { href: "/about", label: "About Us" },
                                { href: "/terms", label: "Terms of Service" },
                                { href: "/privacy", label: "Privacy Policy" },
                            ].map(({ href, label }) => (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className="hover:text-white transition-colors"
                                    >
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* ── Bottom bar ───────────────────────────────────────────── */}
                <div className="pt-7 flex flex-col sm:flex-row items-center
                        justify-between gap-3 text-white/70 text-xs">
                    <p suppressHydrationWarning>
                        © {new Date().getFullYear()} Prime Green Landscape LLC ·
                        Montgomery County, MD
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/terms"
                            className="hover:text-white transition-colors">
                            Terms
                        </Link>
                        <Link href="/privacy"
                            className="hover:text-white transition-colors">
                            Privacy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
