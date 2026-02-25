"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import PricingCard from "./PricingCard";
import BookingModal from "./BookingModal";
import type { QuoteSuccess } from "@/types";
import type { PlanTier } from "@/types";

interface Props { result: QuoteSuccess }

const FEATURES = {
    essential: [
        "Weekly lawn mowing",
        "Edge trimming & cleanup",
        "Clippings mulched or bagged",
        "No contracts — cancel anytime",
    ],
    premium: [
        "Everything in Essential",
        "Seasonal fertilization",
        "Spot weed control",
        "Priority scheduling window",
        "No contracts — cancel anytime",
    ],
    ultimate: [
        "Everything in Premium",
        "Spring & fall aeration",
        "Overseeding included",
        "Dedicated crew, every visit",
        "Same-day rescheduling",
        "No contracts — cancel anytime",
    ],
};

export default function QuoteResults({ result }: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanTier>("premium");
    const [selectedPrice, setSelectedPrice] = useState(result.premium);

    const handleBookPlan = (plan: PlanTier, price: number) => {
        setSelectedPlan(plan);
        setSelectedPrice(price);
        setModalOpen(true);
    };

    const PLANS: { tier: PlanTier; price: number; isBest?: boolean }[] = [
        { tier: "essential", price: result.essential },
        { tier: "premium", price: result.premium, isBest: true },
        { tier: "ultimate", price: result.ultimate },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-4xl mx-auto mt-10 space-y-8"
            >
                {/* Satellite Map */}
                <motion.div
                    initial={{ scale: 0.97, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl overflow-hidden border-2 border-[#52B788]/40 shadow-2xl"
                >
                    <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 flex items-center
                          gap-2 border-b border-white/10">
                        <span className="w-2 h-2 rounded-full bg-[#52B788] animate-pulse" />
                        <p className="text-white/80 text-sm font-medium truncate flex-1">
                            {result.address}
                        </p>
                        <span className="text-[#52B788] text-xs font-bold bg-[#52B788]/15
                             px-2 py-0.5 rounded-full shrink-0">
                            {result.sqft.toLocaleString()} sq ft
                        </span>
                    </div>
                    <Image
                        src={result.mapImageUrl}
                        alt={`Satellite view of ${result.address}`}
                        width={640}
                        height={360}
                        className="w-full object-cover"
                        unoptimized
                        priority
                    />
                </motion.div>

                {/* Pricing Cards */}
                <div>
                    <p className="text-white/70 text-sm text-center px-4 mb-6 leading-relaxed">
                        Your personalized quote for a{" "}
                        <strong className="text-white font-black">
                            ~{result.sqft.toLocaleString()} sq ft
                        </strong>{" "}
                        mowable area
                        {result.lotSize && (
                            <span className="text-white/50">
                                {" "}({(result.lotSize / 43560).toFixed(2)} acre lot)
                            </span>
                        )}
                        {" "}— prices shown per mowing visit
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch max-w-4xl mx-auto px-4">
                        {PLANS.map(({ tier, price, isBest }, i) => {
                            let basePrice;
                            if (result.breakdown) {
                                if (tier === "essential") basePrice = result.breakdown.baseEssential;
                                if (tier === "premium") basePrice = result.breakdown.basePremium;
                                if (tier === "ultimate") basePrice = result.breakdown.baseUltimate;
                            }
                            return (
                                <PricingCard
                                    key={tier}
                                    name={tier.charAt(0).toUpperCase() + tier.slice(1)}
                                    price={price}
                                    basePrice={basePrice}
                                    demandMultiplier={result.breakdown?.demandMultiplier}
                                    densityDiscount={result.breakdown?.densityDiscount}
                                    outOfAreaSurcharge={result.breakdown?.outOfAreaSurcharge}
                                    features={FEATURES[tier]}
                                    isBest={isBest}
                                    delay={i * 0.1}
                                    onBook={() => handleBookPlan(tier, price)}
                                />
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Booking Modal */}
            {modalOpen && (
                <BookingModal
                    onClose={() => setModalOpen(false)}
                    plan={selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}
                    price={selectedPrice}
                    address={result.address}
                    sqft={result.sqft}
                />
            )}
        </>
    );
}
