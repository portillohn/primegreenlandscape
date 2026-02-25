import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

const SocialProof = dynamic(() => import("@/components/SocialProof"));
const GallerySection = dynamic(() => import("@/components/GallerySection"));

export default function HomePage() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <HowItWorks />
                <SocialProof />
                <GallerySection />
            </main>
            <Footer />
        </>
    );
}
