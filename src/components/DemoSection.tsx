import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ChevronDown, ChevronRight, Lock, GitBranch, FileText, Download, Paperclip } from "lucide-react";
import { exportAnalysisToPdf } from "@/lib/pdfExport";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

const DECISION_EXAMPLES = [
  "Should we hire a VP Sales at $2M ARR?",
  "Should we expand to the US market next year?",
  "Should we build AI features now or wait?",
];

const ROLE_OPTIONS = ["", "Founder", "CEO", "Product", "Engineering", "Strategy", "Investor", "Other"];
const COMPANY_STAGE_OPTIONS = ["", "Idea", "Pre-revenue", "<$1M ARR", "$1M–$5M ARR", "$5M–$20M ARR", "Enterprise"];
const INDUSTRY_OPTIONS = ["", "SaaS", "AI", "Fintech", "Healthcare", "Marketplace", "E-commerce", "Other"];

async function fetchDecisionsCount(): Promise<number> {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from("decisions")
      .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function trackEvent(
  eventName: string,
  decisionId?: string,
  payload?: Record<string, unknown>,
) {
  if (!supabase) return;
  try {
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      decision_id: decisionId ?? null,
      session_id: getSessionId(),
      payload: payload ?? {},
    });
  } catch {
    /* fire and forget */
  }
}

const LOADING_MESSAGES = [
  "Shura is getting all the details right for you…",
  "Consulting Legal, Financial, and Technical perspectives…",
  "Weighing tradeoffs and tensions…",
  "Structuring the recommended path…",
  "Preparing your executive brief…",
  "Almost there…",
];

