export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(token);

        const { addOnId } = await req.json();
        if (!addOnId) return NextResponse.json({ error: "Missing addOnId" }, { status: 400 });

        const propsQuery = await adminDb.collection("properties").where("customerUid", "==", decoded.uid).limit(1).get();
        if (propsQuery.empty) return NextResponse.json({ error: "Property not found" }, { status: 404 });

        const propId = propsQuery.docs[0].id;

        const reqRef = adminDb.collection("addOnRequests").doc();
        await reqRef.set({
            propertyId: propId,
            addOnId,
            requestedDate: new Date().toISOString(),
            status: "pending",
            assignedVisitId: null,
            createdAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, id: reqRef.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(token);

        const propsQuery = await adminDb.collection("properties").where("customerUid", "==", decoded.uid).limit(1).get();
        if (propsQuery.empty) return NextResponse.json({ success: true, requests: [] });

        const propId = propsQuery.docs[0].id;

        const reqsQuery = await adminDb.collection("addOnRequests").where("propertyId", "==", propId).get();
        const requests = reqsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return NextResponse.json({ success: true, requests });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
