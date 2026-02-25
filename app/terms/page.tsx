export const metadata = {
    title: "Terms of Service | Prime Green Landscape LLC",
};

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
                <div className="border-b border-gray-100 pb-8">
                    <h1 className="text-4xl font-black text-gray-900 mb-4">Terms of Service</h1>
                    <p className="text-gray-500 font-medium tracking-wide">Last updated: February 22, 2026</p>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">1. Services</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Prime Green Landscape LLC provides residential lawn care services in Montgomery County, MD. Services include lawn mowing, edging, trimming, and yard cleanup as described in each service plan.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">2. Billing & Payment</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        We operate on a pay-after-service model. You will NOT be charged until after each visit is completed by our crew. Charges are processed automatically to the payment method on file. Pricing is based on your lot size calculated at time of quote.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">3. Cancellation</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        There are no contracts or commitments. You may cancel your service at any time from your dashboard with no penalties or fees. Cancellation takes effect before your next scheduled visit.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">4. Service Guarantee</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        If you are not satisfied with a visit, contact us within 24 hours at <a href="mailto:contact@primegreenlandscape.com" className="text-[#1B4332] font-semibold hover:underline">contact@primegreenlandscape.com</a> or <a href="tel:5714050031" className="text-[#1B4332] font-semibold hover:underline">571-405-0031</a> and we will return to correct the issue at no additional charge.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">5. Scheduling</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Services are scheduled based on your preferred day. We reserve the right to reschedule due to weather or safety conditions. We will notify you in advance of any changes.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">6. Liability</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        Prime Green Landscape LLC is fully insured. We are not liable for pre-existing property damage. Clients must disclose known hazards (buried cables, irrigation heads, etc.) prior to service.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-black text-[#1B4332]">7. Contact</h2>
                    <p className="text-gray-600 leading-relaxed text-lg">
                        For questions about these terms:<br />
                        <a href="mailto:contact@primegreenlandscape.com" className="text-[#1B4332] font-semibold hover:underline">contact@primegreenlandscape.com</a><br />
                        <a href="tel:5714050031" className="text-[#1B4332] font-semibold hover:underline">571-405-0031</a><br />
                        Montgomery County, MD
                    </p>
                </section>
            </div>
        </main>
    );
}
