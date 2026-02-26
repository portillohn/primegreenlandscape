/**
 * lib/pricingConfig.ts — Pricing Engine Configuration
 *
 * Central pricing constants. Edit here to update margins globally.
 *
 * Pipeline per visit price:
 *   rawRate → × operationalBuffer → absorb Stripe fees → floor → ceiling round
 */
export const PRICING_CONFIG = {
    // ── Stripe transaction fees ───────────────────────────────────────────────
    // Standard 2.9% + $0.30 per successful charge
    stripePercent: 0.029,
    stripeFixed: 0.30,

    // ── Operational buffer ────────────────────────────────────────────────────
    // Covers fuel, equipment depreciation, insurance, scheduling overhead
    // Applied BEFORE Stripe fee absorption
    operationalBuffer: 0.06,   // 6%

    // ── Minimum visit price ───────────────────────────────────────────────────
    // Prevents tiny lots from being unprofitable
    // After buffer + Stripe absorption, price is raised to at least this
    minVisitPrice: 42,         // $42 — floor in FINAL protected dollars

    // ── Base rates (cost per mowable sq ft, before any modifiers) ────────────
    // Montgomery County MD market rates, 2026
    rateEssential: 0.0026,    // Weekly mow + edge + mulch
    ratePremium: 0.0045,    // Essential + fertilization + spot weed control
    rateUltimate: 0.0062,    // Premium + aeration + overseeding + dedicated crew
} as const;

/**
 * protectPrice — apply the full margin-protection pipeline to a raw price.
 *
 * Steps:
 *  1. Add operational buffer  (×1.06)
 *  2. Absorb Stripe fees:     (buffered + $0.30) / (1 - 2.9%)
 *     This ensures we RECEIVE the buffered amount after Stripe deducts their cut.
 *  3. Enforce minimum floor   (≥ $42)
 *  4. Ceiling-round           (Math.ceil → clean whole dollar)
 *
 * Example ($50 raw):
 *   buffered        = $50 × 1.06   = $53.00
 *   withStripe      = ($53.00 + $0.30) / 0.971 = $54.89
 *   floored         = max($54.89, $42) = $54.89
 *   finalPrice      = ceil($54.89) = $55
 *
 * Example ($30 raw — small lot):
 *   buffered        = $30 × 1.06   = $31.80
 *   withStripe      = ($31.80 + $0.30) / 0.971 = $33.26
 *   floored         = max($33.26, $42) = $42   ← floor kicks in
 *   finalPrice      = $42
 */
export function protectPrice(raw: number): {
    final: number;
    debug: {
        raw: number;
        buffered: number;
        withStripe: number;
        floored: number;
        final: number;
        netAfterStripe: number;
    };
} {
    const { operationalBuffer, stripePercent, stripeFixed, minVisitPrice } = PRICING_CONFIG;

    const buffered = raw * (1 + operationalBuffer);
    const withStripe = (buffered + stripeFixed) / (1 - stripePercent);
    const floored = Math.max(withStripe, minVisitPrice);
    const final = Math.ceil(floored);

    // Expected net received after Stripe deducts (verification calc)
    const netAfterStripe = final * (1 - stripePercent) - stripeFixed;

    return {
        final,
        debug: {
            raw: parseFloat(raw.toFixed(2)),
            buffered: parseFloat(buffered.toFixed(2)),
            withStripe: parseFloat(withStripe.toFixed(2)),
            floored: parseFloat(floored.toFixed(2)),
            final,
            netAfterStripe: parseFloat(netAfterStripe.toFixed(2)),
        },
    };
}
