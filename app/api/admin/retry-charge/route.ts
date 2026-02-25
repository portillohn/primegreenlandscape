/**
 * POST /api/admin/retry-charge
 * 
 * Retries a failed charge for a completed visit.
 * Uses a fresh idempotency key (timestamp-based) to allow retry of previously failed attempt.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";


async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) throw new Error("Not admin");  // was ADMIN_UID — fixed
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

    if (visit.chargeStatus === "succeeded") {
        return NextResponse.json({ success: true, idempotent: true, chargeStatus: "succeeded" });
    }

    if (visit.chargeStatus !== "failed") {
        return NextResponse.json(
            { error: `Cannot retry: chargeStatus is "${visit.chargeStatus}", expected "failed"` },
            { status: 400 }
        );
    }

    // Look up user
    const customerUid = visit.customerUid;
    if (!customerUid) {
        return NextResponse.json({ error: "No customerUid on visit" }, { status: 400 });
    }

    // Get plan for amount
    const planSnap = await adminDb.collection("servicePlans").doc(visit.servicePlanId).get();
    if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const plan = planSnap.data()!;

    const userRef = adminDb.collection("users").doc(customerUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = userSnap.data()!;

    const paymentMethodId = user.defaultPaymentMethodId ?? user.paymentMethodId;
    if (!user.stripeCustomerId || !paymentMethodId) {
        return NextResponse.json({ error: "No payment method on file." }, { status: 400 });
    }

    const amountCents = Math.round((plan.pricePerVisit ?? visit.amount ?? 0) * 100);
    const retryKey = `retry_${visitId}_${Date.now()}`;

    try {
        const pi = await stripe.paymentIntents.create(
            {
                amount: amountCents,
                currency: "usd",
                customer: user.stripeCustomerId,
                payment_method: paymentMethodId,
                confirm: true,
                off_session: true,
                description: `Prime Green RETRY — ${plan.planTier ?? "Plan"} · ${visit.scheduledDate}`,
                receipt_email: user.email,
                metadata: { visitId, type: "retry" },
            },
            { idempotencyKey: retryKey }
        );

        await visitRef.update({
            chargeStatus: pi.status === "succeeded" ? "succeeded" : pi.status,
            charged: pi.status === "succeeded",
            amountCents,
            stripePaymentIntentId: pi.id,
            chargeError: null,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, chargeStatus: pi.status });

    } catch (err: unknown) {
        const stripeErr = err as { message?: string };
        await visitRef.update({ chargeError: stripeErr.message ?? "Unknown retry error" });
        return NextResponse.json(
            { error: "Retry failed: " + stripeErr.message },
            { status: 500 }
        );
    }
}
