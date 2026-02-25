/**
 * lib/stripe.ts — Shared Stripe server instance.
 *
 * ⚠️  SERVER-SIDE ONLY. Never import this in client components.
 *      The secret key must never appear in the browser bundle.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
    throw new Error(
        "[lib/stripe.ts] STRIPE_SECRET_KEY is not set. " +
        "Add it to .env.local (dev) or Vercel environment variables (prod)."
    );
}

// Hard guard: publishable key accidentally used as secret key
if (key.startsWith("pk_")) {
    throw new Error(
        "[lib/stripe.ts] STRIPE_SECRET_KEY starts with 'pk_' — " +
        "you are using the PUBLISHABLE key where the SECRET key is required. " +
        "Check your .env.local and Vercel env vars."
    );
}

if (!key.startsWith("sk_")) {
    throw new Error(
        `[lib/stripe.ts] STRIPE_SECRET_KEY has unexpected prefix. ` +
        `Expected 'sk_test_' or 'sk_live_'.`
    );
}

export const stripe = new Stripe(key, {
    apiVersion: "2026-01-28.clover",
});
