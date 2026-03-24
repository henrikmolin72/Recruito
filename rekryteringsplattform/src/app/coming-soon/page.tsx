import Image from "next/image";

export const metadata = {
  title: "Recruito — Coming Soon",
  description: "Recruitment Platform — Coming Soon. Stay Alert.",
};

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#e8f4f8] via-[#dceef5] to-[#c8e2ee] flex items-center justify-center">
      {/* Animated background blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        {/* Blob 1 — top left */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-15%",
            width: "55vw",
            height: "55vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,180,200,0.12) 0%, transparent 70%)",
            animation: "blob1 8s ease-in-out infinite",
          }}
        />
        {/* Blob 2 — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            right: "-10%",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,80,180,0.10) 0%, transparent 70%)",
            animation: "blob2 10s ease-in-out infinite",
          }}
        />
        {/* Blob 3 — center */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "35%",
            width: "35vw",
            height: "35vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,200,180,0.10) 0%, transparent 70%)",
            animation: "blob3 12s ease-in-out infinite",
          }}
        />
      </div>

      {/* Particle dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 3 === 0 ? "3px" : "2px",
              height: i % 3 === 0 ? "3px" : "2px",
              borderRadius: "50%",
              background: `rgba(0, ${150 + (i * 7) % 100}, ${180 + (i * 11) % 75}, 0.35)`,
              top: `${(i * 37 + 5) % 90}%`,
              left: `${(i * 53 + 10) % 90}%`,
              animation: `particle ${4 + (i % 4)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div
        className="relative z-10 flex flex-col items-center text-center px-6"
        style={{ animation: "fadeUp 1.2s ease-out forwards" }}
      >
        {/* Logo image with glow pulse */}
        <div
          style={{
            animation: "glowPulse 3s ease-in-out infinite",
            filter: "drop-shadow(0 0 30px rgba(0, 140, 180, 0.25))",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #e8f4f8, #dceef5)",
              borderRadius: "24px",
              padding: "8px",
            }}
          >
            <Image
              src="/images/coming-soon.png"
              alt="Recruito — Coming Soon"
              width={420}
              height={420}
              priority
              style={{
                maxWidth: "min(420px, 85vw)",
                height: "auto",
                mixBlendMode: "multiply",
              }}
            />
          </div>
        </div>

        {/* Animated divider line */}
        <div
          style={{
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, rgba(0,140,180,0.4), rgba(0,80,160,0.4), transparent)",
            marginBottom: "1.75rem",
            animation: "lineExpand 1.5s ease-out 0.5s forwards",
            width: "0%",
          }}
        />

        {/* Tagline */}
        <p
          className="text-slate-500 text-base tracking-[0.25em] uppercase font-light"
          style={{
            animation: "fadeIn 1s ease-out 1.2s both",
            letterSpacing: "0.3em",
          }}
        >
          Connecting talent with opportunity
        </p>

        {/* Pulsing dot indicator */}
        <div
          className="flex items-center gap-2 mt-8"
          style={{ animation: "fadeIn 1s ease-out 1.6s both" }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: i === 1 ? "10px" : "6px",
                height: i === 1 ? "10px" : "6px",
                borderRadius: "50%",
                background: i === 1 ? "rgba(0,150,180,0.8)" : "rgba(0,150,180,0.3)",
                animation: `dotPulse 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(4%, 3%) scale(1.05); }
          66% { transform: translate(-3%, 5%) scale(0.97); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(-5%, -3%) scale(1.07); }
          70% { transform: translate(3%, -5%) scale(0.95); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-4%, 4%) scale(1.1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lineExpand {
          from { width: 0%; }
          to   { width: 280px; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(0,140,180,0.2)); }
          50%       { filter: drop-shadow(0 0 40px rgba(0,140,180,0.35)); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(1.4); opacity: 1; }
        }
        @keyframes particle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
          50%       { transform: translateY(-12px) scale(1.3); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
