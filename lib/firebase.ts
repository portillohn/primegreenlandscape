import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    updateProfile,
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    getDocs,
    where,
    limit,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

export const loginWithEmail = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = () =>
    signInWithPopup(auth, googleProvider);

export const registerWithEmail = async (
    email: string,
    password: string,
    name: string
) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserDocument(cred.user, { displayName: name });
    return cred;
};

export const logout = () => signOut(auth);

export const createUserDocument = async (
    user: { uid: string; displayName?: string | null; email?: string | null },
    extra?: Record<string, unknown>
) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            uid: user.uid,
            role: "client",
            fullName: user.displayName ?? extra?.displayName ?? "",
            email: user.email ?? "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...extra,
        });
    }
};

export const getUserProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = (
    uid: string,
    data: Record<string, unknown>
) => updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });

/**
 * Get the user's active servicePlan.
 * Queries by ownerUid (required by Firestore rules).
 * Falls back to customerUid for backwards compat with older docs.
 */
export async function getUserActivePlan(uid: string): Promise<Record<string, unknown> | null> {
    // Primary query: ownerUid (matches production Firestore rules)
    let plansSnap = await getDocs(
        query(
            collection(db, "servicePlans"),
            where("ownerUid", "==", uid),
            where("status", "in", ["active", "paused"]),
            limit(1)
        )
    );

    // Fallback: customerUid for legacy docs created before ownerUid was introduced
    if (plansSnap.empty) {
        plansSnap = await getDocs(
            query(
                collection(db, "servicePlans"),
                where("customerUid", "==", uid),
                where("status", "in", ["active", "paused"]),
                limit(1)
            )
        );
    }

    if (plansSnap.empty) return null;

    const planDoc = plansSnap.docs[0];
    const planData = planDoc.data() as Record<string, unknown>;

    // Fetch associated property for address display
    let property: Record<string, unknown> = {};
    if (planData.propertyId) {
        try {
            const propSnap = await getDoc(doc(db, "properties", planData.propertyId as string));
            if (propSnap.exists()) property = { id: propSnap.id, ...propSnap.data() };
        } catch {
            // Property fetch may fail if not yet ownerUid indexed — not critical
        }
    }

    return {
        ...planData,
        id: planDoc.id,
        property,
    };
}

/**
 * Get upcoming scheduled visits — queries by ownerUid.
 * Falls back to servicePlanId for legacy docs.
 */
export async function getUpcomingVisits(planId: string, uid: string, limitCount = 3) {
    const today = new Date().toISOString().split("T")[0];

    // Primary: ownerUid + scheduledDate >= today
    let snap = await getDocs(
        query(
            collection(db, "visits"),
            where("ownerUid", "==", uid),
            where("completionStatus", "==", "scheduled"),
            where("scheduledDate", ">=", today),
            orderBy("scheduledDate", "asc"),
            limit(limitCount)
        )
    );

    // Fallback: servicePlanId for legacy docs
    if (snap.empty) {
        snap = await getDocs(
            query(
                collection(db, "visits"),
                where("servicePlanId", "==", planId),
                where("completionStatus", "==", "scheduled"),
                where("scheduledDate", ">=", today),
                orderBy("scheduledDate", "asc"),
                limit(limitCount)
            )
        );
    }

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get completed visits (payment history) — queries by ownerUid.
 */
export async function getCompletedVisits(planId: string, uid: string, limitCount = 25) {
    // Primary: ownerUid
    let snap = await getDocs(
        query(
            collection(db, "visits"),
            where("ownerUid", "==", uid),
            where("completionStatus", "==", "completed"),
            orderBy("scheduledDate", "desc"),
            limit(limitCount)
        )
    );

    // Fallback: servicePlanId for legacy docs
    if (snap.empty) {
        snap = await getDocs(
            query(
                collection(db, "visits"),
                where("servicePlanId", "==", planId),
                where("completionStatus", "==", "completed"),
                orderBy("scheduledDate", "desc"),
                limit(limitCount)
            )
        );
    }

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
