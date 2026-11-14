"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CaretDown, SignOut } from "@phosphor-icons/react";
import FlameCanvas from "./FlameCanvas";
import EvidenceMap from "./EvidenceMap";
import Ask from "./Ask";
import { Badge, Cite, Section } from "./ui";
import { DATA, PLAT, Row, complete, runText, safeUrl, statusOf, terms } from "@/lib/engine";
import { signOut } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/flamescope";
const REPO = "https://github.com/enigmahacker/flamescope";
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };
const NAV = [["ask", "Ask"], ["evidence", "Evidence"], ["rank", "Rank"], ["runs", "Runs"], ["about", "About"]] as const;

/* ---------- Navigation: floating glass pill, active section tracked by IntersectionObserver ---------- */
function Nav() {
  const router = useRouter();
  const [active, setActive] = useState("");
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    NAV.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <nav aria-label="Sections" className="mx-auto flex max-w-fit items-center gap-1 overflow-x-auto rounded-full border border-white/10 bg-panel/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
        <a href="#top" className="px-3 text-sm font-semibold tracking-tight">Flamescope</a>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="relative rounded-full px-3.5 py-1.5 text-sm text-mute transition hover:text-ink" aria-current={active === id ? "true" : undefined}>
            {active === id && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-raise" transition={spring} />}
            <span className={`relative ${active === id ? "text-ink" : ""}`}>{label}</span>
          </a>
        ))}
        <button type="button" onClick={() => { signOut(); router.replace("/login/"); }} aria-label="Sign out" className="ml-1 grid h-8 w-8 place-items-center rounded-full text-mute transition hover:bg-raise hover:text-ink active:scale-95"><SignOut size={16} /></button>
      </nav>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const moon = DATA.atmosphere.find((a) => a.target_id === "ATM-MOON");
  const minP = DATA.runs.filter((r) => r.total_pressure_kpa).reduce((m, r) => (+r.total_pressure_kpa < +m.total_pressure_kpa ? r : m)).total_pressure_kpa;
  const count = (f: (r: Row) => boolean) => DATA.runs.filter(f).length;
  const ledger: [number, string][] = [
    [DATA.runs.length, "runs in one table"],
    [count((r) => r.verification_status === "checked_against_source" && complete(r)), "verified"],
    [count((r) => r.verification_status === "unverified" && complete(r)), "awaiting a check"],
    [DATA.manifest.length, "NASA sources"],
  ];
  return (
    <section id="top" className="relative mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 items-center gap-10 px-4 pb-16 pt-28 md:grid-cols-[1.1fr_1fr] md:px-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
        <p className="mb-6 text-sm text-ember">Microgravity fire evidence for crews on the Moon and Mars</p>
        <h1 className="max-w-[22ch] text-3xl font-medium leading-[1.08] tracking-tighter md:text-5xl">
          Moon habitats will run at {moon?.o2_fraction_pct}% oxygen and {moon?.total_pressure_kpa} kPa. No run here burned below {minP} kPa.
        </h1>
        <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-mute">
          Flamescope gathers decades of NASA microgravity flame-spread experiments into one cited table, so planners can see what was tested, what it showed, and what hasn&apos;t been tested yet.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#ask" className="inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 font-medium text-void transition hover:brightness-110 active:scale-[0.98]">Ask the evidence<ArrowDown size={16} weight="bold" /></a>
          <a href={`${BASE}/deck.html`} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 font-medium transition hover:border-ink active:scale-[0.98]">Demo deck<ArrowUpRight size={16} /></a>
        </div>
        <dl className="mt-12 grid max-w-xl grid-cols-2 gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
          {ledger.map(([v, k]) => <div key={k}><dd className="font-mono text-2xl">{v}</dd><dt className="mt-1 text-xs text-mute">{k}</dt></div>)}
        </dl>
      </motion.div>
      <div className="relative">
        <FlameCanvas className="aspect-square w-full" />
        <p className="absolute bottom-2 right-2 text-xs text-mute">Illustration of a flame without gravity. Not data.</p>
      </div>
    </section>
  );
}

