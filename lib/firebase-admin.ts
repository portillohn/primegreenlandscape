/**
 * Firebase Admin SDK — Lazy Proxy Initialization
 *
 * IMPORTANT: Nothing firebase-related runs at module load time.
 * The SDK is only initialized on the FIRST property access inside
 * a request handler, never during Next.js build-time module evaluation.
 *
 * This prevents "TypeError: Cannot read properties of undefined"
 * when env vars are not set during `npm run build` (e.g. on Vercel).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { Storage, getStorage } from "firebase-admin/storage";

// ── Lazy App Factory ─────────────────────────────────────────────────────────

function getAdminApp() {
    if (getApps().length > 0) return getApps()[0];

    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    if (!privateKey) throw new Error("[firebase-admin] FIREBASE_ADMIN_PRIVATE_KEY is not set");

    return initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

// ── Lazy Proxy Helpers ───────────────────────────────────────────────────────
// Each export is a Proxy that forwards property access to the real SDK object.
// The real object is only created when a property is first accessed at runtime.

function lazyProxy<T extends object>(factory: () => T): T {
    return new Proxy({} as T, {
        get(_, prop) {
            const instance = factory();
            const value = (instance as any)[prop];
            return typeof value === "function" ? value.bind(instance) : value;
        },
    });
}

// ── Exports ──────────────────────────────────────────────────────────────────

export const adminAuth = lazyProxy<Auth>(() => getAuth(getAdminApp()));
export const adminDb = lazyProxy<Firestore>(() => getFirestore(getAdminApp()));
export const adminStorage = lazyProxy<Storage>(() => getStorage(getAdminApp()));
