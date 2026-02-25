// ─── API ───────────────────────────────────────────────────────────────────────
export interface QuoteRequest {
    address: string; lat: number; lng: number; zip: string;
}
export interface QuoteSuccess {
    success: true; address: string; sqft: number; lotSize?: number;
    essential: number; premium: number; ultimate: number; mapImageUrl: string;
    breakdown?: {
        baseEssential: number;
        basePremium: number;
        baseUltimate: number;
        demandMultiplier: number;
        densityDiscount: number;
        outOfAreaSurcharge: number;
    };
}
export interface QuoteFailure {
    success: false;
    reason: "out_of_service" | "api_error" | "no_lot_data";
    message: string;
}
export type QuoteResponse = QuoteSuccess | QuoteFailure;

// ─── Visit-Based Data Model ────────────────────────────────────────────────────
export type PlanTier = "essential" | "premium" | "ultimate";
export type Frequency = "weekly" | "biweekly";
export type VisitCompletionStatus = "scheduled" | "completed" | "skipped";
export type ChargeStatus = "pending" | "succeeded" | "failed" | "not_charged";

export interface Visit {
    id: string;
    servicePlanId: string;
    scheduledDate: string;          // ISO date "YYYY-MM-DD"
    completionStatus: VisitCompletionStatus;
    chargeStatus: ChargeStatus;
    charged: boolean;
    amount?: number;
    stripePaymentIntentId?: string | null;
    stripeReceiptUrl?: string | null;
    completionTimestamp?: unknown;  // Firestore Timestamp
    weatherDelayed?: boolean;
    delayReason?: string | null;
    crewNotes?: string | null;
    createdAt?: unknown;
}

export interface Property {
    id: string;
    customerUid: string;
    address: string;
    zipcode: string;
    mowableSqft: number;
    notes?: string;
    gateCode?: string;
    routeGroupId?: string | null;
    createdAt?: unknown;
}

export interface ServicePlan {
    id: string;
    propertyId: string;
    planTier: PlanTier;
    frequency: Frequency;
    pricePerVisit: number;
    preferredServiceDay: string;      // "Mon", "Tue", etc.
    status: "active" | "paused" | "cancelled";
    seasonalPauseStart?: string | null;
    seasonalPauseEnd?: string | null;
    skipDates?: string[];
    startDate?: unknown;
    createdAt?: unknown;
}

// ─── User Profile ───────────────────────────────────────────────────────────────
export interface UserProfile {
    uid: string;
    displayName?: string;
    name?: string;
    email: string;
    phone?: string | null;
    stripeCustomerId?: string;
    paymentMethodId?: string;
    cardLast4?: string;
    cardBrand?: string;
    createdAt?: unknown;
}
