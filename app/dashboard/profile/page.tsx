"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserProfile, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then((p) => {
            const prof = p as Record<string, unknown> | null;
            setProfile(prof);
            setName((prof?.name as string) ?? user.displayName ?? "");
        });
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", user.uid), { name });
            await updateProfile(auth.currentUser!, { displayName: name });
            toast.success("Profile updated! ✅");
        } catch {
            toast.error("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage your account details.
                </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
                {/* Avatar + info */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#1B4332] flex items-center
                          justify-center text-white font-black text-2xl shadow-sm">
                        {name.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-lg">{name || "—"}</p>
                        <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                </div>

                <hr className="border-gray-100" />

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#52B788]/40
                         focus:border-[#52B788] transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={user?.email ?? ""}
                            disabled
                            className="w-full px-4 py-3 rounded-xl border border-gray-100
                         bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            Email cannot be changed. Contact support if needed.
                        </p>
                    </div>

                    {!!profile?.phone && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Phone
                            </label>
                            <input
                                type="text"
                                value={String(profile.phone)}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border border-gray-100
                           bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                            />
                        </div>
                    )}

                    {!!profile?.cardLast4 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Payment Method
                            </label>
                            <div className="px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-600">
                                {String(profile.cardBrand ?? "Card")} ending in ····{String(profile.cardLast4)}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-[#1B4332] hover:bg-[#2d6a4f] text-white
                       text-sm font-bold rounded-xl transition-all
                       disabled:opacity-50 shadow-sm"
                    >
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Link to Settings */}
            <div className="bg-[#1B4332]/5 border border-[#1B4332]/15 rounded-2xl p-5 flex items-center justify-between">
                <div>
                    <p className="font-semibold text-[#1B4332] text-sm">Service Settings</p>
                    <p className="text-gray-500 text-xs mt-0.5">Adjust your mowing day, pause dates, or cancel service.</p>
                </div>
                <Link href="/dashboard/settings"
                    className="px-4 py-2 bg-[#1B4332] text-white rounded-xl text-sm font-bold hover:bg-[#2d6a4f] transition-colors">
                    Settings →
                </Link>
            </div>
        </div>
    );
}
