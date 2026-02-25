export const metadata = {
    title: "Privacy Policy | Prime Green Landscape LLC",
};

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
                <div className="border-b border-gray-100 pb-8">
                    <h1 className="text-4xl font-black text-gray-900 mb-4">Privacy Policy</h1>
                    <p className="text-gray-500 font-medium tracking-wide">Last updated: February 22, 2026</p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">1. Information We Collect</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        We collect: name, email address, phone number, service address, lot size, and payment method (processed securely through Stripe — we never store full card numbers).
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">2. How We Use Your Information</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Your information is used to: provide and schedule lawn care services, process payments after completed visits, send service notifications and receipts, improve our service quality.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">3. Payment Security</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        All payments are processed through Stripe, a PCI-DSS certified payment processor. Prime Green Landscape LLC never stores your full card number. Only the last 4 digits and card brand are saved for reference.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">4. Data Sharing</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        We do not sell or share your personal information with third parties. Your data is shared only with Stripe (payment processing) and Google Maps (address verification).
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">5. Data Storage</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Your data is stored securely using Google Firebase, a SOC 2 compliant platform. You may request deletion of your data at any time by contacting us.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">6. Your Rights</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        You have the right to: access your data, correct inaccurate data, delete your account and data, opt out of marketing communications.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">7. Contact</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Privacy questions:<br />
                        <a href="mailto:contact@primegreenlandscape.com" className="text-[#1B4332] font-semibold hover:underline">contact@primegreenlandscape.com</a><br />
                        <a href="tel:5714050031" className="text-[#1B4332] font-semibold hover:underline">571-405-0031</a>
                    </p>
                </section>
            </div>
        </main>
    );
}
