export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const snap = await adminDb.collection("routeGroups").get();
        const routeGroups = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return NextResponse.json({ routeGroups });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, zipcodeCluster, serviceWeekday, crewAssigned, capacityPerWeek, demandMultiplier, densityDiscount, outOfAreaSurcharge } = body;

        if (!name || !zipcodeCluster || serviceWeekday === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newRouteRef = adminDb.collection("routeGroups").doc();
        await newRouteRef.set({
            name,
            zipcodeCluster,
            serviceWeekday: Number(serviceWeekday),
            crewAssigned: crewAssigned ?? null,
            capacityPerWeek: capacityPerWeek ? Number(capacityPerWeek) : 50,
            activePlansCount: 0,
            demandMultiplier: demandMultiplier !== undefined ? Number(demandMultiplier) : 1.0,
            densityDiscount: densityDiscount !== undefined ? Number(densityDiscount) : 0.0,
            outOfAreaSurcharge: outOfAreaSurcharge !== undefined ? Number(outOfAreaSurcharge) : 0.0,
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, id: newRouteRef.id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, name, zipcodeCluster, serviceWeekday, crewAssigned, capacityPerWeek, demandMultiplier, densityDiscount, outOfAreaSurcharge } = body;

        if (!id || !name || !zipcodeCluster || serviceWeekday === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await adminDb.collection("routeGroups").doc(id).update({
            name,
            zipcodeCluster,
            serviceWeekday: Number(serviceWeekday),
            crewAssigned: crewAssigned ?? null,
            capacityPerWeek: capacityPerWeek ? Number(capacityPerWeek) : 50,
            demandMultiplier: demandMultiplier !== undefined ? Number(demandMultiplier) : 1.0,
            densityDiscount: densityDiscount !== undefined ? Number(densityDiscount) : 0.0,
            outOfAreaSurcharge: outOfAreaSurcharge !== undefined ? Number(outOfAreaSurcharge) : 0.0,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await verifyAdmin(req);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

        await adminDb.collection("routeGroups").doc(id).delete();
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
