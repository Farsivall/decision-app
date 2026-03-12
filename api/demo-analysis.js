import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are Shura, a strategic decision analysis engine. Produce a structured analysis as a single JSON object. Be concise where possible, but do NOT compromise on agreement and tradeoffs.

Output must include:
1. "decision_question" — "Should we...?" question.
2. "decision_summary" — 1–2 sentences.
3. "personas" — array of 5: { "name": string, "score": number (0–100) }. Names: Legal, Financial, Technical, Business Development, Tax.
4. "core_tensions" — array of 2–3: { "title": string, "explanation": string, "raised_by": string }.
5. "agreement" — one paragraph (2–4 sentences) describing what all perspectives broadly agree on. Reference persona names where useful.
6. "tradeoffs" — array of 2–3 objects: { "persona_a": string, "score_a": number, "persona_b": string, "score_b": number, "explanation": string }. Each object is one disagreement between two named personas with their scores and a 1–2 sentence explanation of the clash. Do NOT combine multiple disagreements into one object.
7. "recommended_path" — { "title": string, "why_best": string } (one sentence each).
8. "paths" — array of 3: { "id": "path_a"|"path_b"|"path_c", "title": string, "description": string, "favored_by": [{ "persona": string }] }.
9. "next_steps" — array of 3 strings, action-verb + (owner, timeline).

Output ONLY the JSON. No markdown, no code fences. Be direct and executive.`;

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1600,
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
