const fs = require('fs');
try {
    const env = fs.readFileSync('.env.local', 'utf8');
    env.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    });
} catch (e) {
    console.warn("Could not load .env.local", e.message);
}

const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}
const db = admin.firestore();

async function runHealthCheck() {
    console.log("=== Prime Green Landscape Health Check ===");

    const plansSnap = await db.collection("servicePlans").where("status", "==", "active").get();
    const activePlans = plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const visitsSnap = await db.collection("visits").get();
    const allVisits = visitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let plansWithZeroVisits = [];
    let planVisitCounts = {};

    // Count future scheduled visits per active plan
    activePlans.forEach(plan => {
        const count = allVisits.filter(v =>
            v.servicePlanId === plan.id && v.completionStatus === "scheduled"
        ).length;
        planVisitCounts[plan.id] = count;

        if (count === 0) {
            plansWithZeroVisits.push(plan.id);
        }
    });

    // Find improperly formatted visits
    let malformedVisits = allVisits.filter(v => {
        if (!v.servicePlanId) return true;
        if (!v.scheduledDate) return true;
        if (typeof v.scheduledDate === "string") return true;
        if (typeof v.scheduledDate.toDate !== "function") return true;

        return false;
    }).map(v => v.id);

    console.log(`Active Service Plans: ${activePlans.length}`);
    console.log("Visit counts per active plan (target: 8):");
    console.log(JSON.stringify(planVisitCounts, null, 2));

    if (plansWithZeroVisits.length > 0) {
        console.error(`CRITICAL: ${plansWithZeroVisits.length} plans have ZERO scheduled visits!`);
        console.log(plansWithZeroVisits);
    } else {
        console.log("SUCCESS: All active plans have scheduled visits.");
    }

    if (malformedVisits.length > 0) {
        console.error(`WARNING: Found ${malformedVisits.length} malformed visits missing servicePlanId or Timestamp dates.`);
        console.log("Consider running the migrate-visits API endpoint.");
    } else {
        console.log("SUCCESS: All visits adhere to the canonical Data Contract.");
    }
}

runHealthCheck()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Failed to run health check:", err);
        process.exit(1);
    });
