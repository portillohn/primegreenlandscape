import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard"];
const ADMIN_PAGES = ["/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const session = req.cookies.get("session")?.value;

    // Block /admin for non-admins
    if (ADMIN_PAGES.some(p => pathname.startsWith(p))) {
        if (!session) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        // Additional admin check happens server-side in the page
        return NextResponse.next();
    }

    // Redirect logged-in users away from auth pages
    if (session && AUTH_PAGES.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect logged-out users away from protected pages
    if (!session && PROTECTED.some(p => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
