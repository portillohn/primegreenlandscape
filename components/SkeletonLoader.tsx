"use client";

interface Props { address: string }

export default function SkeletonLoader({ address }: Props) {
    return (
        <div className="w-full max-w-4xl mx-auto mt-12 animate-pulse space-y-8">
            <p className="text-center text-white/75 text-lg font-medium">
                🛰️ Analyzing satellite lot data for{" "}
                <span className="text-[#52B788] font-semibold">{address}</span>…
            </p>

            {/* Map skeleton */}
            <div className="h-64 rounded-2xl bg-white/10" />

            {/* Card skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-2xl bg-white/10 p-6 space-y-4">
                        <div className="h-5  w-1/2 bg-white/20 rounded" />
                        <div className="h-10 w-3/4 bg-white/20 rounded" />
                        <div className="h-4  w-full bg-white/20 rounded" />
                        <div className="h-4  w-5/6 bg-white/20 rounded" />
                        <div className="h-4  w-4/6 bg-white/20 rounded" />
                        <div className="h-12 w-full bg-white/20 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
}
