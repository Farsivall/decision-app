import { useState, useEffect, useRef } from "react";
import { ResultPanel } from "@/components/DemoSection";
import type { DemoAnalysisResponse } from "@/components/DemoSection";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { exportAnalysisToPdf } from "@/lib/pdfExport";
import { ArrowLeft, Download } from "lucide-react";

export default function SharedAnalysisView({ shareId }: { shareId: string }) {
  const [result, setResult] = useState<DemoAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!supabase || !shareId) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }
    supabase
      .from("decisions")
      .select("analysis_result")
      .eq("id", shareId)
      .single()
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err || !data?.analysis_result) {
          setError("Analysis not found or link expired");
          return;
        }
        setResult(data.analysis_result as DemoAnalysisResponse);
      });
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analysis…</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive">{error ?? "Analysis not found"}</p>
        <Button variant="outline" asChild>
          <a href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shura
          </a>
        </Button>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    if (!panelRef.current) return;
    try {
      const fileName = `shura-brief-${(result.decision_title || "decision").replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
      await exportAnalysisToPdf(panelRef.current, fileName);
    } catch {
      // Silent fail or could add toast
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Back to Shura
          </a>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <a
              href="https://shura-gilt.vercel.app/#cta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:text-primary/80"
            >
              Sign up for waitlist
            </a>
            <Button variant="secondary" size="sm" onClick={handleDownloadPdf} className="w-full sm:w-auto">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PDF
            </Button>
          </div>
        </div>
        <ResultPanel result={result} panelRef={panelRef} decisionId={shareId} />
      </div>
    </div>
  );
}
