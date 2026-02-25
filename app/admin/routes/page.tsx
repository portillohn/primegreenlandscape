"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type RouteGroup = {
    id: string;
    name: string;
    zipcodeCluster: string[];
    serviceWeekday: number;
    crewAssigned: string | null;
    capacityPerWeek: number;
    activePlansCount: number;
    demandMultiplier: number;
    densityDiscount: number;
    outOfAreaSurcharge: number;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RoutesAdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<RouteGroup[]>([]);
    const [fetching, setFetching] = useState(true);

    // Form State
    const [name, setName] = useState("");
    const [zipcodes, setZipcodes] = useState("");
    const [weekday, setWeekday] = useState("1"); // Default Monday
    const [crew, setCrew] = useState("");
    const [capacityPerWeek, setCapacityPerWeek] = useState(50);
    const [demandMultiplier, setDemandMultiplier] = useState(1.0);
    const [densityDiscount, setDensityDiscount] = useState(0.0);
    const [outOfAreaSurcharge, setOutOfAreaSurcharge] = useState(0.0);

    const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID;

    useEffect(() => {
        if (!loading && (!user || user.uid !== ADMIN_UID)) {
            router.replace("/dashboard");
        }
    }, [user, loading, router, ADMIN_UID]);

    const fetchGroups = useCallback(async () => {
        if (!user) return;
        setFetching(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch("/api/admin/route-groups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setGroups(data.routeGroups ?? []);
        } catch {
            toast.error("Failed to load Route Groups");
        } finally {
            setFetching(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchGroups();
    }, [user, fetchGroups]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = await user?.getIdToken();
            const zipsArray = zipcodes.split(",").map(z => z.trim()).filter(Boolean);

            const res = await fetch("/api/admin/route-groups", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    zipcodeCluster: zipsArray,
                    serviceWeekday: Number(weekday),
                    crewAssigned: crew || null,
                    capacityPerWeek,
                    demandMultiplier,
                    densityDiscount,
                    outOfAreaSurcharge
                })
            });

            if (!res.ok) throw new Error("Creation failed");
            setName("");
            toast.success("Route Group created!");
            setName("");
            setZipcodes("");
            setWeekday("1");
            setCrew("");
            setCapacityPerWeek(50);
            setDemandMultiplier(1.0);
            setDensityDiscount(0.0);
            setOutOfAreaSurcharge(0.0);
            fetchGroups();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this Route Group?")) return;
        try {
            const token = await user?.getIdToken();
            await fetch("/api/admin/route-groups", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            });
            toast.success("Group deleted");
            fetchGroups();
        } catch {
            toast.error("Failed to delete");
        }
    };

    if (loading || fetching) {
        return <div className="p-8 text-center text-gray-500">Loading Route Groups...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2">🗺️ Route Optimization</h2>
                <p className="text-sm text-gray-500">Manage service areas, capacities, and density-based pricing.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Form Column */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-xl font-semibold mb-4">Create Group</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="e.g. Silver Spring North"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Zipcodes (comma separated)</label>
                            <input
                                type="text"
                                required
                                value={zipcodes}
                                onChange={e => setZipcodes(e.target.value)}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="20901, 20902"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enforced Service Day</label>
                            <select
                                value={weekday}
                                onChange={e => setWeekday(e.target.value)}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                            >
                                {DAYS.map((day, idx) => (
                                    <option key={idx} value={idx}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Crew (Optional)</label>
                            <input
                                type="text"
                                value={crew}
                                onChange={e => setCrew(e.target.value)}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                placeholder="Crew Alpha"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Capacity</label>
                                <input
                                    type="number"
                                    required
                                    value={capacityPerWeek}
                                    onChange={e => setCapacityPerWeek(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Demand Multiplier</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={demandMultiplier}
                                    onChange={e => setDemandMultiplier(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Density Discount (e.g. 0.05)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={densityDiscount}
                                    onChange={e => setDensityDiscount(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Out of Area Surcharge</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={outOfAreaSurcharge}
                                    onChange={e => setOutOfAreaSurcharge(Number(e.target.value))}
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition">
                            Create Route Group
                        </button>
                    </form>
                </div>

                {/* List Column */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Active Route Groups ({groups.length})</h2>
                    {groups.length === 0 ? (
                        <div className="text-gray-500 bg-gray-50 p-6 rounded-2xl border text-center">
                            No route groups defined yet.
                        </div>
                    ) : (
                        groups.map(g => (
                            <div key={g.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{g.name}</h3>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-4">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {DAYS[g.serviceWeekday]}
                                        </span>
                                        {g.crewAssigned && (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                                                {g.crewAssigned}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {g.zipcodeCluster.map(z => (
                                            <span key={z} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                                {z}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-gray-100 pt-3">
                                        <div>
                                            <span className="text-gray-500">Utilization: </span>
                                            <span className={`font-semibold ${g.activePlansCount >= g.capacityPerWeek ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {g.activePlansCount} / {g.capacityPerWeek} active
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Demand Multiplier: </span>
                                            <span className="font-semibold">{Number(g.demandMultiplier).toFixed(2)}x</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Density Discount: </span>
                                            <span className="font-semibold text-emerald-600">{Number(g.densityDiscount * 100).toFixed(0)}%</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">O.O.A Surcharge: </span>
                                            <span className="font-semibold text-red-600">{Number(g.outOfAreaSurcharge * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(g.id)}
                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
