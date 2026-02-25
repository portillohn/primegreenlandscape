"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { formatVisitDate } from "@/lib/formatVisitDate";

type AdminVisit = Record<string, unknown>;


export default function AdminFailedPage() {
    const { user } = useAuth();
    const [visits, setVisits] = useState<AdminVisit[]>([]);
    const [fetching, setFetching] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchVisits = useCallback(async () => {
        if (!user) return;
        setFetching(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/visits?view=failed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setVisits(data.visits ?? []);
        } catch {
            toast.error("Failed to load visits.");
        } finally {
            setFetching(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchVisits();
    }, [user, fetchVisits]);

    const handleRetry = async (visitId: string) => {
        if (!user) return;
        setProcessing(visitId);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/retry-charge", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ visitId }),
            });
            const data = await res.json();
            if (data.success) toast.success("💳 Charge retried!");
            else toast.error(data.error ?? "Retry failed.");
            fetchVisits();
        } catch { toast.error("Failed."); }
        finally { setProcessing(null); }
    };

    const handleResolve = async (visitId: string) => {
        if (!user) return;
        setProcessing(visitId);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/visit-action", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ visitId, action: "resolve" }),
            });
            const data = await res.json();
            if (data.success) toast.success("✓ Marked resolved.");
            else toast.error(data.error ?? "Resolve failed.");
            fetchVisits();
        } catch { toast.error("Failed."); }
        finally { setProcessing(null); }
    };

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        ⚠️ Failed Charges
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Visits completed but payment failed.</p>
                </div>
                <div className="bg-red-100 text-red-600 font-black text-xl px-4 py-2 rounded-xl">
                    {fetching ? "..." : visits.length}
                </div>
            </div>

            {fetching ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-4xl mb-3">✅</p>
                    <p className="font-bold text-gray-700">No failed charges — you're all clear!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visits.map(visit => {
                        const v = visit;
                        const vid = v.id as string;
                        const isProcessing = processing === vid;

                        return (
                            <div key={vid} className="bg-white rounded-2xl border border-red-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <p className="font-black text-gray-900">{String(v.clientName ?? "Unknown")}</p>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#1B4332]/10 text-[#1B4332]">
                                            {String(v.planTier ?? "—")}
                                        </span>
                                        {!!v.cardLast4 && (
                                            <span className="text-xs font-bold text-green-600">💳 ····{String(v.cardLast4)}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">{String(v.address ?? "—")}</p>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                        <span className="text-xs text-gray-400">📅 {formatVisitDate(v.scheduledDate as string)}</span>
                                        <span className="text-xs font-bold text-gray-700">${v.pricePerVisit as number}/visit</span>
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                            ⚠️ Charge Failed
                                        </span>
                                    </div>
                                    {!!v.chargeError && (
                                        <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 p-2 rounded-lg italic">{String(v.chargeError)}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => handleRetry(vid)} disabled={isProcessing}
                                        className="px-3 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition disabled:opacity-50">
                                        {isProcessing ? "…" : "↩ Retry"}
                                    </button>
                                    <button onClick={() => handleResolve(vid)} disabled={isProcessing}
                                        className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                                        Resolve
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
