export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin(req);
        const addOnsSnap = await adminDb.collection("addOns").get();
        const addOns = addOnsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ success: true, addOns });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 401 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin(req);
        const body = await req.json();
        const { name, price, durationEstimate, active, availableRouteGroups } = body;

        if (!name || price === undefined || !durationEstimate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const addOnRef = adminDb.collection("addOns").doc();
        await addOnRef.set({
            name,
            price: Number(price),
            durationEstimate: Number(durationEstimate),
            active: active ?? true,
            availableRouteGroups: availableRouteGroups || [],
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: addOnRef.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await verifyAdmin(req);
        const body = await req.json();
        const { id, name, price, durationEstimate, active, availableRouteGroups } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing addOn ID" }, { status: 400 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = Number(price);
        if (durationEstimate !== undefined) updateData.durationEstimate = Number(durationEstimate);
        if (active !== undefined) updateData.active = active;
        if (availableRouteGroups !== undefined) updateData.availableRouteGroups = availableRouteGroups;
        updateData.updatedAt = FieldValue.serverTimestamp();

        await adminDb.collection("addOns").doc(id).update(updateData);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await verifyAdmin(req);
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing addOn ID" }, { status: 400 });
        }

        await adminDb.collection("addOns").doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
