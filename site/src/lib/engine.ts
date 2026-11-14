// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Retrieval, validation and Groq calls shared by every client component. Mirrors scripts/build.py and scripts/eval.py.
import bundle from "@/data/bundle.json";

export type Row = Record<string, string>;
export type Chunk = { chunk_id: string; doc_id: string; run_ids: string[]; section: string; page_or_paragraph: string; text: string; source_url: string; doi: string | null; date_retrieved: string; chunk_type: string; ai_assisted: boolean };
export type Card = { id: string; title: string; question_answered: string; claim: string; implication: string; citations: string[]; status: string };
export type EvalQ = { id: string; type: string; question: string; gold_answer: string; gold_run_ids: string[]; gold_chunk_ids: string[] };
export type Answer = { supported: boolean; answer: string; citations: string[]; status?: string; problems?: string[]; refused?: boolean };
type Index = { k1: number; b: number; n: number; avgdl: number; df: Record<string, number>; docs: { chunk_id: string; len: number; tf: Record<string, number> }[] };

const B = bundle as unknown as {
  generated: string; runs: Row[]; manifest: Row[]; atmosphere: Row[]; chunks: Chunk[]; bm25: Index; stopwords: string[]; required: string[];
  cards: Card[]; eval: EvalQ[]; eval_report: { retrieval_hit_rate: number; retrieval_scored: number; off_topic_refusal_rate: number; per_question: { id: string; hit?: boolean; refused?: boolean }[]; answers?: { number_accuracy: number; citation_accuracy: number; refusal_accuracy: number } } | null;
  llm: { meta: { generator: string; generated_at: string }; answers: (Answer & { id: string })[] } | null; llm_prompt: { system: string; user_template: string }; llm_model: string;
};
export const DATA = B;
export const runs: Record<string, Row> = Object.fromEntries(B.runs.map((r) => [r.run_id, r]));
export const chunks: Record<string, Chunk> = Object.fromEntries(B.chunks.map((c) => [c.chunk_id, c]));
export const docs: Record<string, Row> = Object.fromEntries(B.manifest.map((d) => [d.doc_id, d]));
export const atm: Record<string, Row> = Object.fromEntries(B.atmosphere.map((a) => [a.target_id, a]));

export const complete = (r: Row) => B.required.every((k) => String(r[k] ?? "").trim() !== "");
export const statusOf = (r: Row) => (complete(r) ? r.verification_status : "excluded");
export const PLAT: Record<string, string> = { shuttle: "Space Shuttle", iss: "International Space Station", cygnus: "Cygnus free-flyer", drop_tower: "Drop tower", parabolic_flight: "Parabolic flight" };
export const safeUrl = (u?: string | null) => (u && /^https:\/\//.test(u) ? u : undefined);  // https only: never javascript: links

const STOP = new Set(B.stopwords);
export const terms = (t: string) => (t.toLowerCase().match(/[a-z0-9]+(?:[.\-/][a-z0-9]+)*/g) ?? []).filter((w) => !STOP.has(w));

export function bm25(index: Index, q: string, k: number): [number, string][] {
  const qt = [...new Set(terms(q))];
  return index.docs
    .map((d): [number, string] => {
      let s = 0;
      for (const t of qt) {
        const f = d.tf[t];
        if (!f) continue;
        const df = index.df[t];
        s += Math.log(1 + (index.n - df + 0.5) / (df + 0.5)) * (f * (index.k1 + 1)) / (f + index.k1 * (1 - index.b + (index.b * d.len) / index.avgdl));
      }
      return [s, d.chunk_id];
    })
    .filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, k);
}
export const runText = (r: Row) => [r.run_id, r.experiment, r.mission, r.sample, r.fuel, r.fuel_geometry, PLAT[r.platform] ?? r.platform, r.flow_condition, r.outcome, r.outcome_notes].join(" ");
export const runIndex: Index = (() => {
  const d = B.runs.map((r) => {
    const tf: Record<string, number> = {};
    for (const t of terms(runText(r))) tf[t] = (tf[t] ?? 0) + 1;
    return { chunk_id: r.run_id, tf, len: Object.values(tf).reduce((a, b) => a + b, 0) };
  });
  const df: Record<string, number> = {};
  for (const x of d) for (const t in x.tf) df[t] = (df[t] ?? 0) + 1;
  return { k1: B.bm25.k1, b: B.bm25.b, n: d.length, avgdl: d.reduce((a, x) => a + x.len, 0) / d.length, df, docs: d };
})();