/* ---------- Evidence: map plus insight list ---------- */
function Evidence() {
  const [filter, setFilter] = useState("all");
  const opts = ["all", "habitat", "transport", "long-duration"];
  const cards = DATA.cards.filter((c) => filter === "all" || c.question_answered === filter);
  return (
    <Section id="evidence" eyebrow="What the evidence says" title="Every run with a known oxygen level and pressure, against the cabins crews will breathe.">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.25fr_1fr]">
        <EvidenceMap />
        <div>
          <div className="mb-6 flex flex-wrap gap-1 rounded-full border border-line p-1" role="radiogroup" aria-label="Filter insights by decision">
            {opts.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={filter === o} onClick={() => setFilter(o)} className="relative rounded-full px-3.5 py-1.5 text-sm">
                {filter === o && <motion.span layoutId="ins-pill" className="absolute inset-0 rounded-full bg-raise" transition={spring} />}
                <span className={`relative ${filter === o ? "text-ink" : "text-mute"}`}>{o === "all" ? "All decisions" : o[0].toUpperCase() + o.slice(1)}</span>
              </button>
            ))}
          </div>
          <motion.ol layout className="divide-y divide-line border-y border-line">
            {cards.map((c, i) => (
              <motion.li layout key={c.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.06 }} className="py-6">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-mute"><Badge s={c.status} /><span className="capitalize">{c.question_answered}</span><span>{c.id}, drafted with SI</span></div>
                <h3 className="text-xl font-medium tracking-tight">{c.title}</h3>
                <p className="mt-2 max-w-[62ch] leading-relaxed text-ink/90">{c.claim}</p>
                <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-mute">{c.implication}</p>
                <div className="mt-3">{c.citations.map((x) => <Cite key={x} id={x} />)}</div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Rank ---------- */
function Rank() {
  const T = DATA.atmosphere;
  const [tid, setTid] = useState(T[0].target_id);
  const [preview, setPreview] = useState(false);
  const t = T.find((x) => x.target_id === tid)!;
  const tO2 = +t.o2_fraction_pct, tP = +t.total_pressure_kpa;
  const dist = (r: Row) => Math.abs(+r.o2_fraction_pct - tO2) / tO2 + Math.abs(Math.log(+r.total_pressure_kpa / tP));
  const ranked = DATA.runs.filter((r) => complete(r) && r.verification_status !== "conflict_found" && (r.verification_status === "checked_against_source" || preview))
    .sort((a, b) => dist(a) - dist(b) || (+b.spread_rate_mm_s || 0) - (+a.spread_rate_mm_s || 0));
  return (
    <Section id="rank" eyebrow="Rank" title="Which tested conditions sit closest to each mission cabin?">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-full border border-line p-1" role="radiogroup" aria-label="Target atmosphere">
          {T.map((x) => (
            <button key={x.target_id} type="button" role="radio" aria-checked={tid === x.target_id} onClick={() => setTid(x.target_id)} className="relative rounded-full px-4 py-1.5 text-sm">
              {tid === x.target_id && <motion.span layoutId="tgt-pill" className="absolute inset-0 rounded-full bg-raise" transition={spring} />}
              <span className={`relative ${tid === x.target_id ? "text-ink" : "text-mute"}`}>{x.scenario.split(" (")[0]}</span>
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <span className="text-mute">Preview unverified runs</span>
          <button type="button" role="switch" aria-checked={preview} onClick={() => setPreview((v) => !v)} className={`relative h-6 w-11 rounded-full transition ${preview ? "bg-ember" : "bg-raise"}`}>
            <motion.span layout transition={spring} className={`absolute top-1 h-4 w-4 rounded-full bg-ink ${preview ? "right-1" : "left-1"}`} />
          </button>
        </label>
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div>
          {t.status === "needs_citation" && <p className="mb-4 rounded-xl border border-bad/40 px-4 py-3 text-sm text-bad">This target has no citation yet. Don&apos;t use it for decisions.</p>}
          {t.status === "pending_team_lead_confirmation" && <p className="mb-4 rounded-xl border border-ember/40 px-4 py-3 text-sm text-ember">This target is cited (<Cite id={t.source_doc_id} />) but still needs team lead confirmation.</p>}
          {preview && <p className="mb-4 rounded-xl border border-ember/40 px-4 py-3 text-sm text-ember">Preview includes runs no second person has checked yet.</p>}
          {ranked.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {ranked.map((r, i) => (
                <motion.li layout key={r.run_id} transition={spring} className="grid grid-cols-[2.5rem_1fr] gap-2 py-4">
                  <span className="font-mono text-lg text-mute">{i + 1}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><Cite id={r.run_id} /><span className="font-medium">{r.experiment}</span><Badge s={statusOf(r)} /></div>
                    <p className="mt-1 font-mono text-sm text-mute">{r.o2_fraction_pct}% O2, {r.total_pressure_kpa} kPa{r.spread_rate_mm_s ? `, ${r.spread_rate_mm_s} mm/s` : ""}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-8">
              <p className="font-medium">No verified runs yet</p>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-mute">A run joins the ranking once a second person has checked each of its numbers against the source. Conflicting runs never join. Turn on the preview to see the runs awaiting a check.</p>
            </div>
          )}
          <p className="mt-6 max-w-[60ch] text-xs leading-relaxed text-mute">Provisional order: closest to the target first (relative oxygen difference plus log pressure ratio), ties broken by faster measured spread.</p>
        </div>
        <EvidenceMap selected={tid} />
      </div>
    </Section>
  );
}

/* ---------- Runs ---------- */
function Runs() {
  const [st, setSt] = useState("all");
  const [q, setQ] = useState("");
  const [openG, setOpenG] = useState<Record<string, boolean>>({ shuttle: true });
  const [all, setAll] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const tq = terms(q), g: Record<string, Row[]> = {};
    for (const r of DATA.runs) {
      if (st === "eligible" && !complete(r)) continue;
      if (st === "excluded" && complete(r)) continue;
      if (["checked_against_source", "unverified"].includes(st) && r.verification_status !== st) continue;
      const hay = (runText(r) + " " + r.data_quality_flag).toLowerCase();
      if (!tq.every((t) => hay.includes(t))) continue;
      (g[r.platform_group] ??= []).push(r);
    }
    return g;
  }, [st, q]);
  return (
    <Section id="runs" eyebrow="Every run" title="One row per experiment run, each linked to its NASA source.">
      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div className="grid gap-2"><label htmlFor="f-st" className="text-sm text-mute">Status</label>
          <select id="f-st" value={st} onChange={(e) => setSt(e.target.value)} className="h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-ember">
            <option value="all">All runs</option><option value="eligible">Has every required field</option><option value="excluded">Missing a required field</option><option value="checked_against_source">Verified</option><option value="unverified">Awaiting a check</option>
          </select></div>
        <div className="grid min-w-[16rem] flex-1 gap-2"><label htmlFor="f-q" className="text-sm text-mute">Filter</label>
          <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fuel, mission or run ID" className="h-10 rounded-lg border border-line bg-panel px-3 text-sm outline-none focus:border-ember" /></div>
      </div>
      {Object.keys(groups).length === 0 && <p className="rounded-2xl border border-dashed border-line p-8 text-mute">No runs match. Clear the filter or pick another status.</p>}
      <div className="divide-y divide-line border-y border-line">
        {Object.entries(groups).map(([g, list]) => {
          const isOpen = !!openG[g], shown = all[g] ? list : list.slice(0, 30);
          return (
            <div key={g}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenG((o) => ({ ...o, [g]: !o[g] }))} className="flex w-full items-center justify-between py-5 text-left">
                <span className="text-lg font-medium tracking-tight">{PLAT[g] ?? g}<span className="ml-3 font-mono text-sm text-mute">{list.length}</span></span>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}><CaretDown size={18} className="text-mute" /></motion.span>
              </button>
              {isOpen && (
                <div className="overflow-x-auto pb-6">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead><tr className="text-left text-xs text-mute">{["Run", "Status", "Experiment", "Fuel", "O2 %", "kPa", "Flow m/s", "Spread mm/s", "Outcome"].map((h) => <th key={h} className="border-b border-line px-2 py-2 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-line/60">
                      {shown.map((r) => (
                        <tr key={r.run_id}>
                          <td className="px-2 py-2"><Cite id={r.run_id} /></td><td className="px-2 py-2"><Badge s={statusOf(r)} /></td>
                          <td className="px-2 py-2">{r.experiment}{r.sample ? <span className="text-mute">, {r.sample}</span> : null}</td>
                          <td className="max-w-[16rem] truncate px-2 py-2 text-mute" title={r.fuel}>{r.fuel || "n/a"}</td>
                          {["o2_fraction_pct", "total_pressure_kpa", "flow_velocity_m_s", "spread_rate_mm_s"].map((k) => <td key={k} className="px-2 py-2 text-right font-mono">{r[k] || <span className="text-mute">n/a</span>}</td>)}
                          <td className="px-2 py-2 text-mute">{r.outcome || "n/a"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {list.length > 30 && !all[g] && <button type="button" onClick={() => setAll((a) => ({ ...a, [g]: true }))} className="mt-4 rounded-full border border-line px-4 py-1.5 text-sm transition hover:border-ink active:scale-[0.98]">Show all {list.length}</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-mute">n/a means the source does not report it; the run&apos;s flags say why. Open a run for its full record.</p>
    </Section>
  );
}

/* ---------- About and submission requirements ---------- */
function Fold({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-6 text-xl font-medium tracking-tight">{title}<CaretDown size={18} className="text-mute transition group-open:rotate-180" /></summary>
      <div className="max-w-[72ch] pb-8 leading-relaxed text-ink/90">{children}</div>
    </details>
  );
}
function About() {
  const R = DATA.eval_report;
  const pct = (v?: number | null) => (v == null ? "not scored yet" : `${Math.round(v * 100)}%`);
  return (
    <Section id="about" eyebrow="About and requirements" title="How it works, where SI was used, and every source.">
      <div className="border-t border-line">
        <Fold title="How Flamescope works" open>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Fetch NASA Technical Reports Server papers and NASA Physical Sciences Informatics datasets listed in a source manifest, licenses recorded.</li>
            <li>Extract one row per experiment run: oxygen, pressure, flow, spread rate and outcome, converted to kPa, mm/s and m/s with the reported value kept alongside.</li>
            <li>Validate: runs missing a required field are excluded rather than ranked low, and only runs a second person has checked enter the ranking.</li>
            <li>Retrieve source passages and runs with BM25 search in your browser.</li>
            <li>Interpret with a Groq-hosted language model that answers only from retrieved records. Any answer with a number not in the run table is withheld.</li>
          </ol>
        </Fold>
        <Fold title="Use of super intelligence (SI)">
          <p className="mb-4"><strong className="font-medium">The project idea and approach are human: they came from our team.</strong> Everything else that SI touched is listed here and labeled in the files themselves.</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="font-medium">Code and design:</strong> the pipeline, this website, the login page and the demo deck were generated by SI (Claude by Anthropic, via Claude Code) under the team&apos;s direction. Every code file says so in its first line, and the page metadata carries an ai-assistance tag.</li>
            <li><strong className="font-medium">Data:</strong> runs extracted from paper text and the clean-up of short excerpts were SI-assisted and are marked in each record. Runs from PSI tables were mapped by script. Every run stays &quot;awaiting a check&quot; until a person verifies it.</li>
            <li><strong className="font-medium">Insights and answers:</strong> insight cards were drafted with SI and checked by script. Answers tagged SI come from a Groq-hosted model, offline or live with your own key.</li>
            <li><strong className="font-medium">Images, audio, video:</strong> none are SI-generated. The flame animation is drawn by code and labeled as an illustration.</li>
            <li>Full per-file disclosure: <a className="text-ember underline-offset-4 hover:underline" href={`${REPO}/blob/main/DOCUMENTATION.md`}>DOCUMENTATION.md</a>.</li>
          </ul>
        </Fold>
        <Fold title="NASA data used">
          <ul className="space-y-3">
            {DATA.manifest.map((d) => (
              <li key={d.doc_id} className="flex flex-wrap items-baseline gap-x-2">
                <Cite id={d.doc_id} /><a className="underline-offset-4 hover:text-ember hover:underline" href={safeUrl(d.source_url)} target="_blank" rel="noopener noreferrer">{d.title}</a>
                <span className="text-sm text-mute">{d.doi ? `DOI ${d.doi}. ` : ""}{d.license_or_terms}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-mute">Two NTRS papers are flagged as possibly containing copyrighted material, so only short excerpts are stored, with links to the full text. No NASA logos or branding are used.</p>
        </Fold>
        <Fold title="Space agency partner data and other references">
          <p>No Space Agency Partner data is used yet. Tools and services: the Groq API, Hugging Face (EmbeddingGemma, pending access), Next.js, React, Tailwind CSS, Framer Motion, Phosphor Icons, the Geist typeface, GitHub Pages and Actions, and Claude by Anthropic for SI-assisted development.</p>
          <p className="mt-3">Every source with its URL: <a className="text-ember underline-offset-4 hover:underline" href={`${REPO}/blob/main/SOURCES.md`}>SOURCES.md</a>.</p>
        </Fold>
        <Fold title="Evaluation">
          {R ? (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div><dd className="font-mono text-2xl">{pct(R.retrieval_hit_rate)}</dd><dt className="mt-1 text-sm text-mute">retrieval hit rate across {R.retrieval_scored} questions with a gold passage</dt></div>
              <div><dd className="font-mono text-2xl">{pct(R.off_topic_refusal_rate)}</dd><dt className="mt-1 text-sm text-mute">off-topic questions refused by retrieval alone</dt></div>
              <div><dd className="font-mono text-2xl">{pct(R.answers?.number_accuracy)}</dd><dt className="mt-1 text-sm text-mute">SI answer numbers matching the table</dt></div>
            </dl>
          ) : <p className="text-mute">No evaluation run yet.</p>}
        </Fold>
        <Fold title="Demo">
          <p>A seven-slide demo deck walks through the problem, the product, the user experience, the NASA data and the findings: <a className="text-ember underline-offset-4 hover:underline" href={`${BASE}/deck.html`}>open the deck</a>.</p>
        </Fold>
        <Fold title="Known limits">
          <ul className="list-disc space-y-2 pl-5">
            <li>No run is verified yet, so the ranking is empty until a second person checks the numbers.</li>
            <li>The PSI tables report no cabin pressure, so those runs never enter the ranking.</li>
            <li>No partial-gravity runs are in the corpus yet.</li>
            <li>The Mars target has no citation, and the ranking criteria are provisional.</li>
            <li>The sign-in page runs in the browser only. It is not real access control: the published data stays public.</li>
          </ul>
        </Fold>
      </div>
    </Section>
  );
}

export default function Dashboard() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Section id="ask" eyebrow="Ask" title="Ask in plain English. Get an answer with its sources, or a plain refusal."><Ask /></Section>
        <Evidence />
        <Rank />
        <Runs />
        <About />
      </main>
      <footer className="mx-auto max-w-[1400px] border-t border-line px-4 py-10 text-sm text-mute md:px-10">
        <div className="flex flex-wrap justify-between gap-4">
          <p className="max-w-[60ch]">Built by team Berkelium: Aarush Koolwal, Vihaan Bafna, Aryamann Patne, Gadikota Sudeep Reddy. Flamescope is an independent NASA Space Apps 2026 project built from public NASA NTRS reports and PSI datasets. It is not an official NASA product. Data snapshot {DATA.generated}.</p>
          <p className="flex gap-5"><a className="hover:text-ink" href={`${BASE}/deck.html`}>Demo deck</a><a className="hover:text-ink" href={REPO}>Source code</a></p>
        </div>
      </footer>
    </>
  );
}
