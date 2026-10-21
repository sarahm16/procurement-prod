// routes/portal/auth.js — mounted at /api/portal/auth (vendor portal)
//
// The routes themselves are shared with the client portal; see
// routes/portalAuthRouter.js.
import makePortalAuthRouter from "../portalAuthRouter.js";
import { PORTALS } from "../../auth/portals.js";

export default function portalAuthRouter(prisma) {
  return makePortalAuthRouter(prisma, PORTALS.vendor);
}
