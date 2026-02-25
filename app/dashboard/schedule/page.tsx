"use client";

import Link from "next/link";

/**
 * Legacy schedule page — upcoming visits are now shown in the main dashboard Overview
 * (Section B — Upcoming Visits). This page redirects users there.
 */
export default function SchedulePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-gray-900">My Schedule</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Your upcoming visits have been moved to the Overview page.
                </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-gray-700 font-semibold mb-1">
                    Upcoming Visits
                </p>
                <p className="text-gray-400 text-sm mt-1 mb-5">
                    Your next 3 upcoming visits are shown on the Overview page.
                </p>
                <Link href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4332] text-white rounded-xl font-bold text-sm hover:bg-[#2d6a4f] transition-colors">
                    Go to Overview →
                </Link>
            </div>
        </div>
    );
}
