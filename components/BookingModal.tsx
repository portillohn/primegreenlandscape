"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import {
    loginWithEmail,
    loginWithGoogle,
    registerWithEmail,
} from "@/lib/firebase";
import toast from "react-hot-toast";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const BOOKING_CTX_KEY = "pg_booking_ctx";

interface Props {
    plan: string;
    price: number;
    address: string;
    sqft: number;
    onClose: () => void;
}

const FEATURES: Record<string, string[]> = {
    essential: [
        "Weekly or biweekly lawn mowing",
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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Step = 1 | 2 | 3 | 4;
type AuthMode = "register" | "login";

interface BookingCtx {
    address: string;
    sqft: number;
    planTier: string;
    frequency: "weekly" | "biweekly";
    pricePerVisit: number;
    preferredDay: string;
    phone: string;
    notes: string;
}

function saveCtx(ctx: BookingCtx) {
    try { localStorage.setItem(BOOKING_CTX_KEY, JSON.stringify(ctx)); } catch { /**/ }
}
function clearCtx() {
    try { localStorage.removeItem(BOOKING_CTX_KEY); } catch { /**/ }
}

// ── Inner form (inside Stripe Elements) ──────────────────────────────────────
function BookingForm({ plan, price, address, sqft, onClose }: Props) {
    const stripe = useStripe();
    const elements = useElements();
    const { user } = useAuth();

    const planKey = plan.toLowerCase() as keyof typeof FEATURES;
    const features = FEATURES[planKey] ?? FEATURES.essential;

    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [cardReady, setCardReady] = useState(false);

    // Step 1
    const [frequency, setFrequency] = useState<"weekly" | "biweekly">("weekly");
    const effectivePrice = frequency === "biweekly" ? Math.round(price * 1.1) : price;

    // Step 2
    const [phone, setPhone] = useState("");
    const [day, setDay] = useState("");
    const [notes, setNotes] = useState("");

    // Step 3 — Auth
    const [authMode, setAuthMode] = useState<AuthMode>("register");
    const [authName, setAuthName] = useState("");
    const [authEmail, setAuthEmail] = useState("");
    const [authPass, setAuthPass] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    // Step 4 — SetupIntent
    const [setupError, setSetupError] = useState("");
    const [siClientSecret, setSiClientSecret] = useState("");
    const [siLoading, setSiLoading] = useState(false);

    // ── Persist context to localStorage when fields change ──────────────────
    useEffect(() => {
        if (!address || !day) return;
        saveCtx({
            address,
            sqft,
            planTier: planKey,
            frequency,
            pricePerVisit: effectivePrice,
            preferredDay: day,
            phone: phone.replace(/\D/g, ""),
            notes,
        });
    }, [address, sqft, planKey, frequency, effectivePrice, day, phone, notes]);

    // ── When user becomes authenticated on step 3, advance to step 4 ────────
    useEffect(() => {
        if (user && step === 3) {
            fetchSetupIntent();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, step]);

    // ── Fetch SetupIntent (with retry) ───────────────────────────────────────
    const fetchSetupIntent = useCallback(async (isRetry = false) => {
        if (!user) return;
        setSiLoading(true);
        setSetupError("");
        try {
            const token = await user.getIdToken(true);
            const res = await fetch("/api/stripe/setup-intent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Setup intent failed");
            }
            const data = await res.json();
            if (!data.clientSecret) throw new Error("No client secret returned");
            setSiClientSecret(data.clientSecret);
            setStep(4);
        } catch (err) {
            if (!isRetry) {
                // Retry once after 500ms (session may not be ready yet)
                setTimeout(() => fetchSetupIntent(true), 500);
            } else {
                setSetupError((err as Error).message ?? "Could not initialize payment.");
                setStep(4); // Still go to step 4 to show the error UI
            }
        } finally {
            setSiLoading(false);
        }
    }, [user]);

    const handlePhone = (val: string) => {
        const d = val.replace(/\D/g, "").slice(0, 10);
        const f =
            d.length >= 7 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
                : d.length >= 4 ? `(${d.slice(0, 3)}) ${d.slice(3)}`
                    : d.length >= 1 ? `(${d}` : d;
        setPhone(f);
    };

    const goNext = () => {
        if (step === 1) { setStep(2); return; }
        if (step === 2) {
            if (phone.replace(/\D/g, "").length < 10) {
                toast.error("Enter a valid 10-digit phone number.");
                return;
            }
            if (!day) { toast.error("Select a preferred mowing day."); return; }
            if (user) {
                fetchSetupIntent();
            } else {
                setStep(3);
            }
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            if (authMode === "register") {
                if (!authName.trim()) { toast.error("Enter your full name."); return; }
                await registerWithEmail(authEmail, authPass, authName.trim());
            } else {
                await loginWithEmail(authEmail, authPass);
            }
            // useEffect above handles advancing to step 4 via fetchSetupIntent
        } catch (err) {
            toast.error((err as Error).message ?? "Authentication failed.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setAuthLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            toast.error((err as Error).message ?? "Google sign-in failed.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!stripe || !elements || !user) return;
        if (!siClientSecret) {
            toast.error("Payment session not ready. Please retry.");
            return;
        }

        const cardEl = elements.getElement(CardElement);
        if (!cardEl) { toast.error("Card element missing."); return; }

        setLoading(true);
        try {
            // 1. Confirm card setup
            const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
                siClientSecret,
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
            if (stripeError) throw new Error(stripeError.message ?? "Card setup failed.");
            if (!setupIntent?.payment_method) throw new Error("No payment method returned.");

            const paymentMethodId = setupIntent.payment_method as string;

            // 2. Attach PM + save to Firestore (with auth token)
            const token = await user.getIdToken();
            const attachRes = await fetch("/api/stripe/attach-payment-method", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ paymentMethodId }),
            });
            if (!attachRes.ok) {
                const err = await attachRes.json();
                throw new Error(err.error ?? "Failed to save payment method.");
            }

            // 3. Confirm booking — verify defaultPaymentMethodId exists before proceeding
            const bookRes = await fetch("/api/booking/confirm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    uid: user.uid,
                    plan: planKey,
                    price: effectivePrice,
                    address: address.replace(/, USA$/i, "").trim(),
                    sqft,
                    phone: phone.replace(/\D/g, ""),
                    preferredDay: day,
                    frequency,
                    notes,
                }),
            });

            if (!bookRes.ok) {
                const err = await bookRes.json();
                throw new Error(err.error ?? "Booking confirmation failed.");
            }

            clearCtx();
            toast.success("🌿 Service activated! Welcome to Prime Green.");
            onClose();
            window.location.href = "/dashboard?booked=true";

        } catch (err) {
            console.error("[BookingModal confirm]", err);
            toast.error((err as Error).message ?? "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const STEP_LABELS: Record<Step, string> = {
        1: "Plan Review",
        2: "Contact Info",
        3: "Create Account",
        4: "Secure Payment",
    };

    const displayAddress = address.replace(/, USA$/i, "").trim();

    return (
        <div
            className="pointer-events-auto w-full sm:w-[480px]
                 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
                 flex flex-col max-h-[92dvh] sm:max-h-[88vh]"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />
                {/* Step dots */}
                <div className="flex items-center gap-1.5 mb-3">
                    {([1, 2, 3, 4] as Step[]).map(n => (
                        <div key={n} className="flex items-center gap-1.5">
                            <div className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center transition-all
                               ${step === n ? "bg-[#1B4332] text-white"
                                    : step > n ? "bg-[#52B788] text-white"
                                        : "bg-gray-100 text-gray-400"}`}>
                                {step > n ? "✓" : n}
                            </div>
                            {n < 4 && (
                                <div className={`h-0.5 w-6 rounded transition-all ${step > n ? "bg-[#52B788]" : "bg-gray-100"}`} />
                            )}
                        </div>
                    ))}
                    <span className="ml-2 text-xs text-gray-400 font-medium">{STEP_LABELS[step]}</span>
                </div>
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-gray-900">{STEP_LABELS[step]}</h2>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* STEP 1 — Plan summary */}
                {step === 1 && (
                    <>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-black uppercase tracking-widest text-[#1B4332] bg-[#1B4332]/10 px-3 py-1 rounded-full">
                                    {plan} Plan
                                </span>
                                <span className="text-2xl font-black text-gray-900">
                                    ${effectivePrice}
                                    <span className="text-sm font-semibold text-gray-400">/visit</span>
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-3">📍 {displayAddress} · {sqft.toLocaleString()} sq ft</p>

                            {/* Frequency */}
                            <div className="border-t border-gray-200 pt-3 mb-3">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Frequency</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["weekly", "biweekly"] as const).map(f => (
                                        <button key={f} type="button" onClick={() => setFrequency(f)}
                                            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all
                                                ${frequency === f
                                                    ? "border-[#1B4332] bg-[#1B4332] text-white"
                                                    : "border-gray-200 text-gray-600 bg-white hover:border-[#1B4332]/50"}`}>
                                            <div>{f === "weekly" ? "Weekly" : "Biweekly"}</div>
                                            <div className="text-xs font-normal opacity-75">{f === "weekly" ? "Every 7 days" : "Every 14 days"}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Features */}
                            <div className="border-t border-gray-200 pt-3 space-y-2">
                                {features.map(f => (
                                    <div key={f} className="flex items-start gap-2">
                                        <span className="text-[#1B4332] shrink-0 font-bold text-sm">✓</span>
                                        <span className="text-gray-600 text-sm leading-snug">{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-start gap-3 bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-xl px-4 py-3">
                            <span className="text-lg shrink-0">🛡️</span>
                            <p className="text-sm text-[#1B4332] leading-snug">
                                <strong>Card required to reserve your spot.</strong> You&apos;re charged <em>only after</em> each completed visit — never upfront. Cancel anytime.
                            </p>
                        </div>
                    </>
                )}

                {/* STEP 2 — Contact */}
                {step === 2 && (
                    <>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                Phone number <span className="text-red-500">*</span>
                            </label>
                            <input type="tel" value={phone} onChange={e => handlePhone(e.target.value)}
                                placeholder="(301) 555-0000" autoFocus
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900 text-base" />
                            <p className="text-xs text-gray-400 mt-1.5">We text you 1 hour before every visit.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Preferred mowing day <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {DAYS.map(d => (
                                    <button key={d} type="button" onClick={() => setDay(d)}
                                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                                          ${day === d ? "border-[#1B4332] bg-[#1B4332] text-white" : "border-gray-200 text-gray-600 hover:border-[#1B4332]/50"}`}>
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
                            </label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder="Gate code, dog in yard, areas to skip..."
                                rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900 text-sm resize-none" />
                        </div>
                    </>
                )}

                {/* STEP 3 — Auth Gate */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-xl px-4 py-3">
                            <p className="text-sm text-[#1B4332] leading-snug">
                                <strong>Almost there!</strong> Create a free account to save your card and manage your service.
                            </p>
                        </div>

                        {/* Google */}
                        <button type="button" onClick={handleGoogleAuth} disabled={authLoading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50">
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            </svg>
                            Continue with Google
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 font-medium">or</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
                            {(["register", "login"] as AuthMode[]).map(m => (
                                <button key={m} type="button" onClick={() => setAuthMode(m)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                                    {m === "register" ? "Create Account" : "Sign In"}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleAuth} className="space-y-3">
                            {authMode === "register" && (
                                <input type="text" value={authName} onChange={e => setAuthName(e.target.value)}
                                    placeholder="Full name" required
                                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900" />
                            )}
                            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                                placeholder="Email address" required
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900" />
                            <input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)}
                                placeholder="Password" required minLength={6}
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#1B4332] focus:outline-none text-gray-900" />
                            <button type="submit" disabled={authLoading}
                                className="w-full py-4 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] disabled:opacity-50 text-white font-black text-sm shadow-md transition-all">
                                {authLoading ? "Please wait…"
                                    : authMode === "register" ? "Create Account & Continue →"
                                        : "Sign In & Continue →"}
                            </button>
                        </form>
                    </div>
                )}

                {/* STEP 4 — Payment */}
                {step === 4 && (
                    <div className="space-y-4">
                        {/* SetupIntent loading */}
                        {siLoading && (
                            <div className="flex items-center gap-3 py-6 justify-center">
                                <div className="w-5 h-5 border-2 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-gray-500">Preparing secure payment…</span>
                            </div>
                        )}

                        {/* SetupIntent error with retry */}
                        {!siLoading && setupError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                                <p className="text-red-600 font-semibold text-sm mb-1">Payment session failed</p>
                                <p className="text-red-400 text-xs mb-4">{setupError}</p>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={() => fetchSetupIntent()}
                                        className="px-4 py-2 bg-[#1B4332] text-white rounded-lg text-sm font-bold hover:bg-[#2d6a4f] transition-colors">
                                        Retry
                                    </button>
                                    <button onClick={() => { setStep(3); setSiClientSecret(""); setSetupError(""); }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                                        Re-login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Card form */}
                        {!siLoading && !setupError && siClientSecret && (
                            <>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Card Information</label>
                                    <div className="px-4 py-3 rounded-xl border-2 border-gray-200 bg-white focus-within:border-[#1B4332] transition-colors">
                                        <CardElement
                                            options={{
                                                style: {
                                                    base: { fontSize: "16px", color: "#1f2937", "::placeholder": { color: "#9ca3af" } },
                                                    invalid: { color: "#ef4444" },
                                                }
                                            }}
                                            onChange={e => setCardReady(e.complete)}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-xl px-4 py-3">
                                    <span className="text-lg shrink-0">🔒</span>
                                    <p className="text-sm text-[#1B4332] leading-snug">
                                        Card saved securely via Stripe. <strong>Charged only after each completed visit</strong> — never upfront.
                                    </p>
                                </div>

                                {/* Order summary */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">{plan} Plan · {frequency}</span>
                                        <span className="font-bold text-gray-900">${effectivePrice}/visit</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Due today</span>
                                        <span className="font-bold text-green-600">$0.00</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                                        <span className="text-gray-500">First charge</span>
                                        <span className="font-medium text-gray-600">After first completed visit</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 pb-6 pt-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <div className="flex gap-3">
                    {step > 1 && step !== 3 && (
                        <button
                            onClick={() => {
                                if (step === 4) {
                                    // Go back to auth if no user, else step 2
                                    if (!user) { setStep(3); setSiClientSecret(""); setSetupError(""); }
                                    else setStep(2);
                                } else {
                                    setStep(s => (s - 1) as Step);
                                }
                            }}
                            disabled={loading}
                            className="flex-1 py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-50">
                            ← Back
                        </button>
                    )}

                    {step < 3 && (
                        <button onClick={goNext}
                            className="flex-1 py-4 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] text-white font-black text-sm shadow-md transition-all active:scale-[0.98]">
                            Continue →
                        </button>
                    )}

                    {step === 4 && !siLoading && !setupError && siClientSecret && (
                        <button onClick={handleConfirm}
                            disabled={loading || !cardReady}
                            className="flex-1 py-4 rounded-xl bg-[#1B4332] hover:bg-[#2d6a4f] disabled:opacity-50 text-white font-black text-sm shadow-md transition-all active:scale-[0.98]">
                            {loading ? "Processing…" : "Confirm & Activate Service →"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Portal wrapper ─────────────────────────────────────────────────────────────
export default function BookingModal(props: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
                onClick={props.onClose}
                aria-hidden="true"
            />
            <div
                className="fixed inset-0 z-[201] flex items-end sm:items-center justify-center sm:p-4"
                style={{ pointerEvents: "none" }}
            >
                <Elements stripe={stripePromise}>
                    <BookingForm {...props} />
                </Elements>
            </div>
        </>,
        document.body
    );
}
