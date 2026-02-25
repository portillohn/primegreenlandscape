// lib/email.ts

export type EmailType =
    | "welcome"
    | "reminder"
    | "visit_completed"
    | "review_request"
    | "upgrade_offer"
    | "payment_failed";

export async function sendRetentionEmail(
    toEmail: string,
    type: EmailType,
    payload: Record<string, any> = {}
) {
    // In production, instantiate Resend or SendGrid here:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({ ... })

    console.log("=========================================");
    console.log(`📧 [MOCK EMAIL DISPATCH] Type: ${type}`);
    console.log(`✉️ To: ${toEmail}`);
    console.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`);

    let subject = "";
    switch (type) {
        case "welcome":
            subject = "Welcome to Prime Green Landscape! 🌿";
            break;
        case "reminder":
            subject = "Reminder: Your Prime Green Mowing is Tomorrow!";
            break;
        case "visit_completed":
            subject = "Your lawn looks great! Service completed. ✅";
            break;
        case "review_request":
            subject = "How are we doing? We'd love your feedback! ⭐️";
            break;
        case "upgrade_offer":
            subject = "Upgrade to Premium Property Care at a discount! 🚀";
            break;
        case "payment_failed":
            subject = "Action Required: Update your payment method 💳";
            break;
    }

    console.log(`🏷️  Subject: ${subject}`);
    console.log("=========================================\n");

    return { success: true, messageId: `mock_${Date.now()}` };
}
