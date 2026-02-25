import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">

            {/* LEFT PANEL */}
            <div className="hidden lg:flex lg:w-[45%] relative
                      flex-col justify-between p-12 overflow-hidden">
                <Image
                    src="/professional-striped-lawn-mowing-gaithersburg.jpg"
                    alt="Prime Green lawn care"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Dark-green overlay — must stay below z-10 content */}
                <div className="absolute inset-0 bg-[#1B4332]/75" />

                {/* Logo — clickable, no filter distortion */}
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center cursor-pointer">
                        <Image
                            src="/logo.png"
                            alt="Prime Green Landscape LLC"
                            width={160}
                            height={52}
                            className="h-14 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* Middle content */}
                <div className="relative z-10 space-y-6">
                    <h2 className="text-4xl font-black text-white leading-tight">
                        Premium lawn care,<br />on autopilot.
                    </h2>
                    <p className="text-white/70 text-base leading-relaxed">
                        Instant quotes. Zero contracts. We mow, then we bill.
                        Serving Montgomery County, MD.
                    </p>
                    <div className="space-y-3">
                        {[
                            { icon: "⭐", text: "5.0 Google Rating — 47 reviews" },
                            { icon: "🔒", text: "No contracts — cancel anytime" },
                            { icon: "⚡", text: "60-second instant quote" },
                        ].map(({ icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <span className="text-xl">{icon}</span>
                                <span className="text-white/85 text-sm font-medium">
                                    {text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative z-10 text-white/40 text-xs">
                    © {new Date().getFullYear()} Prime Green Landscape LLC
                </p>
            </div>

            {/* RIGHT PANEL — renders page content */}
            <div className="flex-1 flex flex-col justify-center
                      px-6 py-12 sm:px-10 lg:px-16 bg-white
                      overflow-y-auto">

                {/* Mobile logo — no filter, links home */}
                <div className="lg:hidden mb-8">
                    <Link href="/" className="inline-flex items-center cursor-pointer">
                        <Image
                            src="/logo.png"
                            alt="Prime Green Landscape LLC"
                            width={140}
                            height={48}
                            className="h-12 w-auto object-contain"
                        />
                    </Link>
                </div>

                {children}
            </div>
        </div>
    );
}
