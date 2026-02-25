/**
 * Firebase Admin SDK singleton.
 *
 * The private key guard (`?? ""`) prevents the `.replace()` call from
 * throwing "Cannot read properties of undefined" during Next.js static
 * page-data collection at build time (when env vars may not yet be injected).
 *
 * All API routes that import this module MUST export:
 *   export const dynamic = "force-dynamic";
 * so Next.js never attempts to pre-render them.
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            // Guard: if env var is missing at build time, default to "" to avoid
            // "Cannot read properties of undefined (reading 'replace')" crash
            privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "")
                .replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
