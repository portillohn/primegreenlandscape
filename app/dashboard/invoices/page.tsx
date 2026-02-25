"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection, query, orderBy, getDocs
} from "firebase/firestore";

type Visit = {
    id: string;
    date: string;
    plan: string;
    amount: number;
    paymentStatus: string;
    notes?: string;
};

export default function InvoicesPage() {
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        getDocs(
            query(
                collection(db, "users", user.uid, "visits"),
                orderBy("createdAt", "desc")
            )
        ).then(snap => {
            setVisits(
                snap.docs.map(d => ({
                    id: d.id,
                    ...(d.data() as Omit<Visit, "id">),
                }))
            );
        }).finally(() => setLoading(false));
    }, [user]);

    const totalPaid = visits
        .filter(v => v.paymentStatus === "succeeded")
        .reduce((sum, v) => sum + (v.amount ?? 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-900">
                    Invoices
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    Your complete service & payment history.
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: "Total Visits",
                        value: visits.length,
                        icon: "🌿"
                    },
                    {
                        label: "Total Paid",
                        value: `$${totalPaid.toFixed(2)}`,
                        icon: "💳"
                    },
                    {
                        label: "Pending",
                        value: visits.filter(
                            v => v.paymentStatus !== "succeeded"
                        ).length,
                        icon: "⏳"
                    },
                ].map(({ label, value, icon }) => (
                    <div key={label}
                        className="bg-white rounded-2xl p-4
                          border border-gray-100 shadow-sm">
                        <p className="text-xl mb-1">{icon}</p>
                        <p className="text-2xl font-black text-gray-900">
                            {value}
                        </p>
                        <p className="text-xs text-gray-400">{label}</p>
                    </div>
                ))}
            </div>

            {/* Invoice list */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="w-7 h-7 border-4 border-[#1B4332]
                          border-t-transparent rounded-full
                          animate-spin mx-auto" />
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-4xl mb-3">🧾</p>
                    <p className="font-medium">No invoices yet.</p>
                    <p className="text-sm mt-1">
                        Invoices appear here after each completed visit.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border
                        border-gray-100 shadow-sm overflow-hidden">
                    {visits.map((v, i) => (
                        <div key={v.id}
                            className={`flex items-center justify-between
                             px-5 py-4 ${i < visits.length - 1
                                    ? "border-b border-gray-100"
                                    : ""
                                }`}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#1B4332]/10
                                rounded-xl flex items-center
                                justify-center">
                                    <span className="text-lg">🌿</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">
                                        {v.plan} Plan Visit
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {v.date}
                                        {v.notes ? ` · ${v.notes}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-gray-900">
                                    ${v.amount?.toFixed(2)}
                                </p>
                                <span className={`text-xs font-bold px-2 py-0.5
                                  rounded-full ${v.paymentStatus === "succeeded"
                                        ? "bg-green-100 text-green-700"
                                        : v.paymentStatus === "no_card"
                                            ? "bg-gray-100 text-gray-500"
                                            : "bg-red-100 text-red-600"
                                    }`}>
                                    {v.paymentStatus === "succeeded"
                                        ? "✓ Paid"
                                        : v.paymentStatus === "no_card"
                                            ? "No card"
                                            : v.paymentStatus}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
