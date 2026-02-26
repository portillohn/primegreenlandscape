export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * POST /api/stripe/setup-intent
 * 
 * Creates a Stripe SetupIntent for saving a card without charging.
 * Requires authentication. Creates Stripe customer if missing.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { stripe } from "@/lib/stripe";


export async function POST(req: NextRequest) {
    // Auth required
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    try {
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data() ?? {};

        let customerId = userData.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userData.email,
                name: userData.displayName ?? userData.name,
                metadata: { uid },
            });
            customerId = customer.id;
            await userRef.update({ stripeCustomerId: customerId });
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ["card"],
            usage: "off_session",
        });

        return NextResponse.json({
            clientSecret: setupIntent.client_secret,
            customerId,
        });

    } catch (err: unknown) {
        const stripeErr = err as { message?: string };
        console.error("[/api/stripe/setup-intent]", err);
        return NextResponse.json({ error: stripeErr.message ?? "Setup intent failed" }, { status: 500 });
    }
}
