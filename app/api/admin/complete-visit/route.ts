/**
 * POST /api/admin/complete-visit
 * 
 * Marks a visit as completed and charges the client.
 * Idempotent: double-calling for an already-succeeded charge returns success without re-charging.
 * Uses visitId as Stripe idempotency key.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { ensureRollingVisits } from "@/lib/ensureRollingVisits";
import { stripe } from "@/lib/stripe";
import { timestampToNYDateString } from "@/lib/timeUtils";


async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

export async function POST(req: NextRequest) {
    try { await verifyAdmin(req); }
    catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await req.json();
    if (!visitId) {
        return NextResponse.json({ error: "Missing visitId" }, { status: 400 });
    }

    const visitRef = adminDb.collection("visits").doc(visitId);
    const visitSnap = await visitRef.get();
    if (!visitSnap.exists) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const visit = visitSnap.data()!;
    const safeDateStr = typeof visit.scheduledDate === "string"
        ? visit.scheduledDate
        : timestampToNYDateString(visit.scheduledDate);

    // ── IDEMPOTENCY: Already succeeded → return immediately ──────────────────
    if (visit.completionStatus === "completed" && visit.chargeStatus === "succeeded") {
        return NextResponse.json({
            success: true,
            idempotent: true,
            chargeStatus: "succeeded",
        });
    }

    // ── Look up plan → property → user ───────────────────────────────────────
    const planSnap = await adminDb.collection("servicePlans").doc(visit.servicePlanId).get();
    if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const plan = planSnap.data()!;

    const propSnap = await adminDb.collection("properties").doc(visit.propertyId ?? plan.propertyId).get();
    if (!propSnap.exists) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    const prop = propSnap.data()!;

    const customerUid = visit.customerUid ?? prop.customerUid;
    const userRef = adminDb.collection("users").doc(customerUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = userSnap.data()!;

    // Check for saved payment method
    const paymentMethodId = user.defaultPaymentMethodId ?? user.paymentMethodId;
    if (!user.stripeCustomerId || !paymentMethodId) {
        return NextResponse.json({ error: "No payment method on file." }, { status: 400 });
    }

    const amountCents = Math.round((plan.pricePerVisit ?? visit.amount ?? 0) * 100);

    // ── Charge via Stripe off-session PaymentIntent ───────────────────────────
    try {
        const pi = await stripe.paymentIntents.create(
            {
                amount: amountCents,
                currency: "usd",
                customer: user.stripeCustomerId,
                payment_method: paymentMethodId,
                confirm: true,
                off_session: true,
                description: `Prime Green — ${plan.planTier ?? "Plan"} · ${safeDateStr}`,
                receipt_email: user.email,
                metadata: {
                    visitId,
                    servicePlanId: visit.servicePlanId,
                    customerUid,
                    scheduledDate: safeDateStr,
                },
            },
            { idempotencyKey: `complete_${visitId}` }
        );

        // Update visit
        await visitRef.update({
            completionStatus: "completed",
            chargeStatus: pi.status === "succeeded" ? "succeeded" : pi.status,
            charged: pi.status === "succeeded",
            amountCents,
            stripePaymentIntentId: pi.id,
            completedAt: FieldValue.serverTimestamp(),
            completedByAdmin: true,
        });

        // Update user visit tracker
        await userRef.update({
            lastVisit: safeDateStr,
            totalVisits: FieldValue.increment(1),
        });

        // Maintain rolling 8 visits
        await ensureRollingVisits(visit.servicePlanId);

        return NextResponse.json({
            success: true,
            chargeStatus: pi.status,
            paymentIntentId: pi.id,
        });

    } catch (err: unknown) {
        const stripeErr = err as { message?: string };
        console.error("[/api/admin/complete-visit] Charge failed:", err);

        // Mark completed but failed — do NOT auto-retry
        await visitRef.update({
            completionStatus: "completed",
            chargeStatus: "failed",
            charged: false,
            chargeError: stripeErr.message ?? "Unknown error",
            completedAt: FieldValue.serverTimestamp(),
            completedByAdmin: true,
        });

        // Still roll visits forward so schedule continues
        await ensureRollingVisits(visit.servicePlanId);

        return NextResponse.json(
            { success: false, error: "Charge failed: " + stripeErr.message },
            { status: 500 }
        );
    }
}
