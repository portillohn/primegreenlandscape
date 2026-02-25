export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { name, email, phone, address, message } = await req.json();
        if (!name || !email || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await adminDb.collection("contact_submissions").add({
            name,
            email,
            phone: phone || null,
            address: address || null,
            message,
            createdAt: FieldValue.serverTimestamp(),
            read: false,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact submission error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
