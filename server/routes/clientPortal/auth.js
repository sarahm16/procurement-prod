// routes/clientPortal/auth.js — mounted at /api/client-portal/auth
//
// The routes themselves are shared with the vendor portal; see
// routes/portalAuthRouter.js.
import makePortalAuthRouter from "../portalAuthRouter.js";
import { PORTALS } from "../../auth/portals.js";

export default function clientPortalAuthRouter(prisma) {
  return makePortalAuthRouter(prisma, PORTALS.client);
}
