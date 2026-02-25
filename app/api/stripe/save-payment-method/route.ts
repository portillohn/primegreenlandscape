export const dynamic = "force-dynamic";
/**
 * POST /api/stripe/save-payment-method
 *
 * DEPRECATED: Use POST /api/stripe/attach-payment-method instead.
 * This route had no auth verification and used legacy paymentMethodId field.
 *
 * Kept as a 410 stub for backwards compatibility.
 */
import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json(
        { error: "Deprecated. Use POST /api/stripe/attach-payment-method instead." },
        { status: 410 }
    );
}
