import DemoSection from "@/components/DemoSection";
import GradientBlobs from "@/components/GradientBlobs";
import BackgroundCards from "@/components/BackgroundCards";

export default function DecisionPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <GradientBlobs />
      <BackgroundCards />
      <div className="relative z-10">
      {/* Simple header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="container max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">S</span>
            </div>
            <span className="text-foreground font-semibold text-lg">Shura</span>
          </div>
          <span className="text-xs text-muted-foreground">Decision Analysis</span>
        </div>
      </header>

      <DemoSection />

      {/* Minimal footer */}
      <footer className="border-t border-border/50 px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Shura — AI Decision Simulation
        </p>
      </footer>
      </div>
    </div>
  );
}
