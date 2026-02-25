"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

type ClientRow = {
    planId: string;
    ownerUid: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    tier: string;
    frequency: string;
    pricePerVisit: number;
    status: string;
    nextVisitDate: string | null;
    missingUserDoc: boolean;
};

function fmtDate(dateStr: string | null) {
    if (!dateStr) return "Not Scheduled";
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric"
    });
}

export default function AdminClientsPage() {
    const { user } = useAuth();
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [fetching, setFetching] = useState(true);

    const fetchClients = useCallback(async () => {
        if (!user) return;
        setFetching(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/clients", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setClients(data.clients || []);
            } else {
                toast.error(data.error || "Failed to load clients");
            }
        } catch {
            toast.error("Failed to fetch clients.");
        } finally {
            setFetching(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchClients();
    }, [user, fetchClients]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">👥 Clients</h2>
                    <p className="text-sm text-gray-500">Clients with active service plans.</p>
                </div>
                <div className="bg-[#1B4332]/10 text-[#1B4332] font-black text-xl px-4 py-2 rounded-xl">
                    {fetching ? "..." : clients.length}
                </div>
            </div>

            {fetching ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : clients.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-4xl mb-3">👥</p>
                    <p className="font-bold text-gray-700">No active clients found.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-black tracking-wider">
                                <th className="px-5 py-4">Client</th>
                                <th className="px-5 py-4">Contact</th>
                                <th className="px-5 py-4">Plan & Price</th>
                                <th className="px-5 py-4 focus:outline-none">Next Visit</th>
                                <th className="px-5 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {clients.map(c => (
                                <tr key={c.planId} className="hover:bg-gray-50 transition">
                                    <td className="px-5 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 flex items-center gap-2">
                                                {c.name}
                                                {c.missingUserDoc && (
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                                                        Missing User Doc
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate mt-0.5 max-w-[200px]" title={c.address}>
                                                {c.address}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-xs space-y-0.5 text-gray-600 font-medium">
                                            <span>{c.phone}</span>
                                            <span className="text-gray-400">{c.email}</span>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{c.tier}</span>
                                                <span className="text-xs uppercase bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">
                                                    {c.frequency}
                                                </span>
                                            </div>
                                            <span className="text-xs text-[#1B4332] font-black mt-1">
                                                ${typeof c.pricePerVisit === 'number' ? c.pricePerVisit.toFixed(2) : String(c.pricePerVisit)} <span className="text-gray-400 font-medium">/visit</span>
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4 whitespace-nowrap text-gray-600 font-medium text-xs">
                                        📅 {fmtDate(c.nextVisitDate)}
                                    </td>

                                    <td className="px-5 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
