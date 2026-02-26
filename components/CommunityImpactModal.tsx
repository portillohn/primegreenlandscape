"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "communityImpactSeen";

/** Future counter: multiply by total completed visits to show "$X donated so far this year" */
export const DONATION_PER_SERVICE = 1; // dollars per completed visit


export default function CommunityImpactModal() {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Only show on first visit — check localStorage
        try {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (!seen) {
                // Small delay for a polished entrance after page load
                const t = setTimeout(() => setVisible(true), 800);
                return () => clearTimeout(t);
            }
        } catch {
            // localStorage unavailable (e.g. private browsing with restrictions)
        }
    }, []);

    useEffect(() => {
        if (visible) setMounted(true);
    }, [visible]);

    const dismiss = () => {
        setVisible(false);
        setTimeout(() => setMounted(false), 300); // wait for fade-out
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    };

    if (!mounted) return null;

    return (
        /* Backdrop */
        <div
            onClick={dismiss}
            className={`fixed inset-0 z-[9999] flex items-center justify-center px-4
                        bg-black/60 backdrop-blur-sm
                        transition-opacity duration-300 ease-out
                        ${visible ? "opacity-100" : "opacity-0"}`}
        >
            {/* Modal card */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-[480px] bg-white rounded-2xl
                            shadow-2xl overflow-hidden
                            transition-all duration-300 ease-out
                            ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
                {/* Close button */}
                <button
                    onClick={dismiss}
                    aria-label="Close"
                    className="absolute top-3 right-3 z-10
                               w-8 h-8 flex items-center justify-center
                               rounded-full bg-black/20 hover:bg-black/35
                               text-white font-bold text-lg leading-none
                               transition-colors"
                >
                    ×
                </button>

                {/* Hero image */}
                <div className="relative w-full h-52 sm:h-60">
                    <Image
                        src="/community-impact.png"
                        alt="A dog and cat on green grass"
                        fill
                        className="object-cover object-center"
                        priority
                    />
                    {/* Gradient fade into card body */}
                    <div className="absolute inset-x-0 bottom-0 h-16
                                    bg-gradient-to-t from-white to-transparent" />
                </div>

                {/* Body */}
                <div className="px-6 pb-7 pt-2 text-center">

                    {/* Icon + Title */}
                    <p className="text-3xl mb-2">🌿</p>
                    <h2 className="text-xl font-black text-gray-900 leading-snug mb-3">
                        Lawn Care That Gives Back
                    </h2>

                    {/* Donation badge */}
                    <div className="inline-flex items-center gap-1.5
                                    bg-[#1B4332]/8 border border-[#1B4332]/20
                                    text-[#1B4332] font-bold text-sm
                                    px-4 py-1.5 rounded-full mb-4">
                        <span>🐾</span>
                        <span>$1 donated per completed service</span>
                    </div>

                    {/* Body copy */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-2">
                        For this year, we are donating{" "}
                        <strong className="text-gray-800">$1 for every completed service</strong>{" "}
                        to support local animal rescue organizations in Montgomery County.
                    </p>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        When you choose Prime Green, you&apos;re not just caring for your lawn —
                        you&apos;re helping protect animals in our community.{" "}
                        <span className="text-[#1B4332] font-semibold">
                            Together, we grow greener lawns and safer futures.
                        </span>
                    </p>

                    {/* CTA */}
                    <button
                        onClick={dismiss}
                        className="w-full py-3.5 bg-[#1B4332] hover:bg-[#2d6a4f]
                                   text-white font-black rounded-xl text-sm
                                   transition-all shadow-md shadow-[#1B4332]/25
                                   active:scale-[0.98]"
                    >
                        Continue →
                    </button>

                    <p className="text-gray-400 text-xs mt-3">
                        Only shown once · Won&apos;t interrupt your experience again
                    </p>
                </div>
            </div>
        </div>
    );
}
