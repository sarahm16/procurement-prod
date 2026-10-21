// middleware/requireClient.js
//
// Put this in front of every client portal route except sign-in. Sets:
//   req.clientId     the client they belong to. Use this in every query;
//                    never take a client id from the body or the URL.
//   req.clientUser   { id, name, email, role }
//   req.siteIds      null = all of the client's sites, or an array of the
//                    only site ids this login may see. Apply it with
//                    clientSiteWhere(req) so it's never forgotten:
//
//   prisma.sites.findMany({ where: clientSiteWhere(req) })
//   prisma.workOrders.findMany({ where: { Site: clientSiteWhere(req) } })
import requirePortalUser from "./requirePortalUser.js";
import { PORTALS } from "../auth/portals.js";

export default function requireClient(prisma) {
  const check = requirePortalUser(prisma, PORTALS.client);
  return (req, res, next) =>
    check(req, res, () => {
      req.clientId = req.orgId;
      req.clientUser = req.portalUser;
      next();
    });
}

/** A Sites `where` limited to what this login may see. */
export const clientSiteWhere = (req) => ({
  client_id: req.clientId,
  ...(req.siteIds && { id: { in: req.siteIds } }),
});
