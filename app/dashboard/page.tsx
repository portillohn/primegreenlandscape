"use client";

import {
    useEffect, useState, useCallback, Suspense, useRef,
} from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    loadStripe, type Stripe as StripeJS,
    type StripeCardElement,
} from "@stripe/stripe-js";
import {
    Elements, CardElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import Link from "next/link";
import { formatVisitDate, daysUntilVisit } from "@/lib/formatVisitDate";

// ── Stripe (publishable key — client-safe) ───────────────────────────────────
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Plan label helpers ───────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
    essential: "Essential",
    premium: "Premium",
    ultimate: "Ultimate",
};
const CHARGE_BADGE: Record<string, string> = {
    succeeded: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    not_charged: "bg-gray-100 text-gray-500",
    none: "bg-gray-100 text-gray-400",
};

// ── Update-Card modal (inner form, inside Stripe <Elements>) ─────────────────
function UpdateCardForm({
    onSuccess,
    onClose,
}: { onSuccess: () => void; onClose: () => void }) {
    const { user } = useAuth();
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements || !user) return;
        setBusy(true);

        try {
            // 1. Get SetupIntent client_secret from server
            const token = await user.getIdToken();
            const siRes = await fetch("/api/stripe/setup-intent", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const siData = await siRes.json();
            if (!siRes.ok || !siData.clientSecret) {
                throw new Error(siData.error ?? "Failed to create setup session.");
            }

            // 2. Confirm card via Stripe Elements
            const cardEl = elements.getElement(CardElement) as StripeCardElement;
            const { error: stripeErr, setupIntent } = await stripe.confirmCardSetup(
                siData.clientSecret,
                {
                    payment_method: {
                        card: cardEl,
                        billing_details: {
                            name: user.displayName ?? user.email ?? "Client",
                            email: user.email ?? undefined,
                        },
                    },
                }
            );
            if (stripeErr) throw new Error(stripeErr.message ?? "Card setup failed.");
            if (!setupIntent?.payment_method) throw new Error("No payment method returned.");

            // 3. Attach to Stripe customer + save metadata server-side
            const pmId = setupIntent.payment_method as string;
            const attachRes = await fetch("/api/stripe/attach-payment-method", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ paymentMethodId: pmId }),
            });
            const attachData = await attachRes.json();
            if (!attachRes.ok) throw new Error(attachData.error ?? "Failed to save card.");

            toast.success(`Card updated! ${attachData.cardBrand?.toUpperCase() ?? ""} ····${attachData.cardLast4 ?? ""}`);
            onSuccess();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An error occurred.";
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50">
                <CardElement options={{
                    style: {
                        base: {
                            fontSize: "15px",
                            color: "#1a1a1a",
                            fontFamily: "'Inter', sans-serif",
                            "::placeholder": { color: "#9ca3af" },
                        },
                        invalid: { color: "#dc2626" },
                    },
                }} />
            </div>
            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={busy || !stripe}
                    className="flex-1 py-3 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] text-white font-bold text-sm disabled:opacity-50 transition-all"
                >
                    {busy ? "Saving…" : "Save New Card"}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// ── Skip reason modal ─────────────────────────────────────────────────────────
