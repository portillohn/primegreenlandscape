"use client";

import { useState } from "react";
import type { QuoteSuccess } from "@/types";

interface Props {
    address: string;
    lat: number;
    lng: number;
    onResult: (r: QuoteSuccess) => void;
}

export default function ManualSqFtInput({ address, lat, lng, onResult }: Props) {
    const [sqft, setSqft] = useState("");
    const [touched, setTouched] = useState(false);

    const MIN_FEE = 45;
    const RATE = 0.006;
    const sq = parseInt(sqft, 10);
    const isValid = !isNaN(sq) && sq >= 500 && sq <= 500_000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!isValid) return;

        const essential = Math.max(MIN_FEE, sq * RATE);
        const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=640x360&maptype=satellite&markers=color:green|${lat},${lng}&key=${MAPS_KEY}`;

        onResult({
            success: true,
            address,
            sqft: sq,
            essential: Math.round(essential * 100) / 100,
            premium: Math.round(essential * 1.3 * 100) / 100,
            ultimate: Math.round(essential * 1.8 * 100) / 100,
            mapImageUrl,
        });
    };

    return (
        <div className="w-full max-w-md mx-auto mt-10 bg-white/10 backdrop-blur-sm
                    rounded-2xl p-8 border border-white/20 text-center space-y-5">
            <div className="text-4xl">📐</div>
            <h3 className="text-white font-black text-xl">Enter Your Lot Size</h3>
            <p className="text-white/55 text-sm leading-relaxed">
                We couldn&apos;t auto-detect your lot from satellite data.
                Enter your approximate square footage to get your instant quote.
            </p>
            <p className="text-white/35 text-xs">
                Tip: Find your lot size on{" "}
                <a href="https://www.zillow.com" target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-white/60 transition-colors">
                    Zillow
                </a>{" "}
                or your county property records.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                <input
                    type="number"
                    min={500}
                    max={500000}
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    placeholder="e.g. 8,500"
                    className={`w-full px-5 py-4 rounded-xl bg-white/10 text-white text-center
                      text-xl placeholder-white/40 focus:outline-none transition-all
                      border-2 ${touched && !isValid
                            ? "border-red-400/70"
                            : "border-white/20 focus:border-[#52B788]"
                        }`}
                    required
                />
                {touched && !isValid && (
                    <p className="text-red-400 text-xs">
                        Please enter a value between 500 and 500,000 sq ft.
                    </p>
                )}
                <button
                    type="submit"
                    className="w-full py-4 bg-[#52B788] hover:bg-[#40916C] text-white
                     font-bold rounded-xl transition-all shadow-lg"
                >
                    Calculate My Price →
                </button>
            </form>
        </div>
    );
}
