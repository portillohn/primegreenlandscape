export const dynamic = "force-dynamic";
/**
 * POST /api/stripe/attach-payment-method
 *
 * Attaches a Stripe SetupIntent's resulting payment method to the customer,
 * sets it as the default, and persists card metadata to Firestore.
 *
 * Called from BookingModal after stripe.confirmCardSetup() succeeds.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) {
        return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });
    }

    // Guard: never accept a publishable key accidentally sent as a PM id
    if (String(paymentMethodId).startsWith("pk_")) {
        return NextResponse.json(
            { error: "Invalid paymentMethodId — received a Stripe publishable key." },
            { status: 400 }
        );
    }

    try {
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data() ?? {};

        // ── Ensure Stripe customer exists ─────────────────────────────────────
        let customerId: string = userData.stripeCustomerId ?? "";
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userData.email,
                name: userData.displayName ?? userData.name,
                metadata: { uid },
            });
            customerId = customer.id;
            await userRef.update({ stripeCustomerId: customerId });
        }

        // ── Attach PM to customer (safe to call even if already attached) ─────
        try {
            await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        } catch (attachErr: unknown) {
            const e = attachErr as { code?: string; message?: string };
            // Stripe throws "resource_already_attached" if PM is already on the customer — that's OK
            if (e?.code !== "resource_already_attached") {
                throw attachErr;
            }
        }

        // ── Set as default payment method ─────────────────────────────────────
        await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        // ── Retrieve card metadata ─────────────────────────────────────────────
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

        // ── Persist to Firestore ──────────────────────────────────────────────
        await userRef.update({
            stripeCustomerId: customerId,
            defaultPaymentMethodId: paymentMethodId,
            cardBrand: pm.card?.brand ?? null,
            cardLast4: pm.card?.last4 ?? null,
            cardExpMonth: pm.card?.exp_month ?? null,
            cardExpYear: pm.card?.exp_year ?? null,
        });

        return NextResponse.json({
            success: true,
            cardLast4: pm.card?.last4,
            cardBrand: pm.card?.brand,
        });

    } catch (err: unknown) {
        const stripeErr = err as { message?: string; code?: string };
        console.error("[/api/stripe/attach-payment-method]", stripeErr?.code, stripeErr?.message);
        return NextResponse.json(
            { error: stripeErr?.message ?? "Failed to attach payment method" },
            { status: 500 }
        );
    }
}
