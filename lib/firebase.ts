/**
 * lib/firebase.ts — Client Firebase SDK (lazy initialization)
 *
 * `auth` and `db` are Proxy objects. Firebase is only initialized when a
 * property is first accessed — which happens inside useEffect / event handlers
 * in the browser, NEVER during Next.js SSR or static prerendering.
 *
 * This prevents "FirebaseError: auth/invalid-api-key" when NEXT_PUBLIC_*
 * env vars are not set during `npm run build` on Vercel.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    updateProfile,
    type Auth,
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
    type Firestore,
} from "firebase/firestore";

// ── Config ────────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// ── Lazy App Factory ──────────────────────────────────────────────────────────

function getFirebaseApp(): FirebaseApp {
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

// ── Lazy Proxy Helper ─────────────────────────────────────────────────────────
// The Proxy's get trap only fires when a property is accessed at runtime
// (inside useEffect / event handlers in the browser).
// During SSR / static prerendering the auth/db objects are imported but
// never accessed → Firebase never initializes → no crash.

function lazyProxy<T extends object>(factory: () => T): T {
    return new Proxy({} as T, {
        get(_, prop) {
            const inst = factory();
            const val = (inst as any)[prop];
            return typeof val === "function" ? val.bind(inst) : val;
        },
    });
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const auth = lazyProxy<Auth>(() => getAuth(getFirebaseApp()));
export const db = lazyProxy<Firestore>(() => getFirestore(getFirebaseApp()));

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

// ── Auth Helpers ──────────────────────────────────────────────────────────────

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

// ── Firestore Helpers ─────────────────────────────────────────────────────────

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
 */
export async function getUserActivePlan(uid: string): Promise<Record<string, unknown> | null> {
    let plansSnap = await getDocs(
        query(
            collection(db, "servicePlans"),
            where("ownerUid", "==", uid),
            where("status", "in", ["active", "paused"]),
            limit(1)
        )
    );

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

    let property: Record<string, unknown> = {};
    if (planData.propertyId) {
        try {
            const propSnap = await getDoc(doc(db, "properties", planData.propertyId as string));
            if (propSnap.exists()) property = { id: propSnap.id, ...propSnap.data() };
        } catch { /* non-critical */ }
    }

    return { ...planData, id: planDoc.id, property };
}

export async function getUpcomingVisits(planId: string, uid: string, limitCount = 3) {
    const today = new Date().toISOString().split("T")[0];

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

export async function getCompletedVisits(planId: string, uid: string, limitCount = 25) {
    let snap = await getDocs(
        query(
            collection(db, "visits"),
            where("ownerUid", "==", uid),
            where("completionStatus", "==", "completed"),
            orderBy("scheduledDate", "desc"),
            limit(limitCount)
        )
    );

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
