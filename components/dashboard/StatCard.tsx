interface Props {
    icon: string;
    label: string;
    value: string;
    sub?: string;
    accent?: boolean;
}

export default function StatCard({ icon, label, value, sub, accent }: Props) {
    return (
        <div className={`rounded-2xl p-5 border transition-all hover:shadow-md
      ${accent
                ? "bg-[#1B4332] border-[#1B4332] text-white"
                : "bg-white border-gray-100 text-gray-900"
            }`}
        >
            <div className={`flex items-center gap-2 text-sm mb-3 font-medium
        ${accent ? "text-white/70" : "text-gray-500"}`}>
                <span className="text-lg">{icon}</span>
                {label}
            </div>
            <p className={`text-3xl font-black ${accent ? "text-white" : "text-gray-900"}`}>
                {value}
            </p>
            {sub && (
                <p className={`text-xs mt-1 ${accent ? "text-white/60" : "text-gray-400"}`}>
                    {sub}
                </p>
            )}
        </div>
    );
}
