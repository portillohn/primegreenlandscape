import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Policies — Prime Green Landscape",
    description: "Terms of Service, Privacy Policy, Cancellation, Skip, and Service Area policies for Prime Green Landscape.",
};

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="mb-12">
        <h2 className="text-xl font-black text-[#1B4332] mb-4 pb-2 border-b border-gray-200">{title}</h2>
        <div className="text-gray-600 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
);

export default function PoliciesPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-3xl mx-auto px-6 py-16">

                {/* Header */}
                <div className="mb-12">
                    <Link href="/" className="text-sm text-[#1B4332] hover:underline font-medium">
                        ← Back to Prime Green
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 mt-6 mb-2">Policies & Terms</h1>
                    <p className="text-gray-400 text-sm">Last updated: March 1, 2026</p>
                </div>

                {/* Nav */}
                <nav className="bg-gray-50 rounded-2xl p-5 mb-12 text-sm">
                    <p className="font-bold text-gray-700 mb-3">Jump to:</p>
                    <ul className="space-y-1.5">
                        {[
                            ["#tos", "Terms of Service"],
                            ["#billing", "Billing Policy"],
                            ["#cancellation", "Cancellation Policy"],
                            ["#skip", "Skip Policy"],
                            ["#service-area", "Service Area"],
                            ["#privacy", "Privacy Policy"],
                        ].map(([href, label]) => (
                            <li key={href}><a href={href} className="text-[#1B4332] hover:underline">{label}</a></li>
                        ))}
                    </ul>
                </nav>

                <Section id="tos" title="Terms of Service">
                    <p>By booking services through Prime Green Landscape ("Prime Green," "we," "us"), you agree to these Terms of Service.</p>
                    <p><strong>Service.</strong> Prime Green provides recurring residential lawn mowing services in the greater Gaithersburg, MD area. Services are provided on a rolling per-visit basis — there is no annual contract.</p>
                    <p><strong>Scheduling.</strong> Upon booking, we generate 8 upcoming scheduled visits on your chosen service day. Visits Auto-roll forward after each completion to maintain your 8-visit window.</p>
                    <p><strong>Card Requirement.</strong> A valid credit or debit card is required on file before any service begins. We accept Visa, Mastercard, American Express, and Discover.</p>
                    <p><strong>No Contracts.</strong> You may cancel your service plan at any time. See Cancellation Policy.</p>
                </Section>

                <Section id="billing" title="Billing Policy">
                    <p><strong>Charge timing.</strong> Your card is charged only after a visit is marked <em>completed</em> by our crew — never in advance, never on a subscription schedule.</p>
                    <p><strong>Amount.</strong> The charge equals your plan&apos;s per-visit price, shown at booking and on your dashboard.</p>
                    <p><strong>Receipts.</strong> A Stripe receipt is emailed to you after each successful charge.</p>
                    <p><strong>Failed payments.</strong> If a charge fails, your dashboard will show an alert and we will attempt to contact you. The visit remains marked completed in your history. You will not be rescheduled until payment is resolved.</p>
                    <p><strong>Idempotency.</strong> Each visit can only be charged once. Duplicate charge attempts are automatically rejected.</p>
                </Section>

                <Section id="cancellation" title="Cancellation Policy">
                    <p><strong>Cancel anytime.</strong> You may cancel your service plan by contacting us at any time. No cancellation fee applies if you give at least 48 hours notice before your next scheduled visit.</p>
                    <p><strong>Late cancellation.</strong> Cancellations within 48 hours of a scheduled visit may incur a $25 late cancellation fee to cover crew scheduling costs.</p>
                    <p><strong>How to cancel.</strong> Email <a href="mailto:hello@primegreenlandscape.com" className="text-[#1B4332] underline">hello@primegreenlandscape.com</a> or use the contact form on our website. We do not accept cancellations via social media.</p>
                    <p><strong>Effect of cancellation.</strong> All future scheduled visits are removed from your dashboard. Any completed visits already billed remain in your history.</p>
                </Section>

                <Section id="skip" title="Skip Policy">
                    <p><strong>Skip requests.</strong> You may request to skip any upcoming visit directly from your client dashboard. Skip requests must be submitted at least <strong>24 hours before</strong> the scheduled visit date.</p>
                    <p><strong>Approval required.</strong> Skip requests are reviewed and approved by our team. You will see a &ldquo;Skip Requested&rdquo; badge on the visit until it is approved or denied.</p>
                    <p><strong>Approved skips.</strong> Approved skips are marked on your dashboard and in your history. No charge is applied. Your schedule rolls forward automatically.</p>
                    <p><strong>Denied skips.</strong> If a skip request is denied (e.g., submitted too close to the visit), the visit remains scheduled. You will see the denial on your dashboard.</p>
                    <p><strong>Same-day requests.</strong> Same-day skip requests cannot be guaranteed. Please contact us directly in urgent situations.</p>
                </Section>

                <Section id="service-area" title="Service Area">
                    <p>Prime Green Landscape currently serves the following ZIP codes in Montgomery County, MD:</p>
                    <p className="font-mono text-xs bg-gray-50 rounded-lg p-3">20877, 20878, 20879, 20874, 20876, 20886, 20901, 20902, 20903, 20906</p>
                    <p>If your address is not in our service area, we will notify you during the quoting process. We are actively expanding — contact us to be added to the waitlist for your area.</p>
                </Section>

                <Section id="privacy" title="Privacy Policy">
                    <p><strong>What we collect.</strong> We collect your name, email address, phone number, service address, and payment method (stored securely via Stripe — we never store your card number).</p>
                    <p><strong>How we use it.</strong> Your information is used solely to schedule and complete lawn services, communicate with you about your account, and process payments.</p>
                    <p><strong>Third parties.</strong> We use Stripe for payment processing, Firebase for secure data storage, and standard email for communications. We do not sell your data.</p>
                    <p><strong>Data retention.</strong> We retain your service and billing history for 7 years for accounting purposes. You may request deletion of your account data by emailing us.</p>
                    <p><strong>Contact.</strong> For any privacy concerns, email <a href="mailto:hello@primegreenlandscape.com" className="text-[#1B4332] underline">hello@primegreenlandscape.com</a>.</p>
                </Section>

                <div className="border-t border-gray-100 pt-8 text-center text-xs text-gray-400">
                    <p>© {new Date().getFullYear()} Prime Green Landscape LLC. All rights reserved.</p>
                    <p className="mt-1">Gaithersburg, MD · <a href="mailto:hello@primegreenlandscape.com" className="hover:text-[#1B4332]">hello@primegreenlandscape.com</a></p>
                </div>
            </div>
        </div>
    );
}
