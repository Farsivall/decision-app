import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are Shura, a strategic decision analysis engine. Given a decision title, context, and user profile (role, company stage, industry), produce a structured analysis as a single JSON object. Tailor your analysis to the user's role, company stage, and industry — use these to inform risk framing, relevant benchmarks, and recommended paths.

Your output must include:

1. "decision_question" — reframe the decision as a clear "Should we...?" question.
2. "decision_summary" — 2–3 sentences of strategic context. No filler.
3. "personas" — array of exactly 5 objects: { "name": string, "score": number (0–100) }. Use these exact personas: Legal, Financial, Technical, Business Development, Tax. Scores reflect how favorable the decision is from each perspective.
4. "core_tensions" — array of 2–4 objects: { "title": string, "explanation": string, "raised_by": string }. Each tension is a genuine strategic conflict between perspectives. "raised_by" is the persona name that primarily surfaced this tension (e.g. "Legal", "Tax"). Be specific with numbers and timeframes.
5. "agreement" — one paragraph (2–4 sentences) describing what all perspectives broadly agree on. Reference persona names where useful.
6. "tradeoffs" — array of 2–3 objects: { "persona_a": string, "score_a": number, "persona_b": string, "score_b": number, "explanation": string }. Each object is one disagreement between two named personas with their scores and a 1–2 sentence explanation of the clash. Do NOT combine multiple disagreements into one object.
7. "recommended_path" — object: { "title": string, "why_best": string (1–2 sentences) }.
8. "paths" — array of exactly 3 objects: { "id": "path_a"|"path_b"|"path_c", "title": string, "description": string (one sentence), "favored_by": [{ "persona": string }] }. Paths should be realistic (e.g. "Go now", "Pilot first", "Wait").
9. "next_steps" — array of 3–5 strings, each an action-verb phrase with owner and timeline in parentheses.
10. "sources" — array of 3–5 strings, each a plausible reference that would support this analysis (e.g. "GDPR Article 5 — Data Minimisation Principle", "McKinsey Global Expansion Playbook, 2024", "IRC §482 — Transfer Pricing Rules"). These are illustrative references, not verified citations.

Output ONLY the JSON object. No markdown, no code fences, no explanation outside the JSON.

Tone: direct, specific, executive. Write for a busy founder/CEO. Challenge assumptions. Reference specific numbers, risks, and timeframes — not generics.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ detail: "Method not allowed" });
  }

  const { title, description, role, company_stage, industry } = req.body || {};
  const trimmedTitle = (title || "").trim();
  const trimmedDesc = (description || "").trim();

  if (!trimmedTitle) {
    return res.status(400).json({ detail: "Decision title is required." });
  }
  if (!trimmedDesc) {
    return res.status(400).json({ detail: "Context is required." });
  }
  if (!role) {
    return res.status(400).json({ detail: "Role is required." });
  }
  if (!company_stage) {
    return res.status(400).json({ detail: "Company stage is required." });
  }
  if (!industry) {
    return res.status(400).json({ detail: "Industry is required." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ detail: "ANTHROPIC_API_KEY not set" });
  }

  const userPrompt = `Decision: ${trimmedTitle}

Context: ${trimmedDesc}

User profile (use this to tailor the analysis):
- Role: ${role}
- Company stage: ${company_stage}
- Industry: ${industry}`;

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const first = resp.content?.[0];
    let text =
      first && first.type === "text" && typeof first.text === "string"
        ? first.text.trim()
        : "";

    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) text = fenceMatch[1].trim();

    const result = JSON.parse(text);
    result.decision_title = trimmedTitle;
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(502).json({ detail: "LLM returned invalid JSON — retry" });
    }
    console.error("Anthropic error:", err);
    return res.status(502).json({ detail: `Analysis failed: ${String(err).slice(0, 200)}` });
  }
}