/** Near-exact match to a curated eval question (Jaccard >= 0.6 on terms). */
export function curated(q: string): EvalQ | null {
  const a = new Set(terms(q));
  let best: EvalQ | null = null, bestJ = 0;
  for (const e of B.eval) {
    const b = new Set(terms(e.question));
    const inter = [...a].filter((t) => b.has(t)).length;
    const j = inter / (a.size + b.size - inter || 1);
    if (j > bestJ) { bestJ = j; best = e; }
  }
  return bestJ >= 0.6 ? best : null;
}

/* ---------- The number rule (mirrors scripts/eval.py numbers_ok) ---------- */
const NUM = /(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g;
const IDS = /\b(?:FS|C|D)-\d{4}\b|\bATM-[A-Z]+\b/g;
export function checkAnswer(a: Answer): Answer {
  if (!a.supported) return { ...a, status: "refused", problems: [] };
  const cites = [...new Set([...(a.citations ?? []), ...(String(a.answer).match(IDS) ?? [])])];
  const problems = cites.filter((c) => !runs[c] && !chunks[c] && !atm[c]).map((c) => `unknown citation ${c}`);
  if (!cites.length) problems.push("no citations");
  const allowed = new Set<string>();
  for (const rec of [...cites.filter((c) => runs[c]).map((c) => runs[c]), ...B.atmosphere])
    for (const v of Object.values(rec)) for (const n of String(v ?? "").match(NUM) ?? []) allowed.add(n);
  const bad = (String(a.answer).replace(IDS, "").match(NUM) ?? []).filter((n) => !allowed.has(n));
  if (bad.length) problems.push(`numbers not in cited rows: ${bad.join(", ")}`);
  return { ...a, citations: cites, status: problems.length ? "rejected" : "validated", problems };
}
export function answerStatus(ids: string[]) {
  if (!ids.length) return "source_text_only";
  const st = new Set(ids.map((i) => runs[i]?.verification_status));
  if (st.has("conflict_found")) return "conflict_found";
  return st.size === 1 && st.has("checked_against_source") ? "verified" : "unverified";
}

/* ---------- Live AI mode: visitor's own Groq key, kept in this tab only ---------- */
const RUN_FIELDS = ["experiment", "mission", "sample", "platform", "fuel", "o2_fraction_pct", "total_pressure_kpa", "flow_condition", "flow_velocity_m_s", "spread_rate_mm_s", "outcome", "verification_status"];
export async function liveAnswer(key: string, q: string, chunkIds: string[], runIds: string[]): Promise<Answer> {
  const ctx = [
    ...chunkIds.map((id) => `[${id}] passage (${chunks[id].section}): ${chunks[id].text}`),
    ...runIds.map((id) => `[${id}] run: ` + RUN_FIELDS.filter((k) => runs[id][k]).map((k) => `${k}=${runs[id][k]}`).join("; ")),
    ...B.atmosphere.map((a) => `[${a.target_id}] atmosphere target: ${a.scenario}; total_pressure_kpa=${a.total_pressure_kpa}; o2_fraction_pct=${a.o2_fraction_pct}; status=${a.status}`),
  ].join("\n");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: B.llm_model, temperature: 0, max_tokens: 400, response_format: { type: "json_object" },
      messages: [{ role: "system", content: B.llm_prompt.system }, { role: "user", content: B.llm_prompt.user_template.replace("{question}", q).replace("{context}", ctx) }] }),
  });
  if (!r.ok) throw new Error(r.status === 401 ? "The key was rejected (401). Check it and try again." : `Groq returned ${r.status}. Try again in a minute.`);
  return checkAnswer(JSON.parse((await r.json()).choices[0].message.content));
}

/* ---------- Evidence map colour: flame blue to soot amber by oxygen (C-0004) ---------- */
export function flameColor(o2: number, lo: number, hi: number) {
  const t = hi > lo ? Math.min(1, Math.max(0, (o2 - lo) / (hi - lo))) : 0;
  return `color-mix(in oklch, var(--color-flame) ${Math.round((1 - t) * 100)}%, var(--color-ember))`;
}
