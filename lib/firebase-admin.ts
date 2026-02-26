/**
 * lib/firebase-admin.ts — Lazy Firebase Admin SDK
 *
 * NOTHING executes at module load time.
 * All initialization happens inside getAdminAuth() / getAdminDb() / getAdminStorage()
 * on the first call inside a request handler.
 *
 * This prevents "Cannot read properties of undefined" during Next.js
 * build-time module evaluation when env vars are not set.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { Storage, getStorage } from "firebase-admin/storage";

// ── Lazy App Factory ─────────────────────────────────────────────────────────

function initAdmin() {
    // Return existing app if already initialized
    if (getApps().length > 0) return getApps()[0];

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error(
            "[firebase-admin] Missing env vars: FIREBASE_ADMIN_PROJECT_ID, " +
            "FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY"
        );
    }

    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
}

// ── Named Function Exports (use these — nothing runs at import time) ──────────

export function getAdminAuth(): Auth { return getAuth(initAdmin()); }
export function getAdminDb(): Firestore { return getFirestore(initAdmin()); }
export function getAdminStorage(): Storage { return getStorage(initAdmin()); }

// ── Backward-Compatible Proxy Aliases ────────────────────────────────────────
// Existing callers using adminDb.collection(...) / adminAuth.verifyIdToken(...)
// continue to work unchanged. The Proxy defers all property access to runtime.

function lazyProxy<T extends object>(factory: () => T): T {
    return new Proxy({} as T, {
        get(_, prop) {
            const inst = factory();
            const val = (inst as any)[prop];
            return typeof val === "function" ? val.bind(inst) : val;
        },
    });
}

export const adminAuth = lazyProxy<Auth>(getAdminAuth);
export const adminDb = lazyProxy<Firestore>(getAdminDb);
export const adminStorage = lazyProxy<Storage>(getAdminStorage);
