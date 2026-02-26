"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import AddressInput from "./AddressInput";
import SkeletonLoader from "./SkeletonLoader";
import QuoteResults from "./QuoteResults";
import ManualSqFtInput from "./ManualSqFtInput";
import type { QuoteSuccess } from "@/types";

type FunnelStep = "idle" | "loading" | "results" | "manual" | "out_of_service";

const TRUST_BADGES = [
    { icon: "⭐", text: "5.0 Google Rating" },
    { icon: "💳", text: "Pay After Each Visit" },
    { icon: "🔒", text: "No Contracts. Cancel Anytime." },
    { icon: "✅", text: "Licensed & Insured" },
];

const CITIES = [
    "Gaithersburg", "Rockville", "Germantown",
    "Bethesda", "Potomac", "Silver Spring",
];

export default function HeroSection() {
    const [step, setStep] = useState<FunnelStep>("idle");
    const [address, setAddress] = useState("");
    const [coords, setCoords] = useState({ lat: 0, lng: 0 });
    const [result, setResult] = useState<QuoteSuccess | null>(null);
    const [errMsg, setErrMsg] = useState("");

    const handleQuote = async () => {
        const trimmed = address.trim();
        if (!trimmed || trimmed.length < 8) {
            setErrMsg("Please enter your full home address.");
            return;
        }
        setErrMsg("");
        setStep("loading");
        try {
            const res = await fetch("/api/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: trimmed }),
            });
            const data = await res.json();

            if (data.error === "outside_service_area") {
                setErrMsg(
                    "We currently serve Montgomery County, MD. " +
                    "Cities include Gaithersburg, Rockville, Bethesda, Germantown & more."
                );
                setStep("idle");
                return;
            }
            if (!res.ok || data.error) {
                setErrMsg(data.error ?? "Could not find that address. Please try again.");
                setStep("idle");
                return;
            }
            setAddress(data.address);
            setResult(data);
            setStep("results");
        } catch {
            setErrMsg("Network error. Please check your connection and try again.");
            setStep("idle");
        }
    };

    const reset = () => { setStep("idle"); setResult(null); setErrMsg(""); };

    return (
        <section
            id="quote"
            className="relative min-h-[85vh] md:min-h-screen pt-20 pb-10 md:pb-0 flex items-center justify-center px-4 sm:px-6 overflow-hidden"
        >
            {/* ── Background ── */}
            <div className="absolute inset-0 -z-10">
                <Image
                    src="/premium-lawn-care-gaithersburg-md.jpg"
                    alt="Lawn care Montgomery County MD"
                    fill
                    className="object-cover object-center"
                    priority
                    sizes="100vw"
                />
                {/* Primary dark overlay */}
                <div className="absolute inset-0 bg-black/55" />
                {/* Subtle depth gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 w-full max-w-4xl mx-auto text-center flex flex-col items-center">

                {/* 1 ─ Micro badge */}
                <div className="inline-flex items-center gap-2
                    bg-white/10 backdrop-blur-md border border-white/20
                    text-white/90 text-sm font-semibold
                    px-4 py-2 rounded-full mb-5 md:mb-7">
                    <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse flex-shrink-0" />
                    Serving Montgomery County, MD
                </div>

                {/* 2 ─ H1 */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold
                    text-white leading-tight tracking-tight mb-4 md:mb-6">
                    Recurring Lawn Care,<br />
                    <span className="text-[#52B788]">Done Right.</span>
                </h1>

                {/* 3 ─ Subheadline */}
                <p className="hidden sm:block text-white/80 text-lg md:text-xl
                    max-w-2xl mx-auto leading-relaxed mb-7 md:mb-9">
                    Weekly & biweekly mowing for homes across Montgomery County.{" "}
                    <strong className="text-white font-semibold">
                        Charged only after each completed visit.
                    </strong>{" "}
                    No contracts, no surprises.
                </p>
                {/* Mobile-only compact subline */}
                <p className="sm:hidden text-white/75 text-base leading-relaxed mb-5 max-w-xs mx-auto">
                    Weekly & biweekly mowing. Charged after each visit. No contracts.
                </p>

                {/* 4 ─ Trust badges */}
                <div className="flex flex-wrap justify-center gap-2 mb-6 md:mb-10 max-w-sm sm:max-w-none mx-auto">
                    {TRUST_BADGES.map(({ icon, text }) => (
                        <div
                            key={text}
                            className="inline-flex items-center gap-1.5
                                px-3 py-1.5 sm:px-4 sm:py-2 rounded-full
                                bg-white/10 backdrop-blur-md border border-white/20
                                text-white/85 text-xs sm:text-sm font-medium
                                whitespace-nowrap"
                        >
                            <span>{icon}</span>
                            <span>{text}</span>
                        </div>
                    ))}
                </div>

                {/* 5 ─ Address input + CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full max-w-md sm:max-w-2xl mx-auto"
                >
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Input */}
                        <AddressInput
                            value={address}
                            onChange={setAddress}
                            onSelect={(addr) => { setAddress(addr); setErrMsg(""); }}
                            disabled={step === "loading"}
                            className="flex-1
                                bg-white/10 backdrop-blur-md
                                border-2 border-white/25 focus:border-[#52B788]
                                focus:outline-none
                                text-white placeholder:text-white/40
                                rounded-xl px-5 py-4 text-base
                                transition-colors shadow-lg"
                        />

                        {/* CTA Button */}
                        <button
                            onClick={handleQuote}
                            disabled={step === "loading" || !address.trim()}
                            className="w-full sm:w-auto bg-[#52B788] hover:bg-[#40916C]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                text-white font-bold rounded-xl
                                px-8 py-4 text-base
                                shadow-lg shadow-[#1B4332]/30
                                whitespace-nowrap
                                transition-all active:scale-[0.98]"
                        >
                            {step === "loading" ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Looking up…
                                </span>
                            ) : (
                                "Get My Free Quote →"
                            )}
                        </button>
                    </div>

                    {/* Error */}
                    {errMsg && step === "idle" && (
                        <p className="text-red-300 text-sm mt-3 text-center">
                            ⚠️ {errMsg}
                        </p>
                    )}

                    {/* 6 ─ Service cities */}
                    <p className="text-white/35 text-xs mt-5 tracking-wide">
                        {CITIES.join(" · ")}
                    </p>
                </motion.div>

                {/* ── Funnel State Machine ── */}
                <AnimatePresence mode="wait">

                    {step === "loading" && (
                        <SkeletonLoader key="loader" address={address} />
                    )}

                    {step === "results" && result && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full mt-8"
                        >
                            <QuoteResults result={result} />
                            <p className="text-center mt-6">
                                <button
                                    onClick={reset}
                                    className="text-white/40 hover:text-white/70 text-sm
                                        underline transition-colors"
                                >
                                    ← Check a different address
                                </button>
                            </p>
                        </motion.div>
                    )}

                    {step === "manual" && (
                        <ManualSqFtInput
                            key="manual"
                            address={address}
                            lat={coords.lat}
                            lng={coords.lng}
                            onResult={(r) => { setResult(r); setStep("results"); }}
                        />
                    )}

                    {step === "out_of_service" && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-10 bg-red-500/15 border border-red-400/30
                                rounded-2xl px-8 py-7 text-center max-w-md"
                        >
                            <p className="text-2xl mb-2">📍</p>
                            <p className="text-red-300 font-semibold text-lg">{errMsg}</p>
                            <button
                                onClick={reset}
                                className="mt-5 text-white/50 hover:text-white text-sm
                                    underline transition-colors"
                            >
                                Try a different address
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </section>
    );
}
