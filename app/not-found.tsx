import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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

                <div className="bg-gray-50 rounded-3xl p-10 border border-gray-100 shadow-sm">
                    <span className="text-6xl mb-4 block">🏡</span>
                    <h1 className="text-3xl font-black text-gray-900 mb-3">
                        Page Not Found
                    </h1>
                    <p className="text-gray-500 mb-8 mx-auto leading-relaxed">
                        We couldn't locate the page you're looking for. It might have been moved or no longer exists.
                    </p>

                    <Link
                        href="/"
                        className="inline-block px-8 py-3.5 bg-[#1B4332] hover:bg-[#2d6a4f]
                                   text-white text-sm font-bold rounded-xl
                                   transition-all shadow-md active:scale-95"
                    >
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
