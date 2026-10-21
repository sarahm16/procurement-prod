// utils/portalAuth.js
//
// The parts of portal sign-in that don't touch the database: settings,
// codes, session tokens and cookies. Shared by the vendor and client portals.
//
// .env:
//   PORTAL_AUTH_SECRET   a long random string. Changing it makes every unused
//                        code stop working (sessions are unaffected).
import crypto from "crypto";

// ─── Codes ───────────────────────────────────────────────────────────────────
export const CODE_TTL_MINUTES = 10; // how long an emailed code works
export const CODE_MAX_ATTEMPTS = 5; // wrong guesses before a code is dead
export const CODES_PER_HOUR = 5; // codes one person can request per hour

/** Lowercase and trim, so "Jane@Acme.com " and "jane@acme.com" match. */
export const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const looksLikeEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 100;

/** A 6-digit code, leading zeros kept ("004219"). */
export const generateCode = () =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

/**
 * What gets stored instead of the code. A 6-digit code has only a million
 * possibilities, so it's mixed with a server secret (HMAC) — the table alone
 * is useless. The portal and user id are mixed in too, so a code only works
 * for the person, and the portal, it was sent for.
 */
export function hashCode(kind, userId, code) {
  const secret = process.env.PORTAL_AUTH_SECRET;
  if (!secret) throw new Error("PORTAL_AUTH_SECRET isn't set");
  return crypto
    .createHmac("sha256", secret)
    .update(`${kind}:${userId}:${code}`)
    .digest("hex"); // 64 characters, fits code_hash VarChar(64)
}

/** Compare two hex hashes without leaking how much of them matched. */
export function sameHash(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length)
    return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

// ─── Sessions ────────────────────────────────────────────────────────────────
export const SESSION_IDLE_DAYS = 60; // signed out after this long without a visit
export const SESSION_MAX_DAYS = 180; // signed out this long after signing in, regardless
const DAY_MS = 24 * 60 * 60 * 1000;

/** The random value that goes in the cookie. 256 bits, URL-safe. */
export const newSessionToken = () => crypto.randomBytes(32).toString("base64url");

/** What gets stored instead of the token (already long and random, so plain SHA-256). */
export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/** When a session should expire: 60 days from now, but never past 6 months. */
export function sessionExpiry(createdAt, now = new Date()) {
  const idle = now.getTime() + SESSION_IDLE_DAYS * DAY_MS;
  const cap = new Date(createdAt).getTime() + SESSION_MAX_DAYS * DAY_MS;
  return new Date(Math.min(idle, cap));
}

// ─── Cookies ─────────────────────────────────────────────────────────────────
/**
 * httpOnly: page scripts can't read it.
 * secure: only over HTTPS (off on localhost so dev works).
 * sameSite lax: not sent on requests started by other sites.
 * path: only sent to that portal's own API routes.
 */
export const cookieOptions = (portal, expiresAt) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: portal.cookiePath,
  expires: expiresAt,
});

export const clearCookieOptions = (portal) => {
  const { expires, ...rest } = cookieOptions(portal, new Date(0));
  return rest;
};
