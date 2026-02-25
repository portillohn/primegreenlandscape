export const STEPS = [
    {
        step: "1", icon: "🏡",
        title: "Enter Your Address",
        desc: "Our engine cross-references satellite imagery and county property data to identify your exact lot boundaries — instant, accurate, no guessing.",
    },
    {
        step: "2", icon: "📅",
        title: "Reserve Your Spot",
        desc: "Select your plan and save your card to secure your recurring weekly or biweekly service slot. Card required to book — but $0 charged today.",
    },
    {
        step: "3", icon: "💳",
        title: "We Mow, Then We Charge",
        desc: "We show up on your scheduled day and complete your lawn service. Your card is charged only after the visit is marked complete — never upfront.",
    },
];

export default function HowItWorks() {
    return (
        <section className="bg-gray-50 py-20 px-4" id="how-it-works">
            <div className="max-w-5xl mx-auto text-center">
                <h2 className="text-[#1B4332] font-black text-3xl md:text-4xl mb-3">
                    How It Works
                </h2>
                <p className="text-gray-500 mb-14 max-w-lg mx-auto">
                    From first search to first mow in under 5 minutes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {STEPS.map(({ step, icon, title, desc }) => (
                        <div
                            key={step}
                            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
                        >
                            <div className="w-12 h-12 mx-auto rounded-full bg-[#1B4332] text-white font-black flex items-center justify-center text-xl mb-4">
                                {step}
                            </div>
                            <div className="text-4xl mb-3">{icon}</div>
                            <h3 className="text-gray-900 font-bold text-xl mb-2">{title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