function SkipModal({
    visit,
    onClose,
    onDone,
}: {
    visit: Record<string, unknown>;
    onClose: () => void;
    onDone: () => void;
}) {
    const { user } = useAuth();
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    // Format the scheduledDate using NY timezone (never rely on local system timezone)
    const scheduledDateStr = visit.scheduledDate as string; // "YYYY-MM-DD" from API
    const displayDate = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(scheduledDateStr + "T12:00:00"));

    // visitId: always the real Firestore doc.id (explicit alias set after ...data spread in API)
    const visitId = String(visit.visitId ?? visit.id ?? "");

    const handleSkip = async () => {
        if (!user) return;
        if (!visitId) {
            toast.error("Cannot identify visit — please refresh.");
            return;
        }
        setBusy(true);

        // Debug log: verify the exact doc being requested
        console.log(`[SkipModal] Submitting skip — visitId=${visitId}, scheduledDate=${scheduledDateStr}`);

        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/visits/skip-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ visitId, reason }),
            });
            const data = await res.json();
            if (!res.ok || data.ok === false) throw new Error(data.error ?? "Failed.");
            toast.success("Skip request submitted. Admin will confirm.");
            onDone();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error occurred.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <h3 className="font-black text-gray-900 text-lg">Skip this visit?</h3>
                <p className="text-sm text-gray-500">
                    <strong>{displayDate}</strong> — Skip request will be sent
                    to the team for approval.
                </p>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Reason <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Vacation, bad weather…"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-sm"
                    />
                </div>
                <div className="flex gap-3 pt-1">
                    <button
                        onClick={handleSkip}
                        disabled={busy || !visitId}
                        className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm disabled:opacity-50 transition-all"
                    >
                        {busy ? "Submitting…" : "Request Skip"}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function DashboardContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const justBooked = searchParams.get("booked") === "true";

    const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
    const [activePlan, setActivePlan] = useState<Record<string, unknown> | null>(null);
    const [upcomingVisits, setUpcomingVisits] = useState<Record<string, unknown>[]>([]);
    const [completedVisits, setCompletedVisits] = useState<Record<string, unknown>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Feature state
    const [showUpdateCard, setShowUpdateCard] = useState(false);
    const [skipTarget, setSkipTarget] = useState<Record<string, unknown> | null>(null);
    const [historyVisits, setHistoryVisits] = useState<Record<string, unknown>[]>([]);

    const today = new Date().toISOString().split("T")[0];

    const loadDashboard = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/dashboard/data", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) {
                setError(data.error ?? "Failed to load dashboard.");
                return;
            }
            setProfile(data.profile ?? null);
            setActivePlan(data.plan ?? null);
            setUpcomingVisits(data.upcomingVisits ?? []);
            setCompletedVisits(data.completedVisits ?? []);
            // historyVisits includes both completed + skipped
            setHistoryVisits(data.historyVisits ?? data.completedVisits ?? []);
        } catch {
            setError("Network error. Please refresh.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    // Refresh when user returns to this tab (catches admin-approved skips while tab was hidden)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                loadDashboard();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [loadDashboard]);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-100 rounded-xl w-1/3" />
            <div className="h-40 bg-gray-100 rounded-2xl" />
            <div className="h-52 bg-gray-100 rounded-2xl" />
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-700 font-bold mb-2">⚠️ {error}</p>
            <button onClick={loadDashboard}
                className="mt-2 px-4 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-bold">
                Retry
            </button>
        </div>
    );

    const nextVisit = upcomingVisits[0];
    const property = activePlan?.property as Record<string, unknown> | undefined;

    return (
        <div className="space-y-8">
            {/* Skip modal */}
            {skipTarget && (
                <SkipModal
                    visit={skipTarget}
                    onClose={() => setSkipTarget(null)}
                    onDone={() => { setSkipTarget(null); loadDashboard(); }}
                />
            )}

            {/* Welcome banner */}
            {justBooked && (
                <div className="bg-[#52B788]/10 border border-[#52B788]/30 rounded-2xl p-5 flex items-center gap-4">
                    <span className="text-3xl">🎉</span>
                    <div>
                        <p className="font-black text-[#1B4332] text-base">
                            Welcome to Prime Green! Your service is now scheduled.
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            We&apos;ll contact you before your first visit. You&apos;ll be charged only after each completed visit.
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900">
                    Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
                    {user?.displayName?.split(" ")[0] ?? "there"} 👋
                </h1>
                <p className="text-gray-500 text-sm mt-1">Your lawn care dashboard.</p>
            </div>

            {/* No plan CTA */}
            {!activePlan && (
                <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-[#1B4332]">No active service plan</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            Get your instant satellite quote and start service in under 60 seconds.
                        </p>
                    </div>
                    <Link href="/#quote"
                        className="shrink-0 px-6 py-3 bg-[#1B4332] text-white text-sm font-bold rounded-xl hover:bg-[#2d6a4f] transition-all shadow-sm">
                        Get your free quote →
                    </Link>
                </div>
            )}

            {/* ── SECTION A — Active Plan ──────────────────────────────────── */}
            {activePlan && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-[#1B4332] px-6 py-5 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Active Plan</p>
                                <h2 className="text-2xl font-black">
                                    {PLAN_LABELS[String(activePlan.planTier ?? activePlan.tier)] ?? String(activePlan.planTier ?? activePlan.tier)} Plan
                                </h2>
                                <p className="text-white/80 text-sm mt-1">
                                    ${activePlan.pricePerVisit as number}/visit · {String(activePlan.frequency)}
                                </p>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full mt-1 ${activePlan.status === "active" ? "bg-[#52B788]/30 text-[#b7e4c7]" : "bg-yellow-400/30 text-yellow-200"}`}>
                                ● {String(activePlan.status).toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-1">Next Visit</p>
                            <p className="font-bold text-gray-900">
                                {nextVisit ? formatVisitDate(nextVisit.scheduledDate as string) : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-1">Route Day</p>
                            <p className="font-bold text-gray-900">
                                {String(activePlan.preferredDay ?? activePlan.preferredServiceDay ?? "—")}s
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium mb-1">Address</p>
                            <p className="font-bold text-gray-900 truncate text-sm">
                                {(property?.address as string)?.split(",")[0] ?? "—"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SECTION B — Upcoming Visits ──────────────────────────────── */}
            {activePlan && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>📅</span> Upcoming Visits
                    </h2>
                    {upcomingVisits.length === 0 ? (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-red-700 font-bold mb-1">Scheduling pending.</p>
                            <p className="text-red-600 text-sm">Please contact support.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {upcomingVisits.map(visit => {
                                const dateStr = visit.scheduledDate as string;
                                const days = daysUntilVisit(dateStr);
                                const isFuture = dateStr > today;
                                // Debug: verify id ↔ scheduledDate identity
                                console.log("[Dashboard] Rendering upcoming visit:", visit.id, dateStr);
                                const hasSkipRequest = !!(visit.clientRequestStatus === "pending"
                                    || (!visit.clientRequestStatus
                                        && visit.clientRequest
                                        && (visit.clientRequest as Record<string, unknown>).type === "skip"));
                                return (
                                    <li key={visit.id as string}
                                        className="flex items-center justify-between py-3.5 gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{formatVisitDate(dateStr)}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {hasSkipRequest ? (
                                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                                    ⏳ Skip Requested
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-600">
                                                    Scheduled
                                                </span>
                                            )}
                                            {isFuture && !hasSkipRequest && (
                                                <button
                                                    onClick={() => setSkipTarget(visit)}
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all font-medium"
                                                >
                                                    Skip
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* ── SECTION C — Payment Method ───────────────────────────────── */}
            {activePlan && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>💳</span> Payment Method
                    </h2>
                    {showUpdateCard ? (
                        <Elements stripe={stripePromise}>
                            <UpdateCardForm
                                onSuccess={() => { setShowUpdateCard(false); loadDashboard(); }}
                                onClose={() => setShowUpdateCard(false)}
                            />
                        </Elements>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div>
                                {profile && (profile.cardLast4 || profile.defaultPaymentMethodId) ? (
                                    <>
                                        <p className="font-semibold text-gray-800 text-sm capitalize">
                                            {profile.cardBrand ? String(profile.cardBrand) : "Card"}{" "}
                                            <span className="font-mono tracking-widest">····{profile.cardLast4 as string}</span>
                                        </p>
                                        {profile.cardExpMonth && profile.cardExpYear && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Expires {String(profile.cardExpMonth)}/{String(profile.cardExpYear).slice(-2)}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400">No card on file.</p>
                                )}
                            </div>
                            <button
                                onClick={() => setShowUpdateCard(true)}
                                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-bold hover:border-[#1B4332]/40 hover:bg-[#1B4332]/5 transition-all"
                            >
                                Update Card
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── SECTION D — Visit History ─────────────────────────────────── */}
            {activePlan && historyVisits.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <span>🧾</span> Visit &amp; Payment History
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                                    <th className="px-6 py-3 text-right font-semibold">Amount</th>
                                    <th className="px-6 py-3 text-center font-semibold">Charge</th>
                                    <th className="px-6 py-3 text-center font-semibold">Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyVisits.map(visit => {
                                    const isSkipped = visit.completionStatus === "skipped";
                                    const cs = isSkipped ? "not_required" : ((visit.chargeStatus as string) ?? "pending");
                                    const receipt = visit.stripeReceiptUrl as string | null;
                                    const amount = isSkipped ? 0 : Number(visit.amount ?? activePlan.pricePerVisit ?? 0);

                                    const chargeBadgeClass = isSkipped
                                        ? "bg-amber-50 text-amber-600"
                                        : (CHARGE_BADGE[cs] ?? "bg-gray-100 text-gray-500");
                                    const chargeLabel = isSkipped
                                        ? "Not charged"
                                        : cs === "succeeded" ? "Charged"
                                            : cs === "failed" ? "Failed"
                                                : cs === "none" ? "—"
                                                    : "Pending";

                                    return (
                                        <tr key={visit.id as string}
                                            className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    {formatVisitDate(visit.scheduledDate as string)}
                                                    {isSkipped && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                                                            Skipped
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                ${amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${chargeBadgeClass}`}>
                                                    {chargeLabel}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isSkipped && receipt
                                                    ? <a href={receipt} target="_blank" rel="noopener noreferrer"
                                                        className="text-[#1B4332] font-semibold hover:underline text-xs">View →</a>
                                                    : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── SECTION E — Support ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span>💬</span> Need help?
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Email us at{" "}
                    <a href="mailto:contact@primegreenlandscape.com"
                        className="text-[#1B4332] font-semibold hover:underline">
                        contact@primegreenlandscape.com
                    </a>
                </p>
                <button
                    onClick={() => {
                        window.location.href =
                            "mailto:contact@primegreenlandscape.com?subject=Prime%20Green%20Support%20Request";
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] text-white text-sm font-bold transition-all shadow-sm"
                >
                    Send Support Email
                </button>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-gray-100 rounded-xl w-1/3" />
                <div className="h-40 bg-gray-100 rounded-2xl" />
                <div className="h-52 bg-gray-100 rounded-2xl" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
