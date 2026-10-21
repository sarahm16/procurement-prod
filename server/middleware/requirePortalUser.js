// middleware/requirePortalUser.js
//
// The session check for either portal. Use the wrappers instead of this:
//   middleware/requireVendor.js   → req.vendorId, req.vendorUser
//   middleware/requireClient.js   → req.clientId, req.clientUser, req.siteIds
//
// Reads that portal's cookie, checks the session and login are still good,
// slides the expiry forward, and sets:
//   req.portalUser       { id, name, email, role }
//   req.orgId            the vendor or client they belong to
//   req.portalSessionId
//   req.siteIds          (client portal only) null = all of the client's
//                        sites; an array = only these sites
//
// Anything wrong → 401 { error } and the cookie is cleared.
import {
  clearCookieOptions,
  cookieOptions,
  hashToken,
  sessionExpiry,
} from "../utils/portalAuth.js";

// Saving the new expiry on every request would be a database write per
// click; once an hour is plenty for a 60-day window.
const TOUCH_EVERY_MS = 60 * 60 * 1000;

/**
 * Which sites a client login may use. No rows = all of the client's sites
 * (null). Rows = just those, and only ones that really belong to the client;
 * if none of them do, that's an empty list (no sites), never "all".
 */
export async function loadClientSiteIds(prisma, clientUserId, clientId) {
  const rows = await prisma.clientUserSites.findMany({
    where: { client_user_id: clientUserId },
    select: { site_id: true, Site: { select: { client_id: true } } },
  });
  if (!rows.length) return null;
  return rows.filter((r) => r.Site?.client_id === clientId).map((r) => r.site_id);
}

export default function requirePortalUser(prisma, portal) {
  return async function requirePortalUserMiddleware(req, res, next) {
    const token = req.cookies?.[portal.cookie];
    const signedOut = () => {
      res.clearCookie(portal.cookie, clearCookieOptions(portal));
      return res.status(401).json({ error: "Please sign in." });
    };
    if (!token) return signedOut();

    try {
      const session = await prisma[portal.sessions].findUnique({
        where: { token_hash: hashToken(token) },
        include: {
          [portal.sessionInclude]: {
            select: {
              id: true,
              [portal.orgFk]: true,
              name: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
        },
      });
      const user = session?.[portal.sessionInclude];

      const now = new Date();
      if (!session || session.revoked_at || session.expires_at <= now || !user?.is_active) {
        return signedOut();
      }

      // Slide the expiry forward (60 days from now, capped at 6 months).
      if (now - session.last_seen_at > TOUCH_EVERY_MS) {
        const expires_at = sessionExpiry(session.created_at, now);
        await prisma[portal.sessions].update({
          where: { id: session.id },
          data: { last_seen_at: now, expires_at },
        });
        res.cookie(portal.cookie, token, cookieOptions(portal, expires_at));
      }

      const { [portal.orgFk]: orgId, is_active, ...portalUser } = user;
      req.portalUser = portalUser;
      req.orgId = orgId;
      req.portalSessionId = session.id;
      if (portal.kind === "client") {
        req.siteIds = await loadClientSiteIds(prisma, portalUser.id, orgId);
      }
      return next();
    } catch (e) {
      console.error(`${portal.kind} portal session check failed:`, e);
      return res.status(500).json({ error: "Something went wrong. Try again." });
    }
  };
}
