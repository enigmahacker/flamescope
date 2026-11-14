"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Runs plotted by oxygen and pressure. Colour = oxygen (flame blue to soot amber, C-0004); fill = verification.
import { DATA, complete, flameColor, Row } from "@/lib/engine";
import { useCite } from "./ui";

const W = 640, H = 400, m = { l: 48, r: 24, t: 24, b: 44 };

export default function EvidenceMap({ selected }: { selected?: string }) {
  const open = useCite();
  const T = DATA.atmosphere;
  const pts = DATA.runs.filter((r) => complete(r) && r.verification_status !== "conflict_found");
  const xs = [...pts, ...T].map((r) => +r.total_pressure_kpa), ys = [...pts, ...T].map((r) => +r.o2_fraction_pct);
  const xMax = Math.ceil(Math.max(...xs) / 50) * 50 + 25, yMax = Math.ceil(Math.max(...ys) / 10) * 10 + 5;
  const X = (v: number) => m.l + (v / xMax) * (W - m.l - m.r), Y = (v: number) => H - m.b - (v / yMax) * (H - m.t - m.b);
  const o2s = pts.map((r) => +r.o2_fraction_pct), lo = Math.min(...o2s), hi = Math.max(...o2s);
  const minP = Math.min(...pts.map((r) => +r.total_pressure_kpa));
  const seen: Record<string, number> = {};
  const offset = (r: Row) => { const k = `${r.total_pressure_kpa}|${r.o2_fraction_pct}`; seen[k] = (seen[k] ?? 0) + 1; return (seen[k] - 1) * 8; };

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Runs plotted by oxygen and pressure, with the Moon and Mars cabin targets">
        {Array.from({ length: Math.floor(xMax / 50) + 1 }, (_, i) => i * 50).map((v) => (
          <g key={`x${v}`}><line x1={X(v)} x2={X(v)} y1={m.t} y2={H - m.b} stroke="var(--color-line)" /><text x={X(v)} y={H - m.b + 20} textAnchor="middle" className="fill-mute font-mono text-[11px]">{v}</text></g>
        ))}
        {Array.from({ length: Math.floor(yMax / 10) + 1 }, (_, i) => i * 10).map((v) => (
          <g key={`y${v}`}><line x1={m.l} x2={W - m.r} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" /><text x={m.l - 10} y={Y(v) + 4} textAnchor="end" className="fill-mute font-mono text-[11px]">{v}</text></g>
        ))}
        <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-mute text-[12px]">Total pressure, kPa</text>
        <text x={m.l} y={m.t - 10} className="fill-mute text-[12px]">Oxygen, % by volume</text>
        <line x1={X(minP)} x2={X(minP)} y1={m.t} y2={H - m.b} stroke="var(--color-mute)" strokeDasharray="2 4"><title>Lowest pressure with a run: {minP} kPa</title></line>
        {T.map((t) => {
          const on = !selected || t.target_id === selected, x = X(+t.total_pressure_kpa), y = Y(+t.o2_fraction_pct), left = X(minP) - x > 40;
          const name = t.target_id === "ATM-MOON" ? "Moon habitat" : t.target_id === "ATM-MARS" ? "Mars transit" : t.target_id;
          return (
            <g key={t.target_id} opacity={on ? 1 : 0.3} className="cursor-pointer" onClick={() => open(t.target_id)}>
              <circle cx={x} cy={y} r={24} fill="var(--color-ink)" opacity={0.06} />
              <circle cx={x} cy={y} r={14} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray={t.source_url ? undefined : "3 3"} />
              <text x={left ? x : x + 12} y={left ? y - 44 : y + 32} textAnchor={left ? "middle" : "start"} className="fill-ink text-[13px] font-semibold">{name}</text>
              <text x={left ? x : x + 12} y={left ? y - 29 : y + 47} textAnchor={left ? "middle" : "start"} className="fill-mute text-[12px]">{t.o2_fraction_pct}% O2, {t.total_pressure_kpa} kPa{t.source_url ? "" : ", uncited"}</text>
            </g>
          );
        })}
        {pts.map((r) => {
          const c = flameColor(+r.o2_fraction_pct, lo, hi), ver = r.verification_status === "checked_against_source";
          return (
            <circle key={r.run_id} cx={X(+r.total_pressure_kpa) + offset(r)} cy={Y(+r.o2_fraction_pct)} r={7} strokeWidth={2} className="cursor-pointer"
              style={{ stroke: c, fill: ver ? c : "var(--color-void)" }} onClick={() => open(r.run_id)}>
              <title>{`${r.run_id} ${r.experiment}: ${r.o2_fraction_pct}% O2, ${r.total_pressure_kpa} kPa, ${r.verification_status.replace(/_/g, " ")}`}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-mute">
        <span className="inline-flex items-center gap-2 font-mono">{lo}% O2<i className="inline-block h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg in oklch, var(--color-flame), var(--color-ember))" }} />{hi}% O2</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full border-2 border-flame" />Awaiting a check</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-flame" />Verified</span>
        <span>Click a dot or ring for its source.</span>
      </figcaption>
    </figure>
  );
}
