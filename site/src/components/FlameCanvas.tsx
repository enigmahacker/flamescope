"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Illustration of a microgravity flame: no buoyant plume, so hot gas drifts out evenly in every direction.
// Not data. Isolated client leaf; pauses offscreen; draws one still frame under prefers-reduced-motion.
import { memo, useEffect, useRef } from "react";

type P = { a: number; r: number; v: number; life: number; warm: boolean };

function FlameCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, visible = true, t = 0;
    const ps: P[] = [];
    const spawn = (): P => ({ a: Math.random() * Math.PI * 2, r: 0.18 + Math.random() * 0.06, v: 0.0009 + Math.random() * 0.0016, life: 1, warm: Math.random() < 0.18 });

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const frame = () => {
      t += 1;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
      ctx.clearRect(0, 0, w, h);
      const pulse = 1 + Math.sin(t / 90) * 0.025;
      // outer blue diffusion shell
      let g = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 0.62 * pulse);
      g.addColorStop(0, "rgba(232,145,58,0.55)");
      g.addColorStop(0.22, "rgba(140,120,200,0.35)");
      g.addColorStop(0.5, "rgba(91,132,232,0.28)");
      g.addColorStop(1, "rgba(91,132,232,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.62 * pulse, 0, Math.PI * 2); ctx.fill();
      // reaction sheet: thin bright ring where fuel meets oxygen
      ctx.strokeStyle = "rgba(120,160,255,0.45)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.34 * pulse, 0, Math.PI * 2); ctx.stroke();
      // fuel core
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.12);
      g.addColorStop(0, "rgba(24,28,37,1)"); g.addColorStop(1, "rgba(24,28,37,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, Math.PI * 2); ctx.fill();
      // radially drifting combustion products
      if (ps.length < 520) for (let i = 0; i < 5; i++) ps.push(spawn());
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.r += p.v; p.life = 1 - (p.r - 0.18) / 0.82;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        const x = cx + Math.cos(p.a) * p.r * R, y = cy + Math.sin(p.a) * p.r * R;
        ctx.fillStyle = p.warm ? `rgba(232,145,58,${0.8 * p.life})` : `rgba(160,190,255,${0.7 * p.life})`;
        ctx.beginPath(); ctx.arc(x, y, p.warm ? 1.5 : 1.2, 0, Math.PI * 2); ctx.fill();
      }
      if (!still && visible) raf = requestAnimationFrame(frame);
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (still) frame(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(frame);
    });
    io.observe(cv);
    if (still) { for (let i = 0; i < 160; i++) { ps.push(spawn()); ps[i].r += Math.random() * 0.7; } frame(); }
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export default memo(FlameCanvas);
