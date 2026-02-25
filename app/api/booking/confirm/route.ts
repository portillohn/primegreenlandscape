export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { sendRetentionEmail } from "@/lib/email";
import { ensureRollingVisits } from "@/lib/ensureRollingVisits";

export async function POST(req: NextRequest) {
    // ── Auth via Authorization header ─────────────────────────────────────────
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let uid: string;
    let decodedToken: any;
    try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
        decodedToken = decoded;
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            plan,
            price,
            address,
            sqft,
            phone,
            preferredDay,
            frequency,
            notes,
        } = body;

        if (!plan || !address || !preferredDay || !price) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // ── GATE: Card must already be saved ─────────────────────────────────
        const userRef = adminDb.collection("users").doc(uid);
        const userSnap = await userRef.get();
        const userData = userSnap.data() ?? {};

        if (!userData.defaultPaymentMethodId) {
            return NextResponse.json(
                { error: "No payment method on file. Card must be saved before booking." },
                { status: 400 }
            );
        }

        // ── Guard: prevent duplicate active plan ─────────────────────────────
        const existingPlanSnap = await adminDb
            .collection("servicePlans")
            .where("ownerUid", "==", uid)
            .where("status", "in", ["active", "paused"])
            .limit(1)
            .get();

        if (!existingPlanSnap.empty) {
            return NextResponse.json(
                { error: "You already have an active service plan." },
                { status: 409 }
            );
        }

        // ── Phone + routing ───────────────────────────────────────────────────

        const zipMatch = address.match(/\b\d{5}\b/);
        const zipCode = zipMatch ? zipMatch[0] : null;
        let routeGroupId: string | null = null;

        if (zipCode) {
            const routesQuery = await adminDb.collection("routeGroups")
                .where("zipcodeCluster", "array-contains", zipCode).limit(1).get();
            if (!routesQuery.empty) routeGroupId = routesQuery.docs[0].id;
        }

        const batch = adminDb.batch();

        batch.set(userRef, {
            uid,
            role: userData.role || "client",
            email: userData.email || decodedToken.email || "",
            fullName: userData.fullName || userData.displayName || decodedToken.name || "",
            phone: phone || userData.phone || null,
            createdAt: userData.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        // ── 1. Create Property ────────────────────────────────────────────────
        // ownerUid is REQUIRED for Firestore rules to allow client reads
        const propRef = adminDb.collection("properties").doc();
        batch.set(propRef, {
            ownerUid: uid,          // ← required by Firestore rules
            customerUid: uid,       // ← legacy alias for server-only queries
            address,
            zipcode: zipCode ?? "",
            mowableSqft: Number(sqft) || 0,
            gateCode: "",
            notes: notes ?? "",
            routeGroupId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // ── 2. Create Service Plan ────────────────────────────────────────────
        const planRef = adminDb.collection("servicePlans").doc();
        const resolvedFrequency = frequency === "biweekly" ? "biweekly" : "weekly";
        batch.set(planRef, {
            ownerUid: uid,          // ← required by Firestore rules
            customerUid: uid,       // ← legacy alias
            propertyId: propRef.id,
            serviceType: "lawn_mowing",
            planTier: plan,
            tier: plan,
            frequency: resolvedFrequency,
            pricePerVisit: Number(price) || 0,
            startDate: FieldValue.serverTimestamp(),
            preferredDay,
            preferredServiceDay: preferredDay,
            seasonalPauseStart: null,
            seasonalPauseEnd: null,
            skipDates: [],
            status: "active",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // ── 3. Increment route capacity ───────────────────────────────────────
        if (routeGroupId) {
            batch.update(adminDb.collection("routeGroups").doc(routeGroupId), {
                activePlansCount: FieldValue.increment(1),
            });
        }

        await batch.commit();

        // ── 4. Generate rolling 8 visits (deterministic IDs, ownerUid written) ─
        await ensureRollingVisits(planRef.id);

        // ── 5. Welcome email ──────────────────────────────────────────────────
        try {
            if (userData.email) {
                await sendRetentionEmail(userData.email, "welcome", {
                    planName: plan,
                    propertyAddress: address,
                });
            }
        } catch (e) {
            console.error("[booking/confirm] welcome email failed:", e);
        }

        return NextResponse.json({
            success: true,
            planId: planRef.id,
            propertyId: propRef.id,
            routeAssigned: !!routeGroupId,
        });

    } catch (err) {
        console.error("[/api/booking/confirm]", err);
        return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
    }
}