function LoadingAnalysis() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl p-8 sm:p-10 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/50 border-t-emerald-400 animate-spin" />
        </div>
        <p className="text-sm sm:text-base text-white/90 font-medium mb-2">
          {LOADING_MESSAGES[messageIndex]}
        </p>
        <p className="text-xs text-white/50">
          This may take up to 30 seconds
        </p>
        <div className="mt-6 flex justify-center gap-1">
          {LOADING_MESSAGES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === messageIndex ? "bg-emerald-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Inline SectionLabel (self-contained, no external dependency) ────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-xs font-medium text-primary tracking-widest uppercase mb-4">{children}</span>
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface DemoPersona {
  name: string;
  score: number;
}

interface DemoCoreTension {
  title: string;
  explanation: string;
  raised_by?: string;
}

interface DemoTradeoff {
  persona_a: string;
  score_a: number;
  persona_b: string;
  score_b: number;
  explanation: string;
}

interface DemoPath {
  id: string;
  title: string;
  description: string;
  favored_by: { persona: string }[];
}

export interface DemoAnalysisResponse {
  decision_title: string;
  decision_question: string;
  decision_summary: string;
  personas: DemoPersona[];
  core_tensions: DemoCoreTension[];
  agreement: string;
  tradeoffs: DemoTradeoff[];
  recommended_path: { title: string; why_best: string };
  paths: DemoPath[];
  next_steps: string[];
  sources?: string[];
}

// ─── Persona Colors ──────────────────────────────────────────────────────────

const PERSONA_COLORS: Record<string, string> = {
  Legal: "#6366f1",
  Financial: "#22c55e",
  Technical: "#0ea5e9",
  "Business Development": "#f59e0b",
  "Business Dev": "#f59e0b",
  Tax: "#a855f7",
};

function getPersonaColor(name: string): string {
  return PERSONA_COLORS[name] ?? "#6b7280";
}

// ─── Color-Coded Persona Names in Text ───────────────────────────────────────

const COLOR_TOKENS = Object.keys(PERSONA_COLORS).sort(
  (a, b) => b.length - a.length,
);

function ColorCodedText({ text }: { text: string }) {
  const parts: { str: string; color?: string }[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    let best: { token: string; index: number } | null = null;
    for (const token of COLOR_TOKENS) {
      const i = remaining.indexOf(token);
      if (i !== -1 && (!best || i < best.index)) best = { token, index: i };
    }
    if (!best) {
      parts.push({ str: remaining });
      break;
    }
    if (best.index > 0) parts.push({ str: remaining.slice(0, best.index) });
    parts.push({ str: best.token, color: PERSONA_COLORS[best.token] });
    remaining = remaining.slice(best.index + best.token.length);
  }
  return (
    <span>
      {parts.map((p, i) =>
        p.color ? (
          <span key={i} className="font-medium" style={{ color: p.color }}>
            {p.str}
          </span>
        ) : (
          <span key={i}>{p.str}</span>
        ),
      )}
    </span>
  );
}

// ─── Split agreement text into bullet items ──────────────────────────────────

function splitParagraph(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

// ─── API ─────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_DEMO_API_BASE || "";

async function runDemoAnalysis(
  title: string,
  description: string,
  role: string,
  companyStage: string,
  industry: string,
): Promise<DemoAnalysisResponse> {
  const base = API_BASE
    ? API_BASE.replace(/\/$/, "")
    : import.meta.env.DEV
      ? "http://127.0.0.1:3001"
      : (typeof window !== "undefined" ? window.location.origin : "");
  const res = await fetch(`${base}/api/demo-analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      description,
      role,
      company_stage: companyStage,
      industry,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Analysis failed");
  }
  return res.json();
}

// ─── Persona Chip ────────────────────────────────────────────────────────────

function PersonaChip({ name }: { name: string }) {
  const color = getPersonaColor(name);
  return (
    <span
      className="px-1.5 py-0.5 rounded font-medium text-[11px] inline-flex items-center"
      style={{ color, backgroundColor: color + "20" }}
    >
      {name}
    </span>
  );
}

// ─── Result Panel ────────────────────────────────────────────────────────────

export function ResultPanel({
  result,
  panelRef,
  decisionId,
}: {
  result: DemoAnalysisResponse;
  panelRef: React.RefObject<HTMLDivElement | null>;
  decisionId?: string | null;
}) {
  const totalScore = result.personas.reduce((s, p) => s + p.score, 0);
  const maxScore = result.personas.length * 100;
  const goThroughPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const { color: goThroughColor, label: goThroughLabel } =
    goThroughPct >= 80
      ? { color: "text-emerald-500", label: "Strong recommendation" }
      : goThroughPct >= 60
        ? { color: "text-emerald-400", label: "Proceed cautiously" }
        : goThroughPct >= 40
          ? { color: "text-red-300", label: "Less likely to proceed — need more evidence" }
          : { color: "text-red-400", label: "Do not proceed" };
  const [expandedPersonas, setExpandedPersonas] = useState<
    Record<string, boolean>
  >({});
  const [usefulness, setUsefulness] = useState(50);
  const [comments, setComments] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const agreementItems = splitParagraph(result.agreement || "");

  const togglePersona = (name: string) => {
    setExpandedPersonas((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleFeedbackSubmit = async () => {
    if (!decisionId || !supabase || feedbackSubmitted) return;
    setFeedbackSaving(true);
    try {
      const feedbackPayload = {
        decision_id: decisionId,
        session_id: getSessionId(),
        usefulness_score: usefulness,
        comments: comments.trim() || null,
      };
      const [{ error: feedbackErr }, { error: decisionErr }] = await Promise.all([
        supabase.from("analysis_feedback").insert(feedbackPayload),
        supabase
          .from("decisions")
          .update({
            feedback_usefulness_score: usefulness,
            feedback_comments: comments.trim() || null,
            feedback_submitted_at: new Date().toISOString(),
          })
          .eq("id", decisionId),
      ]);
      if (!feedbackErr && !decisionErr) setFeedbackSubmitted(true);
    } finally {
      setFeedbackSaving(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className="bg-[#1e1e2e] border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-white shrink-0">
            Decision breakdown
          </h2>
          <span className="text-xs sm:text-sm text-white/70 font-medium shrink-0">
            Total: {totalScore} / {maxScore}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider ${goThroughColor}`}>
            {goThroughLabel}
          </span>
          <span className={`text-xl sm:text-2xl font-bold tabular-nums ${goThroughColor}`}>
            {goThroughPct}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Section 1 — Decision */}
        <section>
          <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-1.5">
            Decision
          </p>
          <h3 className="text-base sm:text-lg font-semibold text-white leading-snug">
            {result.decision_question}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl">
            {result.decision_summary}
          </p>
        </section>

        {/* Section 2 — Core Tensions (with raised_by) */}
        {result.core_tensions?.length > 0 && (
          <section>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
              Core issues / key tensions
            </p>
            <ul className="space-y-2">
              {result.core_tensions.map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-white/90 leading-relaxed"
                >
                  <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                  <div>
                    <p className="font-semibold text-white/95 flex items-center gap-2 flex-wrap">
                      {t.title}
                      {t.raised_by && <PersonaChip name={t.raised_by} />}
                    </p>
                    <p className="text-white/75 text-sm">{t.explanation}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section 4 — Expert Alignment (Two-Column) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Agree */}
          <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-[11px] font-medium text-emerald-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              What experts agree on
            </p>
            <ul className="space-y-1.5 text-xs sm:text-sm text-white/85">
              {agreementItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                  <ColorCodedText text={item} />
                </li>
              ))}
            </ul>
          </div>

          {/* Disagree — structured tradeoffs */}
          <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-[11px] font-medium text-amber-400/90 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Where experts disagree
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-white/85">
              {Array.isArray(result.tradeoffs) ? (
                result.tradeoffs.map((t, i) => {
                  const colorA = getPersonaColor(t.persona_a);
                  const colorB = getPersonaColor(t.persona_b);
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                      <div>
                        <span className="font-semibold text-white/95">
                          <span style={{ color: colorA }} className="font-medium">
                            {t.persona_a}
                          </span>{" "}
                          ({t.score_a}) vs{" "}
                          <span style={{ color: colorB }} className="font-medium">
                            {t.persona_b}
                          </span>{" "}
                          ({t.score_b})
                        </span>
                        <span className="text-white/75">
                          {" "}
                          — {t.explanation}
                        </span>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-400 shrink-0">•</span>
                  <ColorCodedText text={String(result.tradeoffs)} />
                </li>
              )}
            </ul>
          </div>
        </section>

        {/* Section 5 — Paths Forward */}
        {result.paths?.length > 0 && (
          <section>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-3">
              Paths forward
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {result.paths.map((path) => (
                <div
                  key={path.id}
                  className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 flex flex-col"
                >
                  <h5 className="text-sm font-semibold text-white">
                    {path.title}
                  </h5>
                  <p className="mt-1.5 text-xs text-white/75 leading-relaxed line-clamp-3">
                    {path.description}
                  </p>
                  {path.favored_by?.length > 0 && (
                    <p className="mt-3 text-[11px] text-white/60 flex flex-wrap gap-1.5 items-center">
                      <span className="text-white/50">Favored by:</span>
                      {path.favored_by.map((f) => (
                        <PersonaChip key={f.persona} name={f.persona} />
                      ))}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 6 — Recommended Path */}
        {result.recommended_path && (
          <section className="rounded-lg sm:rounded-xl border-2 border-emerald-500/40 bg-emerald-950/25 p-4 sm:p-5">
            <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider mb-2">
              Recommended path
            </p>
            <h4 className="text-sm sm:text-base font-semibold text-white">
              {result.recommended_path.title}
            </h4>
            <p className="mt-2 text-xs sm:text-sm text-white/90 leading-relaxed">
              {result.recommended_path.why_best}
            </p>
          </section>
        )}

        {/* Section 7 — Next Steps Timeline */}
        {result.next_steps?.length > 0 && (
          <section>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-3 sm:mb-4">
              Next steps
            </p>
            <div className="relative">
              {result.next_steps.map((step, i) => {
                const isLast = i === result.next_steps.length - 1;
                const ownerMatch = step.match(/\(([^)]+)\)/);
                const ownerText = ownerMatch ? ownerMatch[1] : null;
                const stepText = ownerMatch
                  ? step.replace(ownerMatch[0], "").trim()
                  : step;

                return (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center shrink-0 w-8">
                      <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-500/20 shrink-0 mt-1 group-hover:bg-emerald-500/40 transition-colors" />
                      {!isLast && (
                        <div className="w-px flex-1 bg-gradient-to-b from-emerald-500/40 to-white/10 min-h-[2rem]" />
                      )}
                    </div>
                    <div className={`pb-5 ${isLast ? "pb-0" : ""} flex-1 min-w-0`}>
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                        {stepText}
                      </p>
                      {ownerText && (
                        <span className="inline-block mt-1.5 text-[10px] font-medium text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {ownerText}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Persona Score Snapshot (before Sources) */}
        <section>
          <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-3">
            Persona score snapshot
          </p>

          {/* Score bar */}
          <div className="flex h-2 rounded-full overflow-hidden bg-white/10 mb-4">
            {result.personas.map((p, i) => (
              <div
                key={p.name}
                className={`${i === 0 ? "rounded-l-full" : ""} ${i === result.personas.length - 1 ? "rounded-r-full" : ""}`}
                style={{
                  width: `${(p.score / totalScore) * 100}%`,
                  backgroundColor: getPersonaColor(p.name),
                  minWidth: "6px",
                }}
                title={`${p.name}: ${p.score}`}
              />
            ))}
          </div>

          {/* Collapsible persona rows */}
          <div className="space-y-2">
            {result.personas.map((p) => {
              const isOpen = expandedPersonas[p.name] ?? false;
              const color = getPersonaColor(p.name);
              return (
                <div key={p.name}>
                  <button
                    type="button"
                    onClick={() => togglePersona(p.name)}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-white/40 group-hover:text-white/60 transition-colors">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="text-sm font-medium flex-1 text-left"
                      style={{ color }}
                    >
                      {p.name}
                    </span>
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {p.score}
                      <span className="text-white/40 font-normal">
                        /100
                      </span>
                    </span>
                  </button>

                  {/* Locked expanded content */}
                  {isOpen && (
                    <div
                      className="ml-6 sm:ml-10 mr-2 sm:mr-3 mt-1 mb-2 rounded-lg border px-3 sm:px-4 py-3 sm:py-4 bg-white/[0.02] no-pdf"
                      style={{ borderColor: color + "30" }}
                    >
                      <div className="space-y-2 mb-4 opacity-30 select-none pointer-events-none">
                        <div className="h-3 w-3/4 bg-white/15 rounded" />
                        <div className="h-3 w-full bg-white/10 rounded" />
                        <div className="h-3 w-5/6 bg-white/10 rounded" />
                        <div className="h-3 w-2/3 bg-white/15 rounded" />
                      </div>
                      <div className="flex flex-col items-center gap-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-white/50 text-xs">
                          <Lock className="w-3 h-3" />
                          <span>
                            Full {p.name.toLowerCase()} analysis available with
                            Shura
                          </span>
                        </div>
                        <a
                          href="https://shura-gilt.vercel.app/#cta"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium px-3 py-1.5 rounded-md bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                        >
                          Join waitlist
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 8 — Sources & References */}
        {result.sources && result.sources.length > 0 && (
          <section>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
              Sources & references
            </p>
            <ul className="space-y-1.5">
              {result.sources.map((src, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs sm:text-sm text-white/70 break-words"
                >
                  <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-white/30" />
                  <span className="flex-1">{src}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/40 shrink-0">
                    Demo
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">
              Full source tracking and citations available in the complete
              platform.
            </p>
          </section>
        )}

        {/* Section 9 — Decision Tree Teaser (Locked) */}
        <section className="rounded-lg sm:rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-4 sm:p-6 no-pdf">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2 text-white/50">
              <GitBranch className="w-5 h-5" />
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-semibold text-white/80">
              Decision tree
            </h4>
            <p className="text-xs text-white/50 max-w-md leading-relaxed">
              Explore branching paths, compare alternatives, and trace how each
              persona evaluated the decision — with weighted scoring and
              trade-off visualisation.
            </p>
            <a
              href="https://shura-gilt.vercel.app/#cta"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              Get full access
            </a>
          </div>
        </section>

        {/* Section 10 — Feedback */}
        {decisionId && (
          <section className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 no-pdf">
            <p className="text-[10px] sm:text-[11px] font-medium text-white/50 uppercase tracking-wider mb-3">
              How useful was this analysis?
            </p>
            {feedbackSubmitted ? (
              <p className="text-sm text-emerald-400">Thanks for your feedback.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={usefulness}
                    onChange={(e) => setUsefulness(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-white/10 accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-white tabular-nums w-10">
                    {usefulness}%
                  </span>
                </div>
                <Textarea
                  placeholder="Any additional comments? (optional)"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={feedbackSaving}
                  rows={2}
                  className="mb-3 bg-white/5 border-white/10 text-sm resize-none"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackSaving}
                  className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                >
                  {feedbackSaving ? "Saving…" : "Submit feedback"}
                </Button>
              </>
            )}
          </section>
        )}

        {/* Section 11 — Sign up for waitlist */}
        <section className="rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 no-pdf">
          <a
            href="https://shura-gilt.vercel.app/#cta"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-center group"
          >
            <span className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
              Sign up for waitlist
            </span>
            <span className="text-xs text-white/60">
              Get full access to Shura →
            </span>
          </a>
        </section>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DemoSection = () => {
  const [decision, setDecision] = useState("");
  const [context, setContext] = useState("");
  const [role, setRole] = useState("");
  const [companyStage, setCompanyStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DemoAnalysisResponse | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [decisionsCount, setDecisionsCount] = useState(0);
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchDecisionsCount().then(setDecisionsCount);
  }, []);

  const incrementDecisionsCount = () => {
    setDecisionsCount((c) => c + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = decision.trim();
    const trimmedContext = context.trim();
    if (!trimmed) {
      setError("Please enter a decision to evaluate.");
      return;
    }
    if (!trimmedContext) {
      setError("Please provide context.");
      return;
    }
    if (!role) {
      setError("Please select your role.");
      return;
    }
    if (!companyStage) {
      setError("Please select company stage.");
      return;
    }
    if (!industry) {
      setError("Please select industry.");
      return;
    }

    setLoading(true);
    let id: string | null = null;

    try {
      if (supabase) {
        const { data: row, error: insertErr } = await supabase
          .from("decisions")
          .insert({
            decision: trimmed,
            context: trimmedContext,
            role,
            company_stage: companyStage,
            industry,
            email: email.trim() || null,
            session_id: getSessionId(),
          })
          .select("id")
          .single();
        if (!insertErr && row) {
          id = row.id;
          setDecisionId(id);
          incrementDecisionsCount();
          await trackEvent("decision_created", id);
          if (email.trim()) await trackEvent("email_capture_submitted", id, { email: email.trim() });
        }
      }

      const data = await runDemoAnalysis(trimmed, trimmedContext, role, companyStage, industry);
      setResult(data);

      if (supabase && id) {
        await supabase
          .from("decisions")
          .update({ analysis_result: data })
          .eq("id", id);
        await trackEvent("analysis_completed", id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!resultRef.current) return;
    try {
      toast.info("Generating PDF…");
      const fileName = `shura-brief-${(result?.decision_title || "decision").replace(/\s+/g, "-").toLowerCase().slice(0, 40)}.pdf`;
      await exportAnalysisToPdf(resultRef.current, fileName);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Unable to generate PDF. Please try again.");
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = decisionId
        ? `${window.location.origin}${window.location.pathname}?share=${decisionId}`
        : window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      if (decisionId) await trackEvent("analysis_shared", decisionId);
      toast.success("Share link copied to clipboard.");
    } catch {
      toast.error("Unable to copy link.");
    }
  };

  return (
    <section
      id="demo"
      className="py-16 sm:py-20 md:py-24 relative z-10"
    >
      <div className="container max-w-5xl relative">
        {/* Decisions made — top right, fixed on mobile to avoid covering content */}
        <div className="fixed top-14 right-4 z-50 sm:absolute sm:top-0 sm:right-0 sm:z-auto">
          <div className="flex flex-col items-center justify-center rounded-full bg-emerald-600 border-2 border-emerald-500/50 shadow-lg shadow-emerald-900/50 w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 p-1 sm:p-2 md:p-3">
            <span className="text-xs sm:text-xl md:text-2xl lg:text-3xl font-bold text-white leading-none tabular-nums">
              {decisionsCount.toLocaleString()}
            </span>
            <span className="text-[7px] sm:text-[9px] md:text-[10px] lg:text-xs font-bold text-white uppercase tracking-wider mt-0.5 sm:mt-1 text-center leading-tight">
              decisions made
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-10">
          <SectionLabel>Decision Analysis</SectionLabel>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            See how Shura structures a decision
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Type a real decision you&apos;re considering with context. Shura will generate a
            structured executive brief from our different specialist to give you shareable insights with your team.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto space-y-5 sm:space-y-6 mb-10 sm:mb-12"
        >
          <div className="space-y-2">
            <label
              htmlFor="demo-email"
              className="block text-sm font-medium text-muted-foreground"
            >
              Email <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              id="demo-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="demo-decision"
              className="block text-sm font-medium text-muted-foreground"
            >
              Decision <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="demo-decision"
              placeholder="e.g. Should we hire a VP Sales at $2M ARR?"
              maxLength={500}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground/70">
              Examples:{" "}
              {DECISION_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDecision(ex)}
                  className="underline hover:text-foreground/90 mr-1"
                >
                  {ex}
                </button>
              ))}
            </p>
          </div>
          <div className="space-y-4 rounded-xl bg-muted/20 p-4 sm:p-5">
            <label className="block text-sm font-medium text-muted-foreground">
              Context <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground/80">I&apos;m a</span>
              <Select
                id="demo-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className="h-11 w-auto min-w-[140px] sm:min-w-[155px] flex-shrink-0"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt || "empty"} value={opt}>
                    {opt || "Role"}
                  </option>
                ))}
              </Select>
              <span className="text-muted-foreground/80">at a</span>
              <Select
                id="demo-stage"
                value={companyStage}
                onChange={(e) => setCompanyStage(e.target.value)}
                disabled={loading}
                className="h-11 w-auto min-w-[145px] sm:min-w-[165px] flex-shrink-0"
              >
                {COMPANY_STAGE_OPTIONS.map((opt) => (
                  <option key={opt || "empty"} value={opt}>
                    {opt || "Stage"}
                  </option>
                ))}
              </Select>
              <Select
                id="demo-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={loading}
                className="h-11 w-auto min-w-[130px] sm:min-w-[145px] flex-shrink-0"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt || "empty"} value={opt}>
                    {opt || "Industry"}
                  </option>
                ))}
              </Select>
              <span className="text-muted-foreground/80">company.</span>
            </div>
            <div className="space-y-1">
              <Textarea
                id="demo-context"
                placeholder="e.g. $5M ARR, 50 employees. Considering EU expansion but concerned about runway and regulatory complexity."
                maxLength={600}
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={loading}
                rows={3}
              />
              <p className="text-right text-xs text-muted-foreground/80">
                {context.length}/600
              </p>
            </div>
          </div>

          {/* Locked document upload teaser */}
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 cursor-not-allowed select-none flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 opacity-40">
              <Paperclip className="w-4 h-4 text-white/50 shrink-0" />
              <span className="text-sm text-white/50">
                Attach documents, reports, or data files
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-white/60 bg-white/5 px-3 py-1.5 rounded-md border border-white/10 shrink-0">
              <Lock className="w-3 h-3" />
              Available in full product
            </span>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="xl"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:scale-[1.02]"
            >
              {loading ? "Analyzing…" : "Run demo analysis"}
            </Button>
          </div>
        </form>

        {/* Loading state */}
        {loading && (
          <LoadingAnalysis />
        )}

        {/* Result */}
        {!loading && result && (
          <div className="max-w-4xl mx-auto space-y-4 px-2 sm:px-0">
            <ResultPanel result={result} panelRef={resultRef} decisionId={decisionId} />

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 justify-center items-stretch sm:items-center">
              <Button variant="secondary" size="sm" onClick={handleDownloadPdf} className="w-full sm:w-auto">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="w-full sm:w-auto">
                Share decision link with team
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setResult(null);
                  setDecision("");
                  setContext("");
                  setRole("");
                  setCompanyStage("");
                  setIndustry("");
                  setDecisionId(null);
                  setEmail("");
                }}
              >
                Try another decision
              </Button>
            </div>

            {/* Post-analysis CTA: save / share */}
            <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 mt-4 sm:mt-6">
              <p className="text-sm font-medium text-white/90 mb-2">
                Save this analysis
              </p>
              <p className="text-xs text-white/60">
                Share the decision link with your team to get their input.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DemoSection;
