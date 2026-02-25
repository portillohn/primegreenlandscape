"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsPage() {
    const { user } = useAuth();

    const [activePlan, setActivePlan] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [preferredDay, setPreferredDay] = useState("");
    const [pauseStart, setPauseStart] = useState("");
    const [pauseEnd, setPauseEnd] = useState("");

    // ── Load plan via server API (firebase-admin, no permission errors) ────────
    const loadSettings = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/settings", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) {
                const detail = data.error ?? "Failed to load settings.";
                console.error("[Settings] load error:", res.status, data);
                setErrorMsg(detail);
                return;
            }

            const plan = data.plan ?? null;
            setActivePlan(plan);
            if (plan) {
                setPreferredDay(String(plan.preferredDay ?? plan.preferredServiceDay ?? "Mon"));
                setPauseStart(String(plan.seasonalPauseStart ?? ""));
                setPauseEnd(String(plan.seasonalPauseEnd ?? ""));
            }
        } catch (e) {
            console.error("[Settings] unexpected error:", e);
            setErrorMsg("Network error. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    // ── Save preferred day + pause dates ──────────────────────────────────────
    const handleSave = async () => {
        if (!user || !activePlan) return;
        setSaving(true);
        try {
            const token = await user.getIdToken();
            const currentDay = String(activePlan.preferredDay ?? activePlan.preferredServiceDay ?? "");
            const dayChanged = preferredDay && preferredDay !== currentDay;

            // ── 1. Preferred day change (dedicated endpoint — atomically deletes+rebuilds schedule) ─
            if (dayChanged) {
                const dayRes = await fetch("/api/client/change-day", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ planId: activePlan.id, newDay: preferredDay }),
                });
                const dayData = await dayRes.json().catch(() => ({}));
                if (!dayRes.ok || dayData.ok === false) {
                    toast.error(dayData.error ?? "Failed to update preferred day.");
                    setSaving(false);
                    return;
                }
            }

            // ── 2. Pause date changes (existing settings endpoint) ────────────────
            const pauseRes = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    planId: activePlan.id,
                    pauseStart: pauseStart || null,
                    pauseEnd: pauseEnd || null,
                }),
            });
            const pauseData = await pauseRes.json().catch(() => ({}));
            if (!pauseRes.ok || pauseData.ok === false) {
                toast.error(pauseData.error ?? "Failed to save pause dates.");
                setSaving(false);
                return;
            }

            toast.success(dayChanged ? "Preferred day updated — schedule rebuilt!" : "Settings saved!");
            await loadSettings();
        } catch {
            toast.error("An error occurred. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ── Cancel service ────────────────────────────────────────────────────────
    const handleCancel = async () => {
        if (!confirm(
            "Are you sure you want to cancel your service? This will stop all future visits. This cannot be undone."
        )) return;
        setCancelling(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch("/api/user/cancel-service", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ planId: activePlan?.id }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok !== false) {
                toast.success("Service cancelled. We hope to see you again!");
                setTimeout(() => { window.location.href = "/"; }, 1500);
            } else {
                toast.error(data.error ?? "Failed to cancel. Please contact us.");
            }
        } catch {
            toast.error("An error occurred. Please contact us directly.");
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-gray-100 rounded-xl w-1/3" />
                <div className="h-64 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your service preferences.</p>
            </div>

            {/* Error state */}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <p className="text-red-700 font-semibold text-sm">⚠️ {errorMsg}</p>
                    <button onClick={loadSettings}
                        className="mt-2 text-xs text-red-600 underline">
                        Retry
                    </button>
                </div>
            )}

            {/* No plan */}
            {!activePlan && !errorMsg && (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 mb-4">No active service plan found.</p>
                    <a href="/#quote"
                        className="px-6 py-3 bg-[#1B4332] text-white text-sm font-bold rounded-xl hover:bg-[#2d6a4f] transition-all">
                        Get your free quote →
                    </a>
                </div>
            )}

            {/* Settings form */}
            {activePlan && (
                <>
                    {/* Plan summary */}
                    <div className="bg-[#1B4332]/5 border border-[#1B4332]/20 rounded-2xl px-6 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[#1B4332]/60 font-bold uppercase tracking-widest">Active Plan</p>
                            <p className="font-black text-[#1B4332] text-lg capitalize">
                                {String(activePlan.planTier ?? activePlan.tier ?? "—")} ·{" "}
                                ${activePlan.pricePerVisit as number}/visit · {String(activePlan.frequency)}
                            </p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${activePlan.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {String(activePlan.status).toUpperCase()}
                        </span>
                    </div>

                    {/* Preferred Mowing Day */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">Preferred Mowing Day</h2>
                        <p className="text-sm text-gray-500">
                            Your actual service day may be adjusted to match your assigned route.
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {DAYS.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setPreferredDay(d)}
                                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                                        ${preferredDay === d
                                            ? "border-[#1B4332] bg-[#1B4332] text-white"
                                            : "border-gray-200 text-gray-600 bg-white hover:border-[#1B4332]/50"
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Seasonal Pause */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="font-bold text-gray-900">Seasonal Pause</h2>
                        <p className="text-sm text-gray-500">
                            Pause your service for vacations or seasonal breaks. No charges during pause.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Pause Start
                                </label>
                                <input
                                    type="date"
                                    value={pauseStart}
                                    onChange={e => setPauseStart(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Resume Date
                                </label>
                                <input
                                    type="date"
                                    value={pauseEnd}
                                    min={pauseStart}
                                    onChange={e => setPauseEnd(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900 text-sm"
                                />
                            </div>
                        </div>
                        {pauseStart && (
                            <button
                                type="button"
                                onClick={() => { setPauseStart(""); setPauseEnd(""); }}
                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                                Clear pause dates
                            </button>
                        )}
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] disabled:opacity-50 text-white font-black text-sm shadow-md transition-all"
                    >
                        {saving ? "Saving…" : "Save Settings"}
                    </button>

                    {/* Cancel Service */}
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                        <h2 className="font-bold text-red-800 mb-2">Cancel Service</h2>
                        <p className="text-sm text-red-600/80 mb-4">
                            This will stop all future visits. Any visits already completed will still be charged.
                            No contracts — cancel anytime.
                        </p>
                        <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="px-6 py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                            {cancelling ? "Processing…" : "Cancel My Service"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
