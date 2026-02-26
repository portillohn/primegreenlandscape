export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * /api/settings — GET + POST
 *
 * GET:  Returns the active servicePlan for the authenticated user.
 * POST: Updates allowed plan fields (preferredDay, pause dates, status).
 *
 * Uses firebase-admin to bypass Firestore security rules.
 * Auth is enforced by verifying the Firebase ID token.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { rebuildSchedule } from "@/lib/ensureRollingVisits";

function serialize<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj, (_, v) => {
        if (v && typeof v === "object" && typeof v.toDate === "function") {
            return (v as { toDate: () => Date }).toDate().toISOString();
        }
        return v;
    }));
}

async function verifyToken(req: NextRequest): Promise<string> {
    const raw = req.headers.get("authorization") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
}

async function getActivePlan(uid: string) {
    // Try ownerUid first (canonical), fallback to customerUid for legacy docs
    let planDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    const byOwner = await adminDb.collection("servicePlans").where("ownerUid", "==", uid).get();
    planDoc = byOwner.docs.find(d => ["active", "paused"].includes(d.data().status)) ?? null;

    if (!planDoc) {
        const byCustomer = await adminDb.collection("servicePlans").where("customerUid", "==", uid).get();
        planDoc = byCustomer.docs.find(d => ["active", "paused"].includes(d.data().status)) ?? null;
    }

    return planDoc;
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    let uid: string;
    try {
        uid = await verifyToken(req);
    } catch {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const planDoc = await getActivePlan(uid);
        if (!planDoc) {
            return NextResponse.json({ ok: true, plan: null });
        }

        const planData = planDoc.data();

        // Fetch property for address display
        let property: Record<string, unknown> = {};
        if (planData.propertyId) {
            try {
                const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
                if (propSnap.exists) property = { id: propSnap.id, ...propSnap.data() };
            } catch { /* non-critical */ }
        }

        const plan = serialize({ ...planData, id: planDoc.id, property });
        return NextResponse.json({ ok: true, plan });

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const code = (err as { code?: string }).code ?? "unknown";
        console.error("[api/settings GET] 500", { uid, code, message });
        return NextResponse.json({ ok: false, error: message, code }, { status: 500 });
    }
}

// ── POST /api/settings ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    let uid: string;
    try {
        uid = await verifyToken(req);
    } catch {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { planId, preferredDay, pauseStart, pauseEnd } = body;

        if (!planId) {
            return NextResponse.json({ ok: false, error: "Missing planId" }, { status: 400 });
        }

        const planSnap = await adminDb.collection("servicePlans").doc(planId).get();
        if (!planSnap.exists) {
            return NextResponse.json({ ok: false, error: "Plan not found" }, { status: 404 });
        }

        const planData = planSnap.data()!;

        // Ownership check: ownerUid first, customerUid fallback for legacy
        const ownerUid = planData.ownerUid ?? planData.customerUid;
        if (ownerUid !== uid) {
            return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }

        // Only update allowed fields (matches Firestore rules)
        const updates: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (preferredDay) {
            updates.preferredDay = preferredDay;
            updates.routeDay = preferredDay; // Policy B: route follows preference
            updates.preferredServiceDay = preferredDay; // keep legacy in sync
        }

        if (pauseStart !== undefined) updates.seasonalPauseStart = pauseStart || null;
        if (pauseEnd !== undefined) updates.seasonalPauseEnd = pauseEnd || null;

        // Auto-set status based on pause dates
        if (pauseStart) {
            const today = new Date().toISOString().split("T")[0];
            const inPause = today >= pauseStart && (!pauseEnd || today <= pauseEnd);
            if (inPause) updates.status = "paused";
            else if (planData.status === "paused") updates.status = "active";
        } else if (pauseStart === null || pauseStart === "") {
            if (planData.status === "paused") updates.status = "active";
        }

        await adminDb.collection("servicePlans").doc(planId).update(updates);

        // Policy B: Rebuild schedule if the preferred day changed making routeDay out of sync with existing visits
        if (preferredDay) {
            await rebuildSchedule(planId);
        }

        return NextResponse.json({ ok: true });

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api/settings POST]", { uid, message });
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
