"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Ask the corpus: BM25 retrieval in the browser, offline SI answers, curated answers, optional live Groq with the visitor's key.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Key, MagnifyingGlass } from "@phosphor-icons/react";
import { Answer, DATA, EvalQ, answerStatus, bm25, chunks, curated, docs, liveAnswer, runIndex, runs, terms } from "@/lib/engine";
import { Badge, Cite } from "./ui";

const EXAMPLES = ["Q01", "Q08", "Q11", "Q14", "Q15", "Q17"].map((id) => DATA.eval.find((q) => q.id === id)!).filter(Boolean);
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
const KEY = "flamescope_groq_key";
const getKey = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };

type Result = { q: string; refuse: boolean; cur: EvalQ | null; si: (Answer & { id: string }) | null; ch: string[]; rh: string[] };

function Typewriter() {
  const [text, setText] = useState("");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setText(EXAMPLES[0].question); return; }
    let i = 0, n = 0, dir = 1;
    const id = setInterval(() => {
      const full = EXAMPLES[i % EXAMPLES.length].question;
      n += dir;
      if (n > full.length + 30) dir = -1;
      if (n <= 0 && dir < 0) { dir = 1; i++; }
      setText(full.slice(0, Math.max(0, Math.min(n, full.length))));
    }, 45);
    return () => clearInterval(id);
  }, []);
  return <span className="caret">{text}</span>;
}

function SiPanel({ a, note, tag }: { a: Answer; note: string; tag: string }) {
  const refused = a.status === "refused" || a.refused;
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-flame/15 px-2.5 py-0.5 text-xs font-medium text-flame">{tag}</span>
        {refused ? <span className="text-mute">No supported answer</span> : a.status !== "validated" ? <span className="text-bad">Answer withheld</span> : <Badge s={answerStatus(a.citations.filter((c) => runs[c]))} />}
      </div>
      {refused ? <p className="text-mute">The model found no support for this question in the retrieved records.</p>
        : a.status !== "validated" ? <p className="text-mute">It failed validation ({a.problems?.join("; ")}), so it is not shown.</p>
        : <><p className="max-w-[65ch] leading-relaxed">{a.answer.replace(/\s*\[[^\]]+\]/g, "")}</p><div className="mt-3">{a.citations.map((c) => <Cite key={c} id={c} />)}</div></>}
      <p className="mt-3 text-xs text-mute">{note}</p>
    </div>
  );
}

function LiveSlot({ q, ch, rh }: { q: string; ch: string[]; rh: string[] }) {
  const [state, setState] = useState<{ a?: Answer; err?: string }>({});
  useEffect(() => {
    let alive = true;
    liveAnswer(getKey(), q, ch, rh).then((a) => alive && setState({ a })).catch((e: Error) => alive && setState({ err: e.message }));
    return () => { alive = false; };
  }, [q, ch, rh]);
  if (state.a) return <SiPanel a={state.a} tag="SI, live" note={`Generated now by ${DATA.llm_model} on Groq with your key, and checked in this browser against the run table.`} />;
  if (state.err) return <div className="rounded-2xl border border-bad/40 bg-panel p-6 text-sm"><p className="font-medium text-bad">Live answer unavailable</p><p className="mt-1 text-mute">{state.err} Offline answers and sources below still apply.</p></div>;
  return <div className="rounded-2xl border border-line bg-panel p-6" aria-busy="true"><div className="shimmer mb-3 h-4 w-32 rounded" /><div className="shimmer mb-2 h-4 w-full rounded" /><div className="shimmer h-4 w-2/3 rounded" /></div>;
}

