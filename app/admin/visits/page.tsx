"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { formatVisitDate } from "@/lib/formatVisitDate";

type AdminVisit = Record<string, unknown>;


export default function AdminAllVisitsPage() {
    const { user } = useAuth();
    const [visits, setVisits] = useState<AdminVisit[]>([]);
    const [fetching, setFetching] = useState(true);

    const [filterFrom, setFilterFrom] = useState("");
    const [filterTo, setFilterTo] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    const fetchVisits = useCallback(async () => {
        if (!user) return;
        setFetching(true);
        try {
            const token = await user.getIdToken();
            let url = `/api/admin/visits?view=all`;
            if (filterFrom) url += `&from=${filterFrom}`;
            if (filterTo) url += `&to=${filterTo}`;
            if (filterStatus) url += `&status=${filterStatus}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            const data = await res.json();

            const rawVisits = data.visits ?? [];
            const deduped = new Map<string, AdminVisit>();
            rawVisits.forEach((v: AdminVisit) => {
                if (v.id) deduped.set(String(v.id), v);
            });
            setVisits(Array.from(deduped.values()));
        } catch {
            toast.error("Failed to load visits.");
        } finally {
            setFetching(false);
        }
    }, [user, filterFrom, filterTo, filterStatus]);

    useEffect(() => {
        if (user) fetchVisits();
    }, [user, fetchVisits]);

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-2xl font-black text-gray-900 mb-4">📋 All Visits</h2>

                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                            className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#1B4332] outline-none text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                            className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#1B4332] outline-none text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-[#1B4332] outline-none text-sm">
                            <option value="">All</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="skipped">Skipped</option>
                        </select>
                    </div>
                    <button onClick={() => fetchVisits()}
                        className="px-5 py-2 bg-[#1B4332] text-white rounded-lg font-bold text-sm hover:bg-[#2d6a4f] transition">
                        Apply
                    </button>
                    <button onClick={() => { setFilterFrom(""); setFilterTo(""); setFilterStatus(""); setTimeout(fetchVisits, 10); }}
                        className="px-5 py-2 border border-gray-200 text-gray-500 rounded-lg font-bold text-sm hover:bg-gray-50 transition">
                        Clear
                    </button>
                </div>
            </div>

            {fetching ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-4xl mb-3">🌿</p>
                    <p className="font-bold text-gray-700">No visits found matching filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visits.map(visit => {
                        const v = visit;
                        const vid = String(v.visitId ?? v.id ?? "");
                        // Debug: verify id ↔ scheduledDate identity
                        console.log("[AllVisits] Rendering visit:", vid, v.scheduledDate);

                        return (
                            <div key={vid} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <p className="font-black text-gray-900">{String(v.clientName ?? "Unknown")}</p>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                                            {String(v.planTier ?? "—")}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{String(v.address ?? "—")}</p>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="text-xs text-gray-400">📅 {formatVisitDate(v.scheduledDate as string)}</span>
                                        <span className="text-xs font-bold text-gray-700">${v.pricePerVisit as number}/visit</span>

                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full
                                            ${v.completionStatus === "completed" ? "bg-green-100 text-green-700"
                                                : v.completionStatus === "skipped" ? "bg-gray-100 text-gray-500"
                                                    : "bg-blue-50 text-blue-600"}`}>
                                            {String(v.completionStatus)}
                                        </span>

                                        {v.chargeStatus === "failed" && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                                ⚠️ Charge Failed
                                            </span>
                                        )}
                                        {v.chargeStatus === "succeeded" && (
                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                ✓ Charged
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {!!v.stripeReceiptUrl && (
                                        <a href={String(v.stripeReceiptUrl)} target="_blank" rel="noopener noreferrer"
                                            className="px-3 py-2 text-xs font-bold text-[#1B4332] bg-[#1B4332]/10 hover:bg-[#1B4332]/20 rounded-lg transition">
                                            Receipt →
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
