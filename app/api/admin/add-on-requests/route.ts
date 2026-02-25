export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

async function verifyAdmin(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) throw new Error("Not admin");
    return decoded;
}

export async function PUT(req: NextRequest) {
    try {
        await verifyAdmin(req);
        const { requestId, assignedVisitId, status } = await req.json();

        if (!requestId) return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

        const updateData: any = {};
        if (assignedVisitId !== undefined) updateData.assignedVisitId = assignedVisitId;
        if (status) updateData.status = status;

        await adminDb.collection("addOnRequests").doc(requestId).update(updateData);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
