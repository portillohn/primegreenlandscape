"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
    const { user } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);

    return (
        <>
            <header
                className={`fixed top-0 inset-x-0 z-50 bg-white transition-shadow duration-300
          ${scrolled ? "shadow-md border-b border-gray-100" : "shadow-sm"}`}
            >
                <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-20
                        flex items-center justify-between gap-4">

                    {/* ── Logo ──────────────────────────────────── */}
                    <Link href="/" className="shrink-0 flex items-center">
                        <Image
                            src="/logo.png"
                            alt="Prime Green Landscape LLC"
                            width={220}
                            height={74}
                            className="h-16 w-auto object-contain"
                            priority
                        />
                    </Link>

                    {/* ── Desktop nav ───────────────────────────── */}
                    <div className="hidden md:flex items-center gap-7">
                        {[
                            { label: "How It Works", href: "#how-it-works" },
                            { label: "Our Work", href: "#gallery" },
                            { label: "Reviews", href: "#reviews" },
                        ].map(({ label, href }) => (
                            <a
                                key={label}
                                href={href}
                                className="text-gray-600 hover:text-[#1B4332] text-sm
                           font-semibold transition-colors"
                            >
                                {label}
                            </a>
                        ))}
                    </div>

                    {/* ── CTA ───────────────────────────────────── */}
                    <div className="flex items-center gap-3">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2d6a4f]
                           text-white text-sm font-black rounded-xl
                           transition-all shadow-sm"
                            >
                                My Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hidden sm:block text-[#1B4332] font-semibold
                             text-sm hover:underline underline-offset-2"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/#quote"
                                    className="px-5 py-2.5 bg-[#1B4332] hover:bg-[#2d6a4f]
                             text-white text-sm font-black rounded-xl
                             transition-all shadow-sm"
                                >
                                    Get Free Quote →
                                </Link>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden w-10 h-10 flex flex-col items-center
                         justify-center gap-1.5 rounded-xl hover:bg-gray-100
                         transition-all"
                            aria-label="Menu"
                        >
                            <span className={`block w-5 h-0.5 bg-gray-700 transition-all
                ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
                            <span className={`block w-5 h-0.5 bg-gray-700 transition-all
                ${mobileOpen ? "opacity-0" : ""}`} />
                            <span className={`block w-5 h-0.5 bg-gray-700 transition-all
                ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
                        </button>
                    </div>
                </nav>

                {/* Mobile menu dropdown */}
                {mobileOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
                        {[
                            { label: "How It Works", href: "#how-it-works" },
                            { label: "Our Work", href: "#gallery" },
                            { label: "Reviews", href: "#reviews" },
                        ].map(({ label, href }) => (
                            <a
                                key={label}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                className="block px-3 py-3 text-gray-700 font-semibold
                           text-base rounded-xl hover:bg-gray-50 transition-all"
                            >
                                {label}
                            </a>
                        ))}
                        {!user && (
                            <Link
                                href="/login"
                                className="block px-3 py-3 text-[#1B4332] font-semibold
                           text-base rounded-xl hover:bg-[#1B4332]/5"
                                onClick={() => setMobileOpen(false)}
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                )}
            </header>
        </>
    );
}
