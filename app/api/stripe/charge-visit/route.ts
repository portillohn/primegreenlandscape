import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { stripe } from "@/lib/stripe";


export async function POST(req: NextRequest) {
    // Verify admin token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await adminAuth.verifyIdToken(token);
        // Optionally check admin role here
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientUid, visitDate, notes } = await req.json();

    // Get client data
    const userDoc = await adminDb.collection("users").doc(clientUid).get();
    const userData = userDoc.data();

    if (!userData?.stripeCustomerId || !userData?.paymentMethodId) {
        return NextResponse.json(
            { error: "Client has no payment method on file." },
            { status: 400 }
        );
    }

    const amountCents = Math.round((userData.price ?? 0) * 100);

    // Charge the saved card
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        customer: userData.stripeCustomerId,
        payment_method: userData.paymentMethodId,
        confirm: true,
        off_session: true,
        description: `Prime Green — ${userData.plan} Plan visit on ${visitDate}`,
        metadata: {
            clientUid,
            visitDate,
            plan: userData.plan ?? "",
        },
        receipt_email: userData.email,
    });

    // Save visit + invoice to Firestore
    const visitRef = await adminDb
        .collection("users").doc(clientUid)
        .collection("visits").add({
            date: visitDate,
            status: "completed",
            amount: userData.price,
            plan: userData.plan,
            paymentIntentId: paymentIntent.id,
            paymentStatus: paymentIntent.status,
            notes: notes ?? "",
            createdAt: FieldValue.serverTimestamp(),
        });

    // Update total visits count
    await adminDb.collection("users").doc(clientUid).update({
        totalVisits: (userData.totalVisits ?? 0) + 1,
        lastVisit: visitDate,
    });

    return NextResponse.json({
        success: true,
        visitId: visitRef.id,
        charged: userData.price,
    });
}
