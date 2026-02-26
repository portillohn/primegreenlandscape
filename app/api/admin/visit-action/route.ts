export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendRetentionEmail } from "@/lib/email";
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
    try {
        try {
            await verifyAdmin(req);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { visitId, action } = await req.json();

        if (!visitId || !action) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const visitRef = adminDb.collection("visits").doc(visitId);
        const visitSnap = await visitRef.get();
        if (!visitSnap.exists) {
            return NextResponse.json({ error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;
        const safeDateStr = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        // ── SKIP ──────────────────────────────────────────────────────────────
        if (action === "skip") {
            await visitRef.update({
                completionStatus: "skipped",
                chargeStatus: "not_required",  // canonical value (not_charged was wrong)
                skipSource: "admin_manual",  // distinguishes from client-requested skips
                updatedAt: FieldValue.serverTimestamp(),
            });
            // Maintain rolling 8
            await ensureRollingVisits(visitData.servicePlanId);
            return NextResponse.json({ success: true, status: "skipped" });
        }

        // ── FORCE (weather override) ───────────────────────────────────────
        if (action === "force") {
            await visitRef.update({ weatherDelayed: false, delayReason: null });
            return NextResponse.json({ success: true, status: "forced" });
        }

        // ── COMPLETE ─────────────────────────────────────────────────────────
        if (action === "complete") {
            if (visitData.completionStatus === "completed") {
                return NextResponse.json({ error: "Visit already marked complete." }, { status: 400 });
            }
            if (visitData.weatherDelayed) {
                return NextResponse.json({ error: "Cannot complete a weather-delayed visit without forcing first." }, { status: 400 });
            }

            // Relational lookups
            const planSnap = await adminDb.collection("servicePlans").doc(visitData.servicePlanId).get();
            if (!planSnap.exists) return NextResponse.json({ error: "Service Plan not found" }, { status: 404 });
            const planData = planSnap.data()!;

            const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
            if (!propSnap.exists) return NextResponse.json({ error: "Property not found" }, { status: 404 });
            const propData = propSnap.data()!;

            const userRef = adminDb.collection("users").doc(propData.customerUid);
            const userSnap = await userRef.get();
            if (!userSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
            const userData = userSnap.data()!;

            if (!userData.stripeCustomerId || !(userData.defaultPaymentMethodId ?? userData.paymentMethodId)) {
                return NextResponse.json({ error: "User lacks a saved payment method." }, { status: 400 });
            }

            const amountCents = Math.round((planData.pricePerVisit ?? 0) * 100);

            try {
                // Off-session charge — use visitId as idempotency key
                const pi = await stripe.paymentIntents.create(
                    {
                        amount: amountCents,
                        currency: "usd",
                        customer: userData.stripeCustomerId,
                        payment_method: userData.defaultPaymentMethodId ?? userData.paymentMethodId,
                        confirm: true,
                        off_session: true,
                        description: `Prime Green — ${planData.planTier ?? "Plan"} · ${safeDateStr}`,
                        receipt_email: userData.email,
                        metadata: {
                            visitId,
                            servicePlanId: visitData.servicePlanId,
                            clientUid: propData.customerUid,
                            scheduledDate: safeDateStr,
                        },
                    },
                    { idempotencyKey: `visit_${visitId}` }
                );

                // Update visit
                await visitRef.update({
                    completionStatus: "completed",
                    charged: true,
                    chargeStatus: pi.status === "succeeded" ? "succeeded" : pi.status,
                    amountCents: amountCents,
                    stripePaymentIntentId: pi.id,
                    completedAt: FieldValue.serverTimestamp(),
                    completionTimestamp: FieldValue.serverTimestamp(),
                });

                // Update user last-visit tracker
                await userRef.update({
                    lastVisit: safeDateStr,
                    totalVisits: FieldValue.increment(1),
                });

                // Maintain rolling 8 visits
                await ensureRollingVisits(visitData.servicePlanId);

                // Retention emails
                if (userData.email) {
                    try {
                        await sendRetentionEmail(userData.email, "visit_completed", {
                            visitDate: safeDateStr,
                        });
                    } catch (e) {
                        console.error("Retention email failed:", e);
                    }
                }

                return NextResponse.json({
                    success: true,
                    status: "completed",
                    paymentStatus: pi.status,
                });

            } catch (err: unknown) {
                const stripeErr = err as { message?: string };
                console.error("Charge failed:", err);

                // Mark completed but charge failed — do NOT auto-retry
                await visitRef.update({
                    completionStatus: "completed",
                    charged: false,
                    chargeStatus: "failed",
                    chargeError: stripeErr.message ?? "Unknown error",
                    completionTimestamp: FieldValue.serverTimestamp(),
                });

                // Still roll visits forward so schedule continues
                await ensureRollingVisits(visitData.servicePlanId);

                // Notify admin via email (if configured)
                if (userData.email) {
                    try {
                        await sendRetentionEmail(userData.email, "payment_failed", {
                            amount: amountCents / 100,
                        });
                    } catch { /* swallow */ }
                }

                return NextResponse.json(
                    { error: "Charge failed: " + stripeErr.message },
                    { status: 500 }
                );
            }
        }

        // ── RETRY CHARGE ──────────────────────────────────────────────────────
        if (action === "retry_charge") {
            if (visitData.chargeStatus !== "failed") {
                return NextResponse.json({ error: "Visit is not in failed charge state." }, { status: 400 });
            }

            const planSnap = await adminDb.collection("servicePlans").doc(visitData.servicePlanId).get();
            if (!planSnap.exists) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
            const planData = planSnap.data()!;

            const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
            const propData = propSnap.data()!;

            const userRef = adminDb.collection("users").doc(propData.customerUid);
            const userSnap = await userRef.get();
            const userData = userSnap.data()!;

            if (!userData.stripeCustomerId || !userData.paymentMethodId) {
                return NextResponse.json({ error: "No payment method on file." }, { status: 400 });
            }

            const amountCents = Math.round((planData.pricePerVisit ?? 0) * 100);

            try {
                // Use a different idempotency key for retry
                const pi = await stripe.paymentIntents.create(
                    {
                        amount: amountCents,
                        currency: "usd",
                        customer: userData.stripeCustomerId,
                        payment_method: userData.paymentMethodId,
                        confirm: true,
                        off_session: true,
                        description: `Prime Green RETRY — ${planData.planTier ?? "Plan"} · ${safeDateStr}`,
                        receipt_email: userData.email,
                        metadata: { visitId, type: "retry" },
                    },
                    { idempotencyKey: `visit_retry_${visitId}_${Date.now()}` }
                );

                await visitRef.update({
                    chargeStatus: pi.status === "succeeded" ? "succeeded" : pi.status,
                    charged: pi.status === "succeeded",
                    stripePaymentIntentId: pi.id,
                    stripeReceiptUrl: null,  // retrieved via Stripe dashboard if needed
                    chargeError: null,
                });

                return NextResponse.json({ success: true, paymentStatus: pi.status });
            } catch (err: unknown) {
                const stripeErr = err as { message?: string };
                return NextResponse.json({ error: "Retry failed: " + stripeErr.message }, { status: 500 });
            }
        }

        // ── MARK RESOLVED (manual) ─────────────────────────────────────────
        if (action === "resolve") {
            await visitRef.update({
                chargeStatus: "succeeded",
                charged: true,
                chargeError: null,
            });
            return NextResponse.json({ success: true, status: "resolved" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (err: unknown) {
        console.error("[/api/admin/visit-action]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
