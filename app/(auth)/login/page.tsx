"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginWithEmail, loginWithGoogle, createUserDocument } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Email login
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please fill out all fields.");
            return;
        }
        setLoading(true);
        try {
            await loginWithEmail(email, password);
            toast.success("Welcome back! 🌿");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);
        } catch {
            toast.error("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    // Google login
    const handleGoogle = async () => {
        if (loading) return; // prevent double click
        setLoading(true);
        setError("");
        try {
            const cred = await loginWithGoogle();
            // Even if they're logging in, we ensure the document exists
            await createUserDocument(cred.user);
            toast.success("Welcome back! 🌿");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 500);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? "";

            // Silent — user just closed or double-clicked
            if (
                code === "auth/cancelled-popup-request" ||
                code === "auth/popup-closed-by-user"
            ) {
                setLoading(false);
                return;
            }

            let message = "Google sign-in failed. Please try again.";
            if (code === "auth/popup-blocked")
                message = "Popup blocked — please allow popups for this site.";
            if (code === "auth/unauthorized-domain")
                message = "Domain not authorized in Firebase Console.";

            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <h1 className="text-3xl font-black text-gray-900 mb-1">
                Welcome back
            </h1>
            <p className="text-gray-500 text-sm mb-8">
                Manage your schedule, invoices, and services from your dashboard.
            </p>

            {/* Google button */}
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

            <form onSubmit={handleEmailLogin} className="space-y-4">

                <div>
                    <label className="block text-sm font-semibold
                            text-gray-700 mb-1.5">
                        Email address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full px-4 py-3 rounded-xl border-2
                       border-gray-200 focus:border-[#1B4332]
                       focus:outline-none text-gray-900
                       placeholder:text-gray-400 transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between">
                        <span>Password</span>
                        <span className="text-gray-400 hover:text-gray-600 font-normal cursor-pointer text-xs">Forgot password?</span>
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        className="w-full px-4 py-3 rounded-xl border-2
                       border-gray-200 focus:border-[#1B4332]
                       focus:outline-none text-gray-900
                       placeholder:text-gray-400 transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-[#1B4332]
                     hover:bg-[#2d6a4f] disabled:opacity-50
                     text-white font-black text-sm
                     shadow-md transition-all
                     active:scale-[0.98] mt-2"
                >
                    {loading ? "Signing in…" : "Sign In →"}
                </button>
            </form>

            <p className="text-sm text-gray-500 text-center mt-6">
                New to Prime Green?{" "}
                <Link href="/register"
                    className="text-[#1B4332] font-bold hover:underline">
                    Create an account
                </Link>
            </p>
            {/* Mobile logo */}
            {/* Omitted as per the user's latest structural requirements stripping the logo completely from this nested component in favor of the layout providing it */}
        </div>
    );
}
