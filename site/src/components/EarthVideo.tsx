"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Real ISS footage of Earth (credit: NASA), blended into the dark theme: radial edge mask, slow drift, ember rim light.
// Muted loop; pauses offscreen; poster frame only under prefers-reduced-motion. Isolated client leaf. Not data.
import { memo, useEffect, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/flamescope";
const VIGNETTE = "radial-gradient(ellipse 62% 66% at 50% 62%, transparent 40%, rgba(11,13,18,0.7) 70%, #0b0d12 100%)"; // page-coloured edge fade, so no hard box shows

function EarthVideo({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false); // one-shot fade-in, not a render loop

  useEffect(() => {
    const v = ref.current!;
    if (v.readyState >= 2) setReady(true); // data may already be loaded before hydration
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {}); // autoplay can be refused; the poster stays
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`relative isolate overflow-hidden ${className}`} aria-hidden="true">
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="auto"
        poster={`${BASE}/media/earth-poster.jpg`}
        onLoadedData={() => setReady(true)}
        onError={() => setReady(false)}
        className={`earth-drift h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ filter: "saturate(0.92) contrast(1.05) brightness(0.92)" }}
      >
        <source src={`${BASE}/media/earth.mp4`} type="video/mp4" />
      </video>
      {/* warm rim light from the ember accent, then the vignette that settles the footage into the page background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 18% 78%, rgba(232,145,58,0.16), transparent 70%)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: VIGNETTE, boxShadow: "inset 0 0 40px 28px #0b0d12" }} />
    </div>
  );
}

export default memo(EarthVideo);
