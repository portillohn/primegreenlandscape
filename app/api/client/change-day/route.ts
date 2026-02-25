/**
 * POST /api/client/change-day
 * Body: { planId: string, newDay: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" }
 *
 * Atomically:
 * 1. Verifies the caller owns the plan
 * 2. Updates preferredDay / routeDay / preferredServiceDay on the servicePlan
 * 3. Deletes all future "scheduled" visits (via rebuildSchedule — Approach A)
 * 4. Calls ensureRollingVisits to generate a fresh 8-visit window
 *
 * History is NEVER polluted — deleted visits leave no trace.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rebuildSchedule } from "@/lib/ensureRollingVisits";

const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
type Day = typeof VALID_DAYS[number];

async function verifyToken(req: NextRequest): Promise<string> {
    const raw = req.headers.get("authorization") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
}

export async function POST(req: NextRequest) {
    let uid: string;
    try {
        uid = await verifyToken(req);
    } catch {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let planId: string, newDay: Day;
    try {
        const body = await req.json();
        planId = body.planId;
        newDay = body.newDay;
        if (!planId || typeof planId !== "string") {
            return NextResponse.json({ ok: false, error: "Missing planId" }, { status: 400 });
        }
        if (!VALID_DAYS.includes(newDay)) {
            return NextResponse.json(
                { ok: false, error: `Invalid day. Must be one of: ${VALID_DAYS.join(", ")}` },
                { status: 400 }
            );
        }
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    try {
        // Load plan and verify ownership
        const planRef = adminDb.collection("servicePlans").doc(planId);
        const planSnap = await planRef.get();
        if (!planSnap.exists) {
            return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
        }

        const planData = planSnap.data()!;
        const ownerUid = planData.ownerUid ?? planData.customerUid;
        if (ownerUid !== uid) {
            return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }

        console.log(`[change-day] planId=${planId}, uid=${uid}, newDay=${newDay} (was: ${planData.preferredDay ?? planData.preferredServiceDay})`);

        // Step 1: Update the plan with the new preferred day
        // All three fields kept in sync (preferredDay = canonical, others = legacy aliases)
        await planRef.update({
            preferredDay: newDay,
            routeDay: newDay,
            preferredServiceDay: newDay,
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Step 2: Delete future scheduled visits + regenerate 8 on new day
        // rebuildSchedule uses Approach A: DELETE (never marks as skipped)
        // so history is never polluted with phantom skips.
        await rebuildSchedule(planId);

        console.log(`[change-day] Done — planId=${planId} now on ${newDay}`);
        return NextResponse.json({ ok: true, planId, newDay });

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[change-day] error:", { uid, planId, message });
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
