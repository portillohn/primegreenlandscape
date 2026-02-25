const admin = require("firebase-admin");
const serviceAccount = require("./primegreen-firebase.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1
    let result = 'PG-';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function migrate() {
    console.log("Starting ServicePlan Referral Seed Migration...");
    const plansRef = db.collection("servicePlans");
    const snapshot = await plansRef.get();

    let count = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.referralCode) {
            batch.update(doc.ref, {
                referralCode: generateReferralCode(),
                creditsBalance: 0
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Migration Complete. Seeded ${count} ServicePlans with unique Referral Codes & $0 credit balances.`);
    } else {
        console.log("No ServicePlans pending migration.");
    }
    process.exit(0);
}

migrate().catch(console.error);
