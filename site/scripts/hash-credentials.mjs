// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
// Writes src/data/auth.json with salted PBKDF2-SHA-256 hashes of the site username and password.
// Usage: node scripts/hash-credentials.mjs <username> <password>
// Plaintext is never written to disk. shortcut: this protects only the login form of a static site; anyone can
// read the published bundle or skip the gate. Replace with backend auth (CLAUDE.md section 5) for real access control.
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const [user, pass] = process.argv.slice(2);
if (!user || !pass) { console.error("usage: node scripts/hash-credentials.mjs <username> <password>"); process.exit(1); }
const ITER = 310000;  // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const h = (v, salt) => pbkdf2Sync(v.normalize("NFKC"), salt, ITER, 32, "sha256").toString("hex");
const userSalt = randomBytes(16), passSalt = randomBytes(16);
const auth = {
  algorithm: "PBKDF2-SHA-256", iterations: ITER,
  userSalt: userSalt.toString("hex"), userHash: h(user.trim().toLowerCase(), userSalt),
  passSalt: passSalt.toString("hex"), passHash: h(pass, passSalt),
};
writeFileSync(new URL("../src/data/auth.json", import.meta.url), JSON.stringify(auth, null, 1) + "\n");
// self-check: same input reproduces the hash, different input does not
if (h(pass, passSalt) !== auth.passHash || h(pass + "x", passSalt) === auth.passHash) throw new Error("hash self-check failed");
console.log("wrote src/data/auth.json");
