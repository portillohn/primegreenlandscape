"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { formatVisitDate } from "@/lib/formatVisitDate";

type AdminVisit = Record<string, unknown>;


export default function AdminRequestsPage() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<AdminVisit[]>([]);
    const [fetching, setFetching] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        setFetching(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/requests", {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            const data = await res.json();

            const rawVisits = data.visits ?? [];
            const deduped = new Map<string, AdminVisit>();
            rawVisits.forEach((v: AdminVisit) => {
                if (v.id) deduped.set(String(v.id), v);
            });
            setRequests(Array.from(deduped.values()));
        } catch {
            toast.error("Failed to load requests.");
        } finally {
            setFetching(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchRequests();
    }, [user, fetchRequests]);

    const handleAction = async (visitId: string, action: "approve" | "deny") => {
        if (!user) return;
        const label = action === "approve" ? "approve this skip request" : "deny this skip request";
        if (!window.confirm(`Are you sure you want to ${label}?`)) return;

        setProcessing(visitId);
        try {
            const token = await user.getIdToken();
            // Use dedicated action routes — each guarantees it updates ONLY visits/{visitId}
            const endpoint = action === "approve"
                ? "/api/admin/requests/approve-skip"
                : "/api/admin/requests/deny";

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ visitId }),
                cache: "no-store",
            });
            const data = await res.json();
            if (data.success) {
                const dateLabel = data.scheduledDate ? ` (${data.scheduledDate})` : "";
                toast.success(`Request ${action === "approve" ? "approved ✓" : "denied ✕"}${dateLabel}`);
                // Optimistic removal so the list clears immediately
                setRequests(prev => prev.filter(r => {
                    const rid = String((r.visitId ?? r.id) ?? "");
                    return rid !== visitId;
                }));
                // Then sync with server
                fetchRequests();
            } else {
                toast.error(data.error ?? "Action failed.");
            }
        } catch {
            toast.error("Failed — check server logs.");
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">💬 Client Requests</h2>
                    <p className="text-sm text-gray-500 mt-1">Pending skip and reschedule requests from portal users.</p>
                </div>
                <div className="bg-amber-50 text-amber-600 font-black text-xl px-4 py-2 rounded-xl">
                    {fetching ? "..." : requests.length}
                </div>
            </div>

            {fetching ? (
                <div className="space-y-3">
                    {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-4xl mb-3">💬</p>
                    <p className="font-bold text-gray-700">No pending requests.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(visit => {
                        const v = visit;
                        // Use visitId (explicit alias set AFTER ...data spread in API)
                        // This is guaranteed to be the Firestore doc.id, never overwritten.
                        const vid = String(v.visitId ?? v.id ?? "");
                        const isProcessing = processing === vid;
                        const reqType = String(v.requestType ?? (v.clientRequest as Record<string, unknown> | undefined)?.type ?? "skip");
                        const reason = (v.requestReason ?? (v.clientRequest as Record<string, unknown> | undefined)?.reason) as string | null;

                        return (
                            <div key={vid} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
                                <div className="flex-1 min-w-0 pl-2">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                        <p className="font-black text-gray-900">{String(v.clientName ?? "Unknown")}</p>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">
                                            {reqType === "skip" ? "Skip Request" : reqType}
                                        </span>
                                    </div>

                                    {!!v.clientEmail && (
                                        <p className="text-xs text-gray-400 mb-1">{String(v.clientEmail)}</p>
                                    )}

                                    <p className="text-sm text-gray-700 mb-1">
                                        Visit scheduled for <span className="font-bold">{formatVisitDate(v.scheduledDate as string)}</span>
                                        {!!v.address && (
                                            <> · <span className="text-gray-500">{String(v.address).split(",")[0]}</span></>
                                        )}
                                    </p>

                                    {reason && (
                                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic border border-gray-100 mt-1">
                                            &ldquo;{String(reason)}&rdquo;
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                                    <button onClick={() => handleAction(vid, "deny")} disabled={isProcessing}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                                        Deny
                                    </button>
                                    <button onClick={() => handleAction(vid, "approve")} disabled={isProcessing}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition shadow-sm disabled:opacity-50">
                                        {isProcessing ? "…" : "Approve Skip"}
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
