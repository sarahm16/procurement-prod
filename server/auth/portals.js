// auth/portals.js
//
// The two portals that sign in with emailed codes. Everything that differs
// between them lives here; the sign-in routes and the session check are
// shared (routes/portalAuthRouter.js, middleware/requirePortalUser.js).
//
// They never share anything at runtime:
//   - separate tables (a vendor session can't be found in ClientSessions)
//   - separate cookie names AND paths, so the browser only ever sends the
//     vendor cookie to /api/portal and the client cookie to /api/client-portal
//   - the portal name is mixed into every code hash, so a code can only be
//     used in the portal that sent it
export const PORTALS = {
  vendor: {
    kind: "vendor",
    name: "NFC Vendor Portal",
    cookie: "nfc_portal", // unchanged, so vendors already signed in stay signed in
    cookiePath: "/api/portal",
    // Prisma models
    users: "vendorUsers",
    codes: "vendorLoginCodes",
    sessions: "vendorSessions",
    userFk: "vendor_user_id", // column on the codes/sessions tables
    // The company the login belongs to
    orgFk: "vendor_id", // column on VendorUsers
    orgModel: "vendors",
    orgSelect: { id: true, company: true },
    orgOut: (v) => ({ id: v.id, company: v.company }),
    orgKey: "vendor", // key in the /me response: user.vendor
    sessionInclude: "VendorUser", // relation from the session to the user
  },

  client: {
    kind: "client",
    name: "NFC Client Portal",
    cookie: "nfc_client",
    cookiePath: "/api/client-portal",
    users: "clientUsers",
    codes: "clientLoginCodes",
    sessions: "clientSessions",
    userFk: "client_user_id",
    orgFk: "client_id",
    orgModel: "clients",
    orgSelect: { id: true, client: true },
    orgOut: (c) => ({ id: c.id, name: c.client }),
    orgKey: "client",
    sessionInclude: "ClientUser",
  },
};
