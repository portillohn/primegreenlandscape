"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    registerWithEmail,
    loginWithGoogle,
    createUserDocument,
} from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

function RegisterContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const bookingPlan = params.get("plan");
    const bookingPrice = params.get("price");
    const bookingAddress = params.get("address");
    const bookingSqft = params.get("sqft");
    const bookingPhone = params.get("phone");
    const bookingDay = params.get("day");
    const bookingNotes = params.get("notes");
    const collectCard = params.get("collectCard");
    const referralCode = params.get("referralCode");
    const hasBooking = !!bookingPlan;

    const saveBooking = async (uid: string) => {
        if (!hasBooking) return;
        try {
            const res = await fetch("/api/booking/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid,
                    plan: bookingPlan,
                    price: Number(bookingPrice),
                    address: bookingAddress,
                    sqft: Number(bookingSqft),
                    phone: bookingPhone,
                    preferredDay: bookingDay,
                    notes: bookingNotes ?? "",
                    status: "active",
                    referralCode: referralCode || undefined,
                }),
            });
            if (!res.ok) throw new Error("Failed booking step");
        } catch { /* non-critical */ }
    };

    const handleEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error("Please enter your name."); return; }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        setLoading(true);
        try {
            const cred = await registerWithEmail(email, password, name.trim());
            await saveBooking(cred.user.uid);
            toast.success("Welcome to Prime Green! 🌿");
            setTimeout(() => {
                let redirectUrl = "/dashboard";
                if (hasBooking) redirectUrl += "?booked=true";
                window.location.href = redirectUrl;
            }, 500);
        } catch (err: unknown) {
            const msg = (err as { code?: string })?.code === "auth/email-already-in-use"
                ? "An account with this email already exists."
                : "Registration failed. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        if (loading) return; // prevent double click
        setLoading(true);
        setError("");
        try {
            const cred = await loginWithGoogle();
            await createUserDocument(cred.user);
            await saveBooking(cred.user.uid);
            toast.success("Welcome! 🌿");
            setTimeout(() => {
                let redirectUrl = "/dashboard";
                if (hasBooking) redirectUrl += "?booked=true";
                window.location.href = redirectUrl;
            }, 500);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";

            // These are non-error user actions — ignore silently
            if (
                code === "auth/cancelled-popup-request" ||
                code === "auth/popup-closed-by-user"
            ) {
                setLoading(false);
                return; // user just closed the popup — not an error
            }

            let message = "Google sign-in failed. Please try again.";
            if (code === "auth/popup-blocked")
                message = "Popup blocked — please allow popups for this site.";
            if (code === "auth/unauthorized-domain")
                message = "Domain not authorized in Firebase Console.";
            if (code === "auth/operation-not-allowed")
                message = "Google sign-in is not enabled in Firebase.";

            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <h1 className="text-3xl font-black text-gray-900 mb-1">
                Create your account
            </h1>
            <p className="text-gray-500 text-sm mb-8">
                {hasBooking
                    ? "Almost there — create your account to confirm your booking."
                    : "Get your instant quote, then manage everything from your dashboard."
                }
            </p>

            <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3
                           border-2 border-gray-200 hover:border-gray-300
                           hover:bg-gray-50 rounded-xl py-3.5 px-4
                           text-gray-700 font-semibold text-sm
                           transition-all mb-5 disabled:opacity-60
                           disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4 text-gray-400"
                            fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12"
                                r="10" stroke="currentColor"
                                strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Connecting…</span>
                    </>
                ) : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 18 18">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                        </svg>
                        <span>Continue with Google</span>
                    </>
                )}
            </button>

            {error && (
                <div className="w-full bg-red-50 border border-red-200
                                rounded-xl px-4 py-3 mb-5">
                    <p className="text-red-600 text-sm font-medium">
                        ⚠️ {error}
                    </p>
                </div>
            )}

            <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-gray-400 text-xs font-medium">or</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleEmail} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold
                            text-gray-700 mb-1.5">Full name</label>
                    <input type="text" value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Smith" required
                        className="w-full px-4 py-3 rounded-xl border-2
                       border-gray-200 focus:border-[#1B4332]
                       focus:outline-none text-gray-900
                       placeholder:text-gray-400 transition-colors"/>
                </div>
                <div>
                    <label className="block text-sm font-semibold
                            text-gray-700 mb-1.5">Email address</label>
                    <input type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" required
                        className="w-full px-4 py-3 rounded-xl border-2
                       border-gray-200 focus:border-[#1B4332]
                       focus:outline-none text-gray-900
                       placeholder:text-gray-400 transition-colors"/>
                </div>
                <div>
                    <label className="block text-sm font-semibold
                            text-gray-700 mb-1.5">Password</label>
                    <input type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters" required minLength={8}
                        className="w-full px-4 py-3 rounded-xl border-2
                       border-gray-200 focus:border-[#1B4332]
                       focus:outline-none text-gray-900
                       placeholder:text-gray-400 transition-colors"/>
                </div>
                <button type="submit" disabled={loading}
                    className="w-full py-4 rounded-xl bg-[#1B4332]
                     hover:bg-[#2d6a4f] disabled:opacity-50
                     text-white font-black text-sm shadow-md
                     transition-all active:scale-[0.98] mt-2">
                    {loading ? "Creating account…" : "Create Account →"}
                </button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-4">
                By creating an account you agree to our{" "}
                <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
            <p className="text-sm text-gray-500 text-center mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-[#1B4332] font-bold hover:underline">
                    Sign in
                </Link>
            </p>
            {/* Mobile logo */}
            {/* Omitted as per the user's latest structural requirements stripping the logo completely from this nested component in favor of the layout providing it */}
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-md mx-auto flex items-center justify-center p-8">
                <div className="animate-spin w-8 h-8 border-4 border-[#1B4332] border-t-transparent rounded-full" />
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