export default function Ask() {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  useEffect(() => setHasKey(!!getKey()), []);

  function ask(text: string) {
    const t = text.trim();
    if (!t) { setRes(null); return; }
    const cur = curated(t);
    const ch = bm25(DATA.bm25, t, 5).map((x) => x[1]);
    const rh = bm25(runIndex, t, 6).map((x) => x[1]);
    const refuse = (cur?.type === "off_topic") || (!cur && !ch.length && !rh.length) || !terms(t).length;
    const si = cur && DATA.llm ? DATA.llm.answers.find((a) => a.id === cur.id) ?? null : null;
    setRes({ q: t, refuse, cur, si, ch, rh });
  }
  const saveKey = () => { const k = keyRef.current?.value.trim(); if (!k) return; try { sessionStorage.setItem(KEY, k); } catch { /* blocked storage: key not kept */ } keyRef.current!.value = ""; setHasKey(true); };
  const clearKey = () => { try { sessionStorage.removeItem(KEY); } catch { /* nothing stored */ } setHasKey(false); };

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="group relative">
          <label htmlFor="ask" className="sr-only">Ask a question about the experiments</label>
          <MagnifyingGlass size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-mute" />
          <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} autoComplete="off"
            className="h-16 w-full rounded-2xl border border-line bg-panel pl-14 pr-16 text-lg outline-none transition focus:border-ember" />
          {!q && !focus && <span className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 truncate pr-20 text-lg text-mute" aria-hidden="true"><Typewriter /></span>}
          <button type="submit" aria-label="Search the sources" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-ember text-void transition hover:brightness-110 active:scale-[0.96]"><ArrowRight size={18} weight="bold" /></button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" onClick={() => { setQ(e.question); ask(e.question); }}
              className="rounded-full border border-line px-3.5 py-1.5 text-left text-sm text-mute transition hover:border-ember hover:text-ink active:scale-[0.98]">{e.question}</button>
          ))}
        </div>

        <div className="mt-10 grid gap-4" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {!res && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-dashed border-line p-8 text-mute">
                Ask about oxygen, pressure, fuels or missions. Every answer cites the run or passage it came from, and questions the sources can&apos;t answer get a plain refusal.
              </motion.div>
            )}
            {res?.refuse && (
              <motion.div key={`r-${res.q}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="rounded-2xl border border-ember/40 bg-panel p-6">
                <p className="font-medium">No supported answer</p>
                <p className="mt-1 text-mute">The sources here don&apos;t support an answer. Flamescope covers NASA microgravity flame-spread experiments and crew cabin atmospheres.</p>
              </motion.div>
            )}
            {res && !res.refuse && (
              <motion.div key={`a-${res.q}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} className="grid gap-4">
                {hasKey && <LiveSlot q={res.q} ch={res.ch} rh={res.rh} />}
                {res.si && DATA.llm && <SiPanel a={res.si} tag="SI, offline" note={`Generated before publishing by ${DATA.llm.meta.generator} (${DATA.llm.meta.generated_at}) from retrieved records; every number checked against the run table.`} />}
                {res.cur && (
                  <div className="rounded-2xl border border-line bg-panel p-6">
                    <div className="mb-3 flex items-center gap-2 text-sm"><span className="font-medium">{res.cur.type === "unsupported" ? "What the sources can and cannot say" : "Curated answer"}</span><Badge s={res.cur.type === "unsupported" ? "unverified" : answerStatus(res.cur.gold_run_ids)} /></div>
                    <p className="max-w-[65ch] leading-relaxed">{res.cur.gold_answer}</p>
                    <div className="mt-3">{[...res.cur.gold_run_ids, ...res.cur.gold_chunk_ids].map((c) => <Cite key={c} id={c} />)}</div>
                    <p className="mt-2 text-xs text-mute">Drafted offline with SI and checked against the run table ({res.cur.id}).</p>
                  </div>
                )}
                {res.ch.length > 0 && (
                  <div className="rounded-2xl border border-line bg-panel p-6">
                    <p className="mb-2 text-sm font-medium">Source passages</p>
                    <ul className="divide-y divide-line">
                      {res.ch.map((id) => (
                        <li key={id} className="py-4">
                          <div className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-mute"><Cite id={id} /><span>{docs[chunks[id].doc_id].title}</span></div>
                          <p className="line-clamp-4 max-w-[70ch] text-sm leading-relaxed text-ink/90">{chunks[id].text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {res.rh.length > 0 && (
                  <div className="rounded-2xl border border-line bg-panel p-6">
                    <p className="mb-3 text-sm font-medium">Matching runs</p>
                    <ul className="divide-y divide-line text-sm">
                      {res.rh.map((id) => (
                        <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                          <Cite id={id} /><span>{runs[id].experiment}</span>
                          <span className="font-mono text-mute">{runs[id].o2_fraction_pct || "n/a"}% O2, {runs[id].total_pressure_kpa || "n/a"} kPa</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <aside className="lg:pt-2">
        <p className="max-w-[45ch] leading-relaxed text-mute">Search runs in your browser over a fixed index. SI answers were generated offline by a Groq-hosted model from the retrieved records, and an answer is kept only if every number in it matches the run table.</p>
        <details className="group mt-8 rounded-2xl border border-line bg-panel p-5 open:pb-6">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><Key size={16} className="text-ember" />Live answers with your own Groq key{hasKey && <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-ok"><i className="breathe inline-block h-1.5 w-1.5 rounded-full bg-ok" />On</span>}</summary>
          <p className="mt-3 text-sm leading-relaxed text-mute">The key stays in this tab only and goes straight to api.groq.com. Flamescope never stores a key in the site.</p>
          <div className="mt-4 grid gap-2">
            <label htmlFor="gkey" className="text-sm">Groq API key</label>
            <div className="flex gap-2">
              <input id="gkey" ref={keyRef} type="password" autoComplete="off" spellCheck={false} placeholder="gsk_..." className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-void px-3 text-sm outline-none focus:border-ember" />
              <button type="button" onClick={saveKey} className="rounded-lg bg-ink px-3.5 text-sm font-medium text-void active:scale-[0.97]">Use key</button>
              {hasKey && <button type="button" onClick={clearKey} className="rounded-lg border border-line px-3.5 text-sm active:scale-[0.97]">Forget</button>}
            </div>
          </div>
        </details>
      </aside>
    </div>
  );
}
