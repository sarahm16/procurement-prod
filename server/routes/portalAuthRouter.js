// routes/portalAuthRouter.js
//
// Sign-in routes for either portal, with emailed 6-digit codes. Mount one
// per portal (see routes/portal/auth.js and routes/clientPortal/auth.js).
//
//   POST /request-code  { email }
//     → 200 { ok: true } whether or not the email has access, so the page
//       can't be used to find out which emails do. If it does, a code is
//       emailed that works once, for 10 minutes.
//
//   POST /verify-code   { email, code }
//     → 200 { user } and sets the session cookie, or 400 { error }
//
//   GET  /me            → 200 { user } when signed in, 401 when not
//   POST /sign-out      → 200 { ok: true }
//
// user = { id, name, email, role, vendor: { id, company } }   (vendor portal)
//        { id, name, email, role, client: { id, name },
//          site_count: null | n }                             (client portal)
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { sendMail } from "../services/mail.js";
import requirePortalUser from "../middleware/requirePortalUser.js";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MINUTES,
  CODES_PER_HOUR,
  clearCookieOptions,
  cookieOptions,
  generateCode,
  hashCode,
  hashToken,
  looksLikeEmail,
  newSessionToken,
  normalizeEmail,
  sameHash,
  sessionExpiry,
} from "../utils/portalAuth.js";

const SAME_ANSWER = { ok: true };
const BAD_CODE = "That code isn't right or has expired.";

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

const codeEmail = (portal, name, code) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; color: #1f2937;">
    <p>Hi ${escapeHtml(name?.split(" ")[0] || "there")},</p>
    <p>Your ${escapeHtml(portal.name)} sign-in code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
      ${code}
    </p>
    <p>It works for ${CODE_TTL_MINUTES} minutes. If you didn't try to sign in,
      you can ignore this email.</p>
  </div>`;

export default function makePortalAuthRouter(prisma, portal) {
  const router = Router();
  const Users = prisma[portal.users];
  const Codes = prisma[portal.codes];
  const Sessions = prisma[portal.sessions];
  const fk = portal.userFk;

  // A second guard on top of the per-code limits: one network address can't
  // hammer the sign-in routes. Each portal has its own count.
  const signInLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many tries. Wait a few minutes and try again." },
  });

  /** What the portal gets to know about the signed-in person. */
  const serializeMe = async (user, org) => {
    const me = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      [portal.orgKey]: org ? portal.orgOut(org) : null,
    };
    return me;
  };

  // ─── Ask for a code ────────────────────────────────────────────────────────
  router.post("/request-code", signInLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!looksLikeEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    try {
      const user = await Users.findUnique({ where: { email } });
      if (!user || !user.is_active) return res.json(SAME_ANSWER);

      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await Codes.count({
        where: { [fk]: user.id, created_at: { gte: hourAgo } },
      });
      if (recent >= CODES_PER_HOUR) {
        console.warn(`${portal.kind} portal: code limit reached for user ${user.id}`);
        return res.json(SAME_ANSWER);
      }

      const code = generateCode();
      const now = new Date();

      // Only the newest code works: retire any unused ones, then save this one.
      await prisma.$transaction([
        Codes.updateMany({
          where: { [fk]: user.id, used_at: null },
          data: { used_at: now },
        }),
        Codes.create({
          data: {
            [fk]: user.id,
            code_hash: hashCode(portal.kind, user.id, code),
            expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
          },
        }),
      ]);

      await sendMail({
        to: user.email,
        subject: `Your sign-in code: ${code}`,
        html: codeEmail(portal, user.name, code),
      });

      return res.json(SAME_ANSWER);
    } catch (e) {
      console.error(`${portal.kind} portal request-code failed:`, e);
      return res
        .status(500)
        .json({ error: "We couldn't send a code right now. Try again in a minute." });
    }
  });

  // ─── Check a code and sign in ──────────────────────────────────────────────
  router.post("/verify-code", signInLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code ?? "").replace(/\s/g, "");
    if (!looksLikeEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Enter the 6-digit code from the email." });
    }

    try {
      const user = await Users.findUnique({ where: { email } });
      if (!user || !user.is_active) return res.status(400).json({ error: BAD_CODE });

      const now = new Date();
      const row = await Codes.findFirst({
        where: { [fk]: user.id, used_at: null, expires_at: { gt: now } },
        orderBy: { created_at: "desc" },
      });
      if (!row) return res.status(400).json({ error: BAD_CODE });

      if (!sameHash(row.code_hash, hashCode(portal.kind, user.id, code))) {
        const attempts = row.attempts + 1;
        await Codes.update({
          where: { id: row.id },
          data: { attempts, ...(attempts >= CODE_MAX_ATTEMPTS && { used_at: now }) },
        });
        return res.status(400).json({
          error:
            attempts >= CODE_MAX_ATTEMPTS
              ? "Too many wrong tries. Request a new code."
              : BAD_CODE,
        });
      }

      // Use the code. The used_at: null condition means two tabs submitting
      // the same code at once can't both sign in with it.
      const token = newSessionToken();
      const expires_at = sessionExpiry(now, now);
      const signedIn = await prisma.$transaction(async (tx) => {
        const used = await tx[portal.codes].updateMany({
          where: { id: row.id, used_at: null },
          data: { used_at: now },
        });
        if (used.count !== 1) return false;
        await tx[portal.sessions].create({
          data: {
            [fk]: user.id,
            token_hash: hashToken(token),
            expires_at,
            last_seen_at: now,
            created_at: now,
            user_agent: req.get("user-agent")?.slice(0, 255) ?? null,
          },
        });
        await tx[portal.users].update({
          where: { id: user.id },
          data: { last_login_at: now },
        });
        return true;
      });
      if (!signedIn) return res.status(400).json({ error: BAD_CODE });

      const org = await prisma[portal.orgModel].findUnique({
        where: { id: user[portal.orgFk] },
        select: portal.orgSelect,
      });
      res.cookie(portal.cookie, token, cookieOptions(portal, expires_at));
      return res.json({ user: await serializeMe(user, org) });
    } catch (e) {
      console.error(`${portal.kind} portal verify-code failed:`, e);
      return res.status(500).json({ error: "Something went wrong. Try again." });
    }
  });

  // ─── Who am I ──────────────────────────────────────────────────────────────
  router.get("/me", requirePortalUser(prisma, portal), async (req, res) => {
    try {
      const org = await prisma[portal.orgModel].findUnique({
        where: { id: req.orgId },
        select: portal.orgSelect,
      });
      const user = await serializeMe(req.portalUser, org);
      // Client portal: how many sites they're limited to (null = all).
      if (portal.kind === "client") user.site_count = req.siteIds?.length ?? null;
      return res.json({ user });
    } catch (e) {
      console.error(`${portal.kind} portal me failed:`, e);
      return res.status(500).json({ error: "Something went wrong. Try again." });
    }
  });

  // ─── Sign out ──────────────────────────────────────────────────────────────
  // Works even if the session is already gone.
  router.post("/sign-out", async (req, res) => {
    const token = req.cookies?.[portal.cookie];
    try {
      if (token) {
        await Sessions.updateMany({
          where: { token_hash: hashToken(token), revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
    } catch (e) {
      console.error(`${portal.kind} portal sign-out failed:`, e);
    }
    res.clearCookie(portal.cookie, clearCookieOptions(portal));
    return res.json(SAME_ANSWER);
  });

  return router;
}
