import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d]">
      <div className="text-center px-8">
        <h1 className="text-6xl font-bold text-white mb-4">ExceliDraw</h1>
        <p className="text-xl text-[#888] mb-12 max-w-md">
          Collaborative drawing application with real-time chat
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-white text-black font-medium text-sm rounded-lg px-8 py-3 hover:bg-[#e0e0e0] transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/signin"
            className="bg-[#161616] text-white font-medium text-sm rounded-lg px-8 py-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
