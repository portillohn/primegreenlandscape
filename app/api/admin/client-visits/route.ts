import { NextResponse } from "next/server";

/**
 * DEPRECATED: client-visits used users/{uid}/visits subcollection.
 * The canonical visits collection is now the top-level `visits` collection.
 * Use GET /api/admin/visits?customerUid={uid} instead.
 */
export async function GET() {
    return NextResponse.json(
        { error: "Deprecated. Use GET /api/admin/visits instead." },
        { status: 410 }
    );
}
