"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ContactForm() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            address: formData.get("address"),
            message: formData.get("message"),
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                toast.success("Message sent! We'll be in touch soon.");
                (e.target as HTMLFormElement).reset();
            } else {
                toast.error("Failed to send message. Please try again.");
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="name" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332] text-sm" placeholder="John Doe" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input type="email" name="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332] text-sm" placeholder="john@example.com" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="tel" name="phone" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332] text-sm" placeholder="(555) 555-5555" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Service Address <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" name="address" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332] text-sm" placeholder="123 Main St, Gaithersburg MD" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                <textarea name="message" required rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#1B4332] text-sm resize-none" placeholder="How can we help?"></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#1B4332] hover:bg-[#2d6a4f] text-white font-black rounded-xl transition-all shadow-md disabled:opacity-50 mt-2">
                {loading ? "Sending..." : "Send Message →"}
            </button>
        </form>
    );
}
