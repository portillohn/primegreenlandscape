/**
 * lib/stripe.ts — Lazy Stripe Server Instance
 *
 * ⚠️  SERVER-SIDE ONLY. Never import this in client components.
 *
 * Uses a lazy getter — Stripe is NOT initialized at module load time.
 * This prevents build-time crashes when STRIPE_SECRET_KEY is not set
 * during `npm run build` on Vercel.
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (_stripe) return _stripe;

    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
        throw new Error(
            "[lib/stripe] STRIPE_SECRET_KEY is not set. " +
            "Add it to .env.local (dev) or Vercel environment variables (prod)."
        );
    }
    if (key.startsWith("pk_")) {
        throw new Error(
            "[lib/stripe] STRIPE_SECRET_KEY starts with 'pk_' — " +
            "you are using the PUBLISHABLE key where the SECRET key is required."
        );
    }
    if (!key.startsWith("sk_")) {
        throw new Error(
            `[lib/stripe] STRIPE_SECRET_KEY has unexpected prefix. ` +
            `Expected 'sk_test_' or 'sk_live_'.`
        );
    }

    _stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" });
    return _stripe;
}

// Backward-compatible Proxy alias — existing callers using stripe.paymentIntents.create(...)
// continue to work unchanged.
export const stripe = new Proxy({} as Stripe, {
    get(_, prop) {
        const inst = getStripe();
        const val = (inst as any)[prop];
        return typeof val === "function" ? val.bind(inst) : val;
    },
});
