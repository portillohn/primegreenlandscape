"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    onAuthStateChanged,
    type User,
} from "firebase/auth";                    // ← import FROM firebase/auth directly
import { auth } from "@/lib/firebase";  // ← only auth instance from our file
import { getUserProfile } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    profile: Record<string, unknown> | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        if (!user) return;
        try {
            const p = await getUserProfile(user.uid);
            setProfile(p);
        } catch {
            // silently fail — non-critical
        }
    };

    useEffect(() => {
        // onAuthStateChanged imported directly from firebase/auth ✅
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                try {
                    // Set session cookie for middleware
                    const token = await firebaseUser.getIdToken();
                    await fetch("/api/auth/session", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token }),
                    });

                    // Load Firestore profile
                    const p = await getUserProfile(firebaseUser.uid);
                    setProfile(p);
                } catch {
                    setProfile(null);
                }
            } else {
                // Clear session cookie on logout
                try {
                    await fetch("/api/auth/session", { method: "DELETE" });
                } catch { /* ignore */ }
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsub();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
