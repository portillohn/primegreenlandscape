"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    CardElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

const stripePromise = loadStripe(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface Props {
    hasCard: boolean;
    cardLast4?: string;
    cardBrand?: string;
    onCardSaved?: () => void;
}

function PaymentForm({ hasCard, cardLast4, cardBrand, onCardSaved }: Props) {
    const stripe = useStripe();
    const elements = useElements();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [cardReady, setCardReady] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements || !user) return;

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) return;

        setLoading(true);

        try {
            // 1. Get SetupIntent
            const siRes = await fetch("/api/stripe/setup-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid }),
            });

            if (!siRes.ok) {
                throw new Error("Failed to get setup intent");
            }

            const siData = await siRes.json();

            // 2. Confirm card details
            const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
                siData.clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            name: user.displayName || user.email || "Client",
                            email: user.email || undefined,
                        },
                    },
                }
            );

            if (stripeError) {
                throw new Error(stripeError.message);
            }

            if (!setupIntent?.payment_method) {
                throw new Error("No payment method generated");
            }

            // 3. Save to user profile via API
            const pmRes = await fetch("/api/stripe/save-payment-method", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    paymentMethodId: setupIntent.payment_method,
                }),
            });

            if (!pmRes.ok) {
                throw new Error("Failed to save payment method");
            }

            toast.success("Card saved securely! 💳");

            // Force elements to clear
            cardElement.clear();
            if (onCardSaved) onCardSaved();

        } catch (err) {
            toast.error((err as Error).message || "Something went wrong saving the card.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {hasCard && cardLast4 && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-xl mb-4">
                    <div className="w-10 h-6 bg-white border border-gray-200 rounded shadow-sm flex items-center justify-center text-[10px] font-black uppercase text-gray-500">
                        {cardBrand || "Card"}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            •••• •••• •••• {cardLast4}
                        </p>
                        <p className="text-xs text-gray-500">
                            Default payment method
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
                <div className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus-within:bg-white focus-within:border-[#1B4332] focus-within:ring-1 focus-within:ring-[#1B4332] transition-all">
                    <CardElement
                        options={{
                            style: {
                                base: {
                                    fontSize: '15px',
                                    color: '#1f2937',
                                    '::placeholder': { color: '#9ca3af' },
                                    iconColor: '#1B4332',
                                },
                                invalid: { color: '#ef4444', iconColor: '#ef4444' },
                            }
                        }}
                        onChange={(e) => setCardReady(e.complete)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !cardReady}
                    className="w-full py-3 bg-[#1B4332] hover:bg-[#2d6a4f] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-sm"
                >
                    {loading ? "Saving secure card…" : hasCard ? "Update Card" : "Save Payment Method"}
                </button>
            </form>
        </div>
    );
}

export default function PaymentMethodCard(props: Props) {
    return (
        <Elements stripe={stripePromise}>
            <PaymentForm {...props} />
        </Elements>
    );
}
