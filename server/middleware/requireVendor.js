// middleware/requireVendor.js
//
// Put this in front of every portal route except sign-in. It reads the
// session cookie, checks the session and login are still good, and sets:
//
//   req.vendorId     the vendor they belong to. Use this in every query;
//                    never take a vendor id from the body or the URL.
//   req.vendorUser   { id, name, email, role }
//   req.portalSessionId
//
// Anything wrong → 401 { error }, and the cookie is cleared.
//
//   import requireVendor from "../../middleware/requireVendor.js";
//   router.get("/work-orders", requireVendor(prisma), async (req, res) => { … });
import {
  SESSION_COOKIE,
  clearCookieOptions,
  cookieOptions,
  hashToken,
  sessionExpiry,
} from "../utils/portalAuth.js";

// Saving the new expiry on every request would mean a database write per
// click; once an hour is plenty for a 60-day window.
const TOUCH_EVERY_MS = 60 * 60 * 1000;

export default function requireVendor(prisma) {
  return async function requireVendorMiddleware(req, res, next) {
    const token = req.cookies?.[SESSION_COOKIE];
    const signedOut = () => {
      res.clearCookie(SESSION_COOKIE, clearCookieOptions());
      return res.status(401).json({ error: "Please sign in." });
    };
    if (!token) return signedOut();

    try {
      const session = await prisma.vendorSessions.findUnique({
        where: { token_hash: hashToken(token) },
        include: {
          VendorUser: {
            select: {
              id: true,
              vendor_id: true,
              name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
        },
      });

      const now = new Date();
      if (
        !session ||
        session.revoked_at ||
        session.expires_at <= now ||
        !session.VendorUser?.is_active
      ) {
        return signedOut();
      }

      // Slide the expiry forward (60 days from now, capped at 6 months).
      if (now - session.last_seen_at > TOUCH_EVERY_MS) {
        const expires_at = sessionExpiry(session.created_at, now);
        await prisma.vendorSessions.update({
          where: { id: session.id },
          data: { last_seen_at: now, expires_at },
        });
        res.cookie(SESSION_COOKIE, token, cookieOptions(expires_at));
      }

      const { vendor_id, is_active, ...user } = session.VendorUser;
      req.vendorId = vendor_id;
      req.vendorUser = user;
      req.portalSessionId = session.id;
      return next();
    } catch (e) {
      console.error("requireVendor failed:", e);
      return res
        .status(500)
        .json({ error: "Something went wrong. Try again." });
    }
  };
}
