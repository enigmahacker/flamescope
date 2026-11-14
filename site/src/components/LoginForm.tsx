"use client";
// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import FlameCanvas from "./FlameCanvas";
import { isSignedIn, lockedFor, signIn } from "@/lib/auth";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/flamescope";

export default function LoginForm() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);

  const go = () => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next === "deck") window.location.href = `${BASE}/deck.html`;  // the deck is a static file, not a route
    else router.replace("/");
  };
  useEffect(() => { if (isSignedIn()) go(); setWait(lockedFor()); }, []);
  useEffect(() => {
    if (!wait) return;
    const t = setInterval(() => setWait(lockedFor()), 1000);
    return () => clearInterval(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!user.trim() || !pass) { setErr("Enter both your username and password."); return; }
    if (lockedFor()) { setWait(lockedFor()); return; }
    setBusy(true);
    const ok = await signIn(user, pass);
    setBusy(false);
    if (ok) return go();
    setPass("");
    setWait(lockedFor());
    setErr("That username and password don't match. Check both and try again.");
  }

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 md:grid-cols-[1.15fr_1fr]">
      <div className="relative hidden overflow-hidden border-r border-line md:block">
        <FlameCanvas className="absolute inset-0 h-full w-full" />
        <div className="absolute bottom-10 left-10 max-w-[38ch]">
          <p className="text-2xl font-medium tracking-tighter">How fire behaves off Earth.</p>
          <p className="mt-2 text-sm leading-relaxed text-mute">NASA microgravity flame-spread experiments, gathered, cited and ranked for crews on the Moon and Mars. Illustration, not data.</p>
        </div>
      </div>

      <div className="flex items-center px-4 py-16 md:px-16">
        <motion.form onSubmit={submit} noValidate className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20 }}>
          <div className="mb-10 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-raise text-ember"><LockKey size={18} weight="bold" /></span>
            <span className="text-lg font-semibold tracking-tight">Flamescope</span>
          </div>
          <h1 className="text-3xl font-medium tracking-tighter">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">Use the team credentials to open the dashboard.</p>

          <div className="mt-8 grid gap-2">
            <label htmlFor="user" className="text-sm font-medium">Username</label>
            <input id="user" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} disabled={busy}
              className="h-11 rounded-lg border border-line bg-panel px-3.5 outline-none transition focus:border-ember" />
          </div>
          <div className="mt-5 grid gap-2">
            <label htmlFor="pass" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input id="pass" type={show ? "text" : "password"} autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} disabled={busy}
                aria-invalid={!!err} aria-describedby={err ? "login-err" : "login-help"}
                className="h-11 w-full rounded-lg border border-line bg-panel px-3.5 pr-11 outline-none transition focus:border-ember" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-mute hover:text-ink">{show ? <EyeSlash size={18} /> : <Eye size={18} />}</button>
            </div>
            <p id="login-help" className="text-xs text-mute">Checked in your browser against a salted PBKDF2 hash. The password itself is never stored.</p>
            {err && <p id="login-err" role="alert" className="text-sm text-bad">{err}</p>}
            {wait > 0 && <p role="status" className="text-sm text-ember">Too many attempts. Try again in {wait} s.</p>}
          </div>

          <button type="submit" disabled={busy || wait > 0}
            className={`mt-8 h-11 w-full rounded-lg font-medium text-void transition active:scale-[0.98] disabled:cursor-not-allowed ${busy ? "shimmer text-ink" : "bg-ember hover:brightness-110 disabled:opacity-50"}`}>
            {busy ? "Checking credentials" : "Sign in"}
          </button>
          <p className="mt-10 text-xs leading-relaxed text-mute">
            Independent NASA Space Apps 2026 project, not an official NASA product. Built with SI assistance; the project idea is the team&apos;s own.
          </p>
        </motion.form>
      </div>
    </main>
  );
}
