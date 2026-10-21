// middleware/requireVendor.js
//
// Put this in front of every vendor portal route except sign-in. Sets:
//   req.vendorId     the vendor they belong to. Use this in every query;
//                    never take a vendor id from the body or the URL.
//   req.vendorUser   { id, name, email, role }
import requirePortalUser from "./requirePortalUser.js";
import { PORTALS } from "../auth/portals.js";

export default function requireVendor(prisma) {
  const check = requirePortalUser(prisma, PORTALS.vendor);
  return (req, res, next) =>
    check(req, res, () => {
      req.vendorId = req.orgId;
      req.vendorUser = req.portalUser;
      next();
    });
}
