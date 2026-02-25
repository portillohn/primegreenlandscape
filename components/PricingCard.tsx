"use client";

import { motion } from "framer-motion";

interface Props {
    name: string;
    price: number;
    basePrice?: number;
    demandMultiplier?: number;
    densityDiscount?: number;
    outOfAreaSurcharge?: number;
    features: string[];
    isBest?: boolean;
    delay?: number;
    onBook?: () => void;
}

export default function PricingCard({
    name, price, basePrice, demandMultiplier, densityDiscount, outOfAreaSurcharge, features, isBest = false, delay = 0, onBook,
}: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className={`relative flex flex-col bg-white/10
                        backdrop-blur-sm border border-white/20
                        rounded-2xl p-6 overflow-hidden min-h-0 transition-transform
                        hover:-translate-y-1 hover:shadow-2xl cursor-pointer
                        ${isBest ? "bg-[#1B4332] border-[#52B788] shadow-xl shadow-[#52B788]/20" : ""}`}
        >
            {isBest && (
                <div className="absolute -top-px left-1/2
                                -translate-x-1/2 bg-[#52B788]
                                text-white text-xs font-black
                                px-4 py-1 rounded-b-xl
                                whitespace-nowrap z-10">
                    ✦ BEST VALUE
                </div>
            )}

            {/* Plan name */}
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-4 mb-1">
                {name}
            </p>
            <p className="text-white/50 text-[11px] mb-3">
                Per visit · billed after each mow
            </p>

            {/* Price Details */}
            <div className="flex flex-col mb-4">
                {basePrice && basePrice > price && (
                    <span className="text-white/50 line-through text-sm font-bold mb-0.5">
                        ${basePrice.toFixed(2)}
                    </span>
                )}
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white leading-none shrink-0">
                        ${price.toFixed(2)}
                    </span>
                    <span className="text-white/60 text-sm">/visit</span>
                </div>
            </div>

            {/* Dynamic Pricing Badges */}
            <div className="flex flex-col gap-1.5 mb-5 min-h-[44px]">
                {demandMultiplier && demandMultiplier > 1.0 ? (
                    <div className="text-[10px] font-bold text-orange-200 bg-orange-500/20 px-2 py-0.5 rounded w-fit border border-orange-500/30">
                        ⚡ High demand route (+{Math.round((demandMultiplier - 1.0) * 100)}%)
                    </div>
                ) : null}
                {densityDiscount && densityDiscount > 0.0 ? (
                    <div className="text-[10px] font-bold text-[#52B788] bg-[#52B788]/20 px-2 py-0.5 rounded w-fit border border-[#52B788]/30">
                        🏡 Neighborhood density discount (-{Math.round(densityDiscount * 100)}%)
                    </div>
                ) : null}
                {outOfAreaSurcharge && outOfAreaSurcharge > 0.0 ? (
                    <div className="text-[10px] font-bold text-red-200 bg-red-500/20 px-2 py-0.5 rounded w-fit border border-red-500/30">
                        🗺️ Extended service area surcharge (+{Math.round(outOfAreaSurcharge * 100)}%)
                    </div>
                ) : null}
            </div>

            {/* Features */}
            <ul className="space-y-2.5 flex-1 w-full mb-6">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/85 leading-snug">
                        <span className="shrink-0 text-[#52B788] text-sm mt-0.5">✓</span>
                        <span className="flex-1 min-w-0 break-words">{f}</span>
                    </li>
                ))}
            </ul>

            {/* CTA button */}
            <button
                onClick={onBook}
                className={`mt-auto w-full py-3.5 rounded-xl font-black text-sm transition-all whitespace-nowrap active:scale-[0.98] ${isBest
                    ? "bg-[#52B788] hover:bg-[#40916C] text-white shadow-lg"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/30"
                    }`}
            >
                Book {name} Plan →
            </button>
        </motion.div>
    );
}
