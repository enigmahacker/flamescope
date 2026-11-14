// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// shortcut: client-side gate only. Static hosting means the bundle is public and the check can be skipped,
// so this is not access control. Replace with backend auth (CLAUDE.md section 5) when the backend exists.
import auth from "@/data/auth.json";

const KEY = "flamescope_session";
const LOCK = "flamescope_lock";
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

async function pbkdf2(value: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(value.normalize("NFKC")), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: auth.iterations }, key, 256));
}
// constant-time comparison so timing does not reveal how many characters matched
const same = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

const store = () => { try { return window.sessionStorage; } catch { return null; } };
export const isSignedIn = () => store()?.getItem(KEY) === "1";
export const signOut = () => store()?.removeItem(KEY);

/** Seconds left on a lockout after repeated failures, or 0. */
export function lockedFor(): number {
  const until = Number(store()?.getItem(LOCK) ?? 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export async function signIn(user: string, pass: string): Promise<boolean> {
  const [u, p] = await Promise.all([pbkdf2(user.trim().toLowerCase(), auth.userSalt), pbkdf2(pass, auth.passSalt)]);
  const ok = same(u, auth.userHash) && same(p, auth.passHash);
  const s = store();
  if (ok) { s?.setItem(KEY, "1"); s?.removeItem("flamescope_fails"); return true; }
  const fails = Number(s?.getItem("flamescope_fails") ?? 0) + 1;
  s?.setItem("flamescope_fails", String(fails));
  if (fails % 5 === 0) s?.setItem(LOCK, String(Date.now() + 30_000));  // 30 s pause after every 5th failure
  return false;
}
