import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import CommunityImpactModal from "@/components/CommunityImpactModal";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL(
        "https://www.primegreenlandscape.com"
    ),
    title: {
        default: "Prime Green Landscape LLC | Lawn Care Montgomery County MD",
        template: "%s | Prime Green Landscape LLC",
    },
    description: "Professional lawn care in Montgomery County, MD. Instant online quotes, no contracts. Serving Gaithersburg, Rockville, Bethesda, Germantown & Silver Spring. Call 571-405-0031.",
    keywords: [
        "lawn care Montgomery County MD",
        "lawn mowing Gaithersburg MD",
        "lawn service Rockville MD",
        "landscaping Bethesda MD",
        "lawn care Germantown MD",
        "lawn mowing Silver Spring MD",
        "Prime Green Landscape",
    ],
    openGraph: {
        title: "Prime Green Landscape LLC",
        description: "Premium lawn care in Montgomery County, MD. Instant quotes, no contracts.",
        url: "https://www.primegreenlandscape.com",
        siteName: "Prime Green Landscape LLC",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Prime Green Landscape LLC",
        description: "Premium lawn care in Montgomery County, MD.",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
        },
    },
    alternates: {
        canonical: "https://www.primegreenlandscape.com",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://maps.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://maps.gstatic.com"
                    crossOrigin=""
                />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <AuthProvider>
                    {children}
                    <Toaster
                        position="top-center"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: "#1B4332",
                                color: "#fff",
                                borderRadius: "12px",
                                fontWeight: 600,
                            },
                        }}
                    />
                </AuthProvider>
                <CommunityImpactModal />

                {/* Google Maps — load only if key exists */}
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <Script
                        id="google-maps"
                        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
                        strategy="afterInteractive"
                    />
                )}
            </body>
        </html>
    );
}
