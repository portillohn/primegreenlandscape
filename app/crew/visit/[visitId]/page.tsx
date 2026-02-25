import { adminDb } from "@/lib/firebase-admin";
import CrewClientView from "./CrewClientView";

export default async function CrewVisitPage({ params }: { params: Promise<{ visitId: string }> }) {
    // Next.js params handling
    const { visitId } = await params;

    try {
        const visitSnap = await adminDb.collection("visits").doc(visitId).get();
        if (!visitSnap.exists) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                    <div className="text-center bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full border border-gray-200">
                        <span className="text-4xl mb-4 block">🔍</span>
                        <h2 className="text-xl font-black text-gray-900">Visit Not Found</h2>
                        <p className="text-sm text-gray-500 mt-2">The requested visit token is invalid.</p>
                    </div>
                </div>
            );
        }

        const visitData = visitSnap.data()!;

        let planData: any = {};
        let address = "Unknown Address";

        if (visitData.servicePlanId) {
            const planSnap = await adminDb.collection("servicePlans").doc(visitData.servicePlanId).get();
            if (planSnap.exists) {
                planData = planSnap.data()!;
                if (planData.propertyId) {
                    const propSnap = await adminDb.collection("properties").doc(planData.propertyId).get();
                    if (propSnap.exists) address = propSnap.data()!.address;
                }
            }
        }

        const payload = {
            id: visitId,
            address,
            planTier: planData.planTier ?? planData.planName ?? "Unknown Plan",
            scheduledDate: visitData.scheduledDate,
            weatherDelayed: visitData.weatherDelayed ?? false,
            completionStatus: visitData.completionStatus
        };

        return <CrewClientView visit={payload} />;

    } catch (err) {
        console.error("Crew Page Error:", err);
        return <div className="p-6 text-red-500 text-center font-bold">Internal Server Error</div>;
    }
}
