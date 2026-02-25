import ContactForm from "./ContactForm";

export const metadata = {
    title: "Contact Us | Prime Green Landscape LLC",
};

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-5xl mx-auto px-4 py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    {/* LEFT — Contact info */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-4">Get in Touch</h1>
                            <p className="text-gray-500 text-lg leading-relaxed font-medium">
                                Have a question? We typically respond within a few hours during business hours.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
                                <span className="text-2xl mt-0.5">📞</span>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Phone</h3>
                                    <p className="text-gray-500 mb-2 font-medium">Mon–Sat · 7am–7pm</p>
                                    <a href="tel:5714050031" className="text-[#1B4332] font-bold hover:underline inline-flex items-center gap-1">
                                        Call Now →
                                    </a>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
                                <span className="text-2xl mt-0.5">✉️</span>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Email</h3>
                                    <p className="text-gray-500 mb-2 font-medium">We respond within a few hours</p>
                                    <a href="mailto:contact@primegreenlandscape.com" className="text-[#1B4332] font-bold hover:underline inline-flex items-center gap-1">
                                        Send Email →
                                    </a>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-start gap-4">
                                <span className="text-2xl mt-0.5">📍</span>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Service Area</h3>
                                    <p className="text-[#1B4332] font-bold mb-1">Montgomery County, MD</p>
                                    <p className="text-gray-500 leading-relaxed text-sm font-medium">
                                        Gaithersburg, Rockville, Bethesda, Germantown, Silver Spring, Potomac
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Contact form */}
                    <div className="bg-white p-8 rounded-3xl border shadow-xl shadow-gray-200/50 border-gray-100">
                        <h2 className="text-2xl font-black text-gray-900 mb-6">Send us a Message</h2>
                        <ContactForm />
                    </div>
                </div>
            </div>
        </main>
    );
}
