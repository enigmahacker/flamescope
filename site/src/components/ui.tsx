"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Shared pieces: status badges, citation buttons and the citation dialog.
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { atm, chunks, complete, docs, runs, safeUrl, statusOf } from "@/lib/engine";

const BADGE: Record<string, [string, string]> = {
  checked_against_source: ["Verified", "text-ok border-ok/40"],
  verified: ["Verified", "text-ok border-ok/40"],
  unverified: ["Awaiting check", "text-ember border-ember/40"],
  conflict_found: ["Conflict", "text-bad border-bad/40"],
  excluded: ["Excluded", "text-bad border-bad/40"],
  source_text_only: ["Source text", "text-flame border-flame/40"],
};
export function Badge({ s }: { s: string }) {
  const [label, cls] = BADGE[s] ?? [s.replace(/_/g, " "), "text-mute border-line"];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

const CiteCtx = createContext<(id: string) => void>(() => {});
export const useCite = () => useContext(CiteCtx);

export function Cite({ id }: { id: string }) {
  const open = useCite();
  return (
    <button type="button" onClick={() => open(id)}
      className="mr-1.5 mb-1.5 inline-flex rounded-md border border-line bg-raise px-2 py-0.5 font-mono text-xs text-ink transition hover:border-ember hover:text-ember active:scale-[0.97]">
      {id}
    </button>
  );
}

function Field({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (<><dt className="text-mute">{k.replace(/_/g, " ")}</dt><dd className="break-words font-mono text-ink">{v}</dd></>);
}

function Detail({ id }: { id: string }) {
  if (runs[id]) {
    const r = runs[id], d = docs[r.doc_id];
    const keys = ["mission", "sample", "platform", "fuel", "fuel_dimension_as_reported", "o2_fraction_pct", "o2_as_reported", "total_pressure_kpa", "pressure_as_reported", "flow_condition", "flow_velocity_m_s", "spread_rate_mm_s", "spread_rate_as_reported", "outcome", "outcome_notes", "source_location", "data_quality_flag", "extraction_method"];
    return (<>
      <p className="mb-4 flex flex-wrap items-center gap-2"><Badge s={statusOf(r)} />{!complete(r) && <span className="text-sm text-mute">Missing a required field, so it never enters the ranking.</span>}</p>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1.5 text-sm">{keys.map((k) => <Field key={k} k={k} v={r[k]} />)}</dl>
      <a className="mt-5 inline-block text-sm text-ember underline-offset-4 hover:underline" href={safeUrl(r.source_url)} target="_blank" rel="noopener noreferrer">Open the source: {d?.title}</a>
    </>);
  }
  if (chunks[id]) {
    const c = chunks[id], d = docs[c.doc_id];
    return (<>
      <p className="leading-relaxed">{c.text}</p>
      <p className="mt-4 text-sm text-mute">{d.title}, {c.page_or_paragraph}. Retrieved {c.date_retrieved}.{c.ai_assisted ? " OCR cleanup was SI-assisted." : ""}{c.chunk_type === "short_excerpt" ? " Short excerpt (copyright)." : ""}</p>
      {c.run_ids.length > 0 && <div className="mt-3">{c.run_ids.map((r) => <Cite key={r} id={r} />)}</div>}
      <a className="mt-4 inline-block text-sm text-ember underline-offset-4 hover:underline" href={safeUrl(c.source_url)} target="_blank" rel="noopener noreferrer">Open the full source{c.doi ? `, DOI ${c.doi}` : ""}</a>
    </>);
  }
  const rec = atm[id] ?? docs[id];
  if (rec) return <dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1.5 text-sm">{Object.entries(rec).map(([k, v]) => <Field key={k} k={k} v={v} />)}</dl>;
  return <p className="text-mute">No record with this ID.</p>;
}

const titleOf = (id: string) =>
  runs[id] ? `${id}: ${runs[id].experiment}${runs[id].sample ? `, sample ${runs[id].sample}` : ""}`
  : chunks[id] ? `${id}: ${chunks[id].section}` : atm[id] ? `${id}: ${atm[id].scenario}` : docs[id] ? docs[id].title : id;

export function CiteProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!id) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id]);
  return (
    <CiteCtx.Provider value={setId}>
      {children}
      <AnimatePresence>
        {id && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-void/70 p-4 backdrop-blur-sm" onClick={() => setId(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="cite-title" onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border border-line bg-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: 0.98 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
              <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
                <h2 id="cite-title" className="font-medium tracking-tight">{titleOf(id)}</h2>
                <button ref={closeRef} type="button" onClick={() => setId(null)} aria-label="Close" className="rounded-md p-1 text-mute hover:text-ink"><X size={20} /></button>
              </div>
              <div className="max-h-[70vh] overflow-auto px-6 py-5"><Detail id={id} /></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CiteCtx.Provider>
  );
}

export function Section({ id, eyebrow, title, children, className = "" }: { id: string; eyebrow?: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-[1400px] px-4 py-20 md:px-10 md:py-28 ${className}`}>
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ type: "spring", stiffness: 100, damping: 20 }}>
        {eyebrow && <p className="mb-3 text-sm text-ember">{eyebrow}</p>}
        <h2 className="mb-10 max-w-[24ch] text-3xl font-medium tracking-tighter md:text-5xl">{title}</h2>
      </motion.div>
      {children}
    </section>
  );
}
