const admin = require("firebase-admin");
const serviceAccount = require("./primegreen-firebase.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateRouteGroups() {
    console.log("Starting RouteGroup Dynamic Pricing Migration...");

    try {
        const routeGroupsSnap = await db.collection("routeGroups").get();
        if (routeGroupsSnap.empty) {
            console.log("No RouteGroups found.");
            return;
        }

        // Count active plans per route group
        const plansSnap = await db.collection("servicePlans").where("status", "==", "active").get();
        const activeCountByRouteGroup = {};

        for (const planDoc of plansSnap.docs) {
            const planData = planDoc.data();
            const propSnap = await db.collection("properties").doc(planData.propertyId).get();
            if (propSnap.exists) {
                const propData = propSnap.data();
                if (propData.routeGroupId) {
                    activeCountByRouteGroup[propData.routeGroupId] = (activeCountByRouteGroup[propData.routeGroupId] || 0) + 1;
                }
            }
        }

        let migratedCount = 0;
        const batch = db.batch();

        for (const doc of routeGroupsSnap.docs) {
            const activePlansCount = activeCountByRouteGroup[doc.id] || 0;

            batch.update(doc.ref, {
                capacityPerWeek: 50,
                activePlansCount: activePlansCount,
                demandMultiplier: 1.0,
                densityDiscount: 0.0,
                outOfAreaSurcharge: 0.0
            });
            console.log(`Migrating RouteGroup ${doc.id} - Active Plans: ${activePlansCount}`);
            migratedCount++;
        }

        if (migratedCount > 0) {
            await batch.commit();
            console.log(`Successfully migrated ${migratedCount} RouteGroups!`);
        }
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrateRouteGroups();
