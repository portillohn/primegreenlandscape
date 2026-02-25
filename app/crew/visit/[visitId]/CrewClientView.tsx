"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type CrewVisit = {
    id: string;
    address: string;
    planTier: string;
    scheduledDate: string;
    weatherDelayed: boolean;
    completionStatus: string;
};

export default function CrewClientView({ visit }: { visit: CrewVisit }) {
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [completed, setCompleted] = useState(visit.completionStatus === "completed");

    if (completed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-200">
                    <span className="text-5xl mb-4 block">✅</span>
                    <h2 className="text-xl font-black text-gray-900">Visit Completed</h2>
                    <p className="text-sm text-gray-500 mt-2">This service visit has successfully been marked complete.</p>
                </div>
            </div>
        );
    }

    if (visit.weatherDelayed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-200">
                    <span className="text-5xl mb-4 block">⛈️</span>
                    <h2 className="text-xl font-black text-indigo-700">Weather Hold Active</h2>
                    <p className="text-sm text-gray-500 mt-2">This visit is currently paused due to adverse weather conditions. Admin override required.</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            toast.error("Please upload a completion photo.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("visitId", visit.id);
            formData.append("notes", notes);
            formData.append("photo", file);

            const res = await fetch("/api/crew/complete", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                toast.success("Visit complete! Stripe charged successfully.");
                setCompleted(true);
            } else {
                toast.error(data.error || "Failed to complete visit.");
            }

        } catch (err: any) {
            toast.error("An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-[#1B4332] text-white px-6 py-5 sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🌱</span>
                    <div>
                        <h1 className="font-black text-lg leading-tight">Prime Green Crew</h1>
                        <p className="text-xs text-[#c0ecd3] font-medium tracking-wide uppercase">Field Execution</p>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-6">

                {/* Job Details Card */}
                <div className="bg-white border text-left border-gray-200 rounded-2xl shadow-sm p-5 space-y-1">
                    <p className="text-xs font-bold text-[#1B4332] uppercase tracking-widest mb-2">Job Details</p>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">{visit.address}</h2>
                    <div className="flex gap-2 items-center mt-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">{visit.planTier}</span>
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">📅 {visit.scheduledDate}</span>
                    </div>
                </div>

                {/* Action Form */}
                <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-5">

                    {/* Photo Uploader */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Completion Photo <span className="text-red-500">*</span>
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition relative">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="text-[#1B4332]">
                                    <span className="text-3xl block mb-2">📸</span>
                                    <p className="text-sm font-black truncate px-4">{file.name}</p>
                                    <p className="text-xs font-bold text-gray-400 mt-1">Tap to retake</p>
                                </div>
                            ) : (
                                <div className="text-gray-400">
                                    <span className="text-3xl block mb-2">📷</span>
                                    <p className="text-sm font-bold text-gray-600">Tap to Take Photo</p>
                                    <p className="text-xs font-medium mt-1">Required for verification</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes Textarea */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                            Crew Notes <span className="text-gray-400 font-medium">(Optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any gate issues, tall grass, or client requests..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/20 outline-none text-sm min-h-[100px] resize-none"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1B4332] text-white py-4 rounded-xl font-black text-lg shadow-md hover:bg-[#2d6a4f] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                            </>
                        ) : (
                            <>✓ Complete Visit</>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-gray-400 font-semibold uppercase tracking-wider mt-2">
                        This action will immediately charge the customer
                    </p>
                </form>

            </div>
        </div>
    );
}
