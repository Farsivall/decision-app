import { useEffect, useState } from "react";
import DemoSection from "@/components/DemoSection";
import GradientBlobs from "@/components/GradientBlobs";
import BackgroundCards from "@/components/BackgroundCards";
import SharedAnalysisView from "@/components/SharedAnalysisView";
import { SpecialistRequestModal } from "@/components/SpecialistRequestModal";

export default function DecisionPage() {
  const [shareId, setShareId] = useState<string | null>(null);
  const [specialistModalOpen, setSpecialistModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("share");
    setShareId(id);
  }, []);

  if (shareId) {
    return (
      <div className="min-h-screen bg-background relative">
        <GradientBlobs />
        <BackgroundCards />
        <div className="relative z-10">
          <SharedAnalysisView shareId={shareId} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <GradientBlobs />
      <BackgroundCards />
      <div className="relative z-10">
      {/* Simple header */}
      <header className="border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="container max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-xs sm:text-sm">S</span>
            </div>
            <span className="text-foreground font-semibold text-base sm:text-lg truncate">Shura</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-wrap justify-end">
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Decision Analysis</span>
            <button
              type="button"
              onClick={() => setSpecialistModalOpen(true)}
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              Request a specialist
            </button>
            <a
              href="https://shura-gilt.vercel.app/#cta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              Sign up for waitlist
            </a>
          </div>
        </div>
      </header>

      <SpecialistRequestModal
        open={specialistModalOpen}
        onClose={() => setSpecialistModalOpen(false)}
      />

      <DemoSection />

      {/* Minimal footer */}
      <footer className="border-t border-border/50 px-4 sm:px-6 py-4 sm:py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Shura — AI Decision Simulation
        </p>
      </footer>
      </div>
    </div>
  );
}
