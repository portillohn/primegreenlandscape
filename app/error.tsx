"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md w-full">
                <Link href="/" className="inline-block mb-10">
                    <Image
                        src="/logo.png"
                        alt="Prime Green Landscape LLC"
                        width={220}
                        height={74}
                        className="h-16 w-auto object-contain mx-auto"
                    />
                </Link>

                <div className="bg-red-50 rounded-3xl p-10 border border-red-100 shadow-sm">
                    <span className="text-6xl mb-4 block">⚠️</span>
                    <h1 className="text-3xl font-black text-red-900 mb-3">
                        Something went wrong
                    </h1>
                    <p className="text-red-700/80 mb-8 mx-auto leading-relaxed text-sm">
                        An unexpected error occurred while loading this page.
                    </p>

                    <button
                        onClick={() => reset()}
                        className="inline-block px-8 py-3.5 bg-red-600 hover:bg-red-700
                                   text-white text-sm font-bold rounded-xl
                                   transition-all shadow-md active:scale-95"
                    >
                        Try Again
                    </button>
                    <p className="mt-4">
                        <Link href="/" className="text-xs text-red-600/70 hover:text-red-600 hover:underline">
                            Or go back home
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
