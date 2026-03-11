import { useState, useEffect, useRef } from "react";
import { ResultPanel } from "@/components/DemoSection";
import type { DemoAnalysisResponse } from "@/components/DemoSection";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shura
        </a>
        <ResultPanel result={result} panelRef={panelRef} />
      </div>
    </div>
  );
}
