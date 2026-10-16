// routes/portal/auth.js — mounted at /api/portal/auth
//
//   POST /request-code  { email }
//     → 200 { ok: true } whether or not the email has portal access, so the
//       page can't be used to find out which emails do. If it does, a
//       6-digit code is emailed that works once, for 10 minutes.
//
//   POST /verify-code   { email, code }
//     → 200 { user } and sets the session cookie, or
//       400 { error } ("That code isn't right or has expired.")
//
//   GET  /me            → 200 { user } when signed in, 401 when not.
//                         The portal calls this when it loads.
//
//   POST /sign-out      → 200 { ok: true }; ends this browser's session.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { sendMail } from "../../services/mail.js";
import requireVendor from "../../middleware/requireVendor.js";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MINUTES,
  CODES_PER_HOUR,
  SESSION_COOKIE,
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
} from "../../utils/portalAuth.js";

const SAME_ANSWER = { ok: true };
const BAD_CODE = "That code isn't right or has expired.";

// A second guard on top of the per-code limits: one network address can't
// hammer the sign-in routes. Generous enough for a whole crew on one wifi.
const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many tries. Wait a few minutes and try again." },
});

const codeEmail = (name, code) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; color: #1f2937;">
    <p>Hi ${escapeHtml(name?.split(" ")[0] || "there")},</p>
    <p>Your vendor portal sign-in code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">
      ${code}
    </p>
    <p>It works for ${CODE_TTL_MINUTES} minutes. If you didn't try to sign in,
      you can ignore this email.</p>
  </div>`;

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/** What the portal gets to know about the signed-in person. */
const serializeMe = (user, vendor) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  vendor: vendor ? { id: vendor.id, company: vendor.company } : null,
});

export default function portalAuthRouter(prisma) {
  const router = Router();

  // ─── Ask for a code ────────────────────────────────────────────────────────
  router.post("/request-code", signInLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!looksLikeEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    try {
      const user = await prisma.vendorUsers.findUnique({ where: { email } });

      // No login, or it's been turned off: same answer, nothing sent.
      if (!user || !user.is_active) return res.json(SAME_ANSWER);

      // Too many codes this hour: same answer, nothing sent.
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await prisma.vendorLoginCodes.count({
        where: { vendor_user_id: user.id, created_at: { gte: hourAgo } },
      });
      if (recent >= CODES_PER_HOUR) {
        console.warn(`Portal: code limit reached for vendor user ${user.id}`);
        return res.json(SAME_ANSWER);
      }

      const code = generateCode();
      const now = new Date();

      // Only the newest code works: retire any unused ones, then save this one.
      await prisma.$transaction([
        prisma.vendorLoginCodes.updateMany({
          where: { vendor_user_id: user.id, used_at: null },
          data: { used_at: now },
        }),
        prisma.vendorLoginCodes.create({
          data: {
            vendor_user_id: user.id,
            code_hash: hashCode(user.id, code),
            expires_at: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
          },
        }),
      ]);

      await sendMail({
        to: user.email,
        subject: `Your sign-in code: ${code}`,
        html: codeEmail(user.name, code),
      });

      return res.json(SAME_ANSWER);
    } catch (e) {
      console.error("Portal request-code failed:", e);
      return res
        .status(500)
        .json({
          error: "We couldn't send a code right now. Try again in a minute.",
        });
    }
  });

  // ─── Check a code and sign in ──────────────────────────────────────────────
  router.post("/verify-code", signInLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code ?? "").replace(/\s/g, "");
    if (!looksLikeEmail(email) || !/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Enter the 6-digit code from the email." });
    }

    try {
      const user = await prisma.vendorUsers.findUnique({
        where: { email },
        include: { Vendor: { select: { id: true, company: true } } },
      });
      if (!user || !user.is_active) {
        return res.status(400).json({ error: BAD_CODE });
      }

      const now = new Date();
      const row = await prisma.vendorLoginCodes.findFirst({
        where: {
          vendor_user_id: user.id,
          used_at: null,
          expires_at: { gt: now },
        },
        orderBy: { created_at: "desc" },
      });
      if (!row) return res.status(400).json({ error: BAD_CODE });

      if (!sameHash(row.code_hash, hashCode(user.id, code))) {
        // Count the miss; on the last allowed miss the code dies.
        const attempts = row.attempts + 1;
        await prisma.vendorLoginCodes.update({
          where: { id: row.id },
          data: {
            attempts,
            ...(attempts >= CODE_MAX_ATTEMPTS && { used_at: now }),
          },
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
        const used = await tx.vendorLoginCodes.updateMany({
          where: { id: row.id, used_at: null },
          data: { used_at: now },
        });
        if (used.count !== 1) return false;
        await tx.vendorSessions.create({
          data: {
            vendor_user_id: user.id,
            token_hash: hashToken(token),
            expires_at,
            last_seen_at: now,
            created_at: now,
            user_agent: req.get("user-agent")?.slice(0, 255) ?? null,
          },
        });
        await tx.vendorUsers.update({
          where: { id: user.id },
          data: { last_login_at: now },
        });
        return true;
      });
      if (!signedIn) return res.status(400).json({ error: BAD_CODE });

      res.cookie(SESSION_COOKIE, token, cookieOptions(expires_at));
      return res.json({ user: serializeMe(user, user.Vendor) });
    } catch (e) {
      console.error("Portal verify-code failed:", e);
      return res
        .status(500)
        .json({ error: "Something went wrong. Try again." });
    }
  });

  // ─── Who am I ──────────────────────────────────────────────────────────────
  router.get("/me", requireVendor(prisma), async (req, res) => {
    try {
      const vendor = await prisma.vendors.findUnique({
        where: { id: req.vendorId },
        select: { id: true, company: true },
      });
      return res.json({ user: serializeMe(req.vendorUser, vendor) });
    } catch (e) {
      console.error("Portal me failed:", e);
      return res
        .status(500)
        .json({ error: "Something went wrong. Try again." });
    }
  });

  // ─── Sign out ──────────────────────────────────────────────────────────────
  // Works even if the session is already gone, so the portal can always
  // send people back to the sign-in page.
  router.post("/sign-out", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    try {
      if (token) {
        await prisma.vendorSessions.updateMany({
          where: { token_hash: hashToken(token), revoked_at: null },
          data: { revoked_at: new Date() },
        });
      }
    } catch (e) {
      console.error("Portal sign-out failed:", e);
    }
    res.clearCookie(SESSION_COOKIE, clearCookieOptions());
    return res.json(SAME_ANSWER);
  });

  return router;
}
