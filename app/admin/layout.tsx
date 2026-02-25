"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Redirect non-admins
    useEffect(() => {
        if (!loading && (!user || user.uid !== process.env.NEXT_PUBLIC_ADMIN_UID)) {
            router.replace("/dashboard");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || user.uid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
        return null; // Will redirect shortly
    }

    const navLinks = [
        { href: "/admin", label: "📅 Today's Route" },
        { href: "/admin/clients", label: "👥 Clients" },
        { href: "/admin/requests", label: "💬 Requests" },
        { href: "/admin/routes", label: "🗺️ Routes" },
        { href: "/admin/visits", label: "📋 All Visits" },
        { href: "/admin/failed", label: "⚠️ Failed Charges" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Shared Header / Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-10 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1B4332] rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🌿</span>
                    </div>
                    <div>
                        <h1 className="text-base font-black text-gray-900">Prime Green Admin</h1>
                        <p className="text-xs text-gray-400">Visit-based operations</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {navLinks.map((link) => {
                        const isActive = link.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(link.href);

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm px-3 py-1.5 font-bold rounded-lg transition ${isActive
                                    ? "bg-[#1B4332] text-white shadow-sm"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Page Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {children}
            </div>
        </div>
    );
}
