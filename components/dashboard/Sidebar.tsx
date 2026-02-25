"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { logout } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const NAV = [
    { href: "/dashboard", icon: "🏡", label: "Overview" },
    { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success("See you soon! 👋");
        router.push("/");
    };

    const NavLinks = () => (
        <nav className="flex-1 px-3 space-y-1">
            {NAV.map(({ href, icon, label }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm
                        font-medium transition-all
                        ${active
                                ? "bg-[#1B4332] text-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                    >
                        <span className="text-lg w-5 text-center">{icon}</span>
                        {label}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* ── Desktop Sidebar ──────────────────────────────────────────────────── */}
            <aside className="hidden lg:flex flex-col w-64 h-screen bg-white
                        border-r border-gray-100 sticky top-0">
                {/* Brand */}
                <div className="flex items-center gap-2.5 px-6 py-6 border-b border-gray-100">
                    <div className="flex flex-col gap-0.5">
                        <Image
                            src="/logo.png"
                            alt="Prime Green Landscape LLC"
                            width={160}
                            height={54}
                            className="h-12 w-auto object-contain"
                            priority
                        />
                        <span className="text-[10px] text-gray-400 font-medium 
                       tracking-widest uppercase pl-0.5">
                            Client Portal
                        </span>
                    </div>
                </div>

                {/* User badge */}
                {user && (
                    <div className="mx-3 mt-4 mb-2 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center
                            justify-center text-white font-bold text-sm shrink-0">
                            {user.displayName?.charAt(0).toUpperCase() ?? "U"}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                                {user.displayName ?? "Client"}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                )}

                <NavLinks />

                {/* Logout */}
                <div className="p-4 border-t border-gray-100 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                       text-sm font-medium text-gray-500 hover:bg-red-50
                       hover:text-red-600 transition-all"
                    >
                        <span className="text-lg">→</span> Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Mobile Top Bar ────────────────────────────────────────────────────── */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40
                      bg-white border-b border-gray-100 px-4 py-4
                      flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Image
                        src="/logo.png"
                        alt="Prime Green Landscape LLC"
                        width={140}
                        height={47}
                        className="h-10 w-auto object-contain"
                        priority
                    />
                </div>
                <button
                    onClick={() => setOpen(!open)}
                    className="w-9 h-9 rounded-lg bg-gray-100 flex items-center
                     justify-center text-gray-600 font-bold text-lg"
                >
                    {open ? "✕" : "☰"}
                </button>
            </div>

            {/* ── Mobile Drawer ─────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            key="overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/30 z-40"
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50
                         bg-white flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between px-6 py-5
                              border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Image
                                        src="/logo.png"
                                        alt="Prime Green Landscape LLC"
                                        width={160}
                                        height={54}
                                        className="h-12 w-auto object-contain"
                                        priority
                                    />
                                </div>
                                <button onClick={() => setOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 text-xl">
                                    ✕
                                </button>
                            </div>

                            {user && (
                                <div className="mx-3 mt-4 mb-2 bg-gray-50 rounded-xl p-3
                                flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center
                                  justify-center text-white font-bold text-sm shrink-0">
                                        {user.displayName?.charAt(0).toUpperCase() ?? "U"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {user.displayName ?? "Client"}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>
                                </div>
                            )}

                            <NavLinks />

                            <div className="p-4 border-t border-gray-100 mt-auto">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                             text-sm font-medium text-gray-500 hover:bg-red-50
                             hover:text-red-600 transition-all">
                                    <span>→</span> Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
