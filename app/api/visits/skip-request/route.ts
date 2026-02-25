export const dynamic = "force-dynamic";
/**
 * POST /api/visits/skip-request
 *
 * Allows a client to request a skip for an upcoming scheduled visit.
 * Writes ONLY the clientRequest field — does NOT change completionStatus.
 * Admin will approve the skip separately.
 *
 * Body: { visitId: string, reason?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getNYDayBounds, getNYMidnight, timestampToNYDateString } from "@/lib/timeUtils";

export async function POST(req: NextRequest) {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const raw = req.headers.get("authorization") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let uid: string;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    try {
        const { visitId, reason } = await req.json();
        if (!visitId) {
            return NextResponse.json({ ok: false, error: "Missing visitId" }, { status: 400 });
        }

        // Fetch visit and verify ownership
        const visitRef = adminDb.collection("visits").doc(visitId);
        const visitSnap = await visitRef.get();
        if (!visitSnap.exists) {
            return NextResponse.json({ ok: false, error: "Visit not found" }, { status: 404 });
        }

        const visitData = visitSnap.data()!;
        const ownerUid = visitData.ownerUid ?? visitData.customerUid;
        if (ownerUid !== uid) {
            return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }

        // Guard: only skip visits that are still scheduled
        if (visitData.completionStatus !== "scheduled") {
            return NextResponse.json(
                { ok: false, error: "Only scheduled visits can be skipped." },
                { status: 400 }
            );
        }

        // Guard: visit must be STRICTLY AFTER end of today in business timezone
        const todayBounds = getNYDayBounds(new Date());
        let visitDate: Date;

        if (typeof visitData.scheduledDate === "string") {
            visitDate = getNYMidnight(visitData.scheduledDate);
        } else {
            visitDate = visitData.scheduledDate.toDate();
        }

        if (visitDate.getTime() <= todayBounds.endTs.toDate().getTime()) {
            return NextResponse.json(
                { ok: false, error: "Cannot skip a past or today's visit." },
                { status: 400 }
            );
        }

        // Guard: only one pending request at a time (check new scalar field first, fall back to legacy)
        const alreadyPending = visitData.clientRequestStatus === "pending"
            || (!visitData.clientRequestStatus
                && visitData.clientRequest
                && (visitData.clientRequest as Record<string, unknown>).type === "skip");
        if (alreadyPending) {
            return NextResponse.json(
                { ok: false, error: "A skip request is already pending for this visit." },
                { status: 409 }
            );
        }

        // Write request fields — Admin SDK bypasses Firestore rules
        await visitRef.update({
            clientRequest: {
                type: "skip",
                reason: reason?.trim() || null,
                requestedAt: FieldValue.serverTimestamp(),
            },
            clientRequestStatus: "pending",   // indexed scalar — used by admin query
            clientRequestType: "skip",         // indexed scalar — used by admin query
            updatedAt: FieldValue.serverTimestamp(),
        });

        const scheduledDateForLog = typeof visitData.scheduledDate === "string"
            ? visitData.scheduledDate
            : timestampToNYDateString(visitData.scheduledDate);

        console.log("[skip-request] SUCCESS — visitId:", visitId, "| scheduledDate:", scheduledDateForLog, "| ownerUid:", uid);
        return NextResponse.json({ ok: true, visitId, scheduledDate: scheduledDateForLog });

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api/visits/skip-request]", { uid, message });
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
