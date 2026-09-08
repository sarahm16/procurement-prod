/**
 * GET /api/vendors/assignable
 *
 * The vendor catalogue behind the sourcing picker: every vendor eligible to be
 * assigned to a contract site, with the trades they cover, their compliance
 * state, and how many sites they're already on.
 *
 * Site-agnostic on purpose. The list is identical for every site, so the
 * client caches it once per session and does the proximity sort and the
 * "already assigned here" diff locally against data it already has.
 *
 * Add this to your vendors router ABOVE any `/:id` route, or Express will
 * match "assignable" as an id.
 */

const DAY = 86400000;
const COI_SOON_DAYS = 30;

// Statuses that must never appear in the picker.
//
// Swap this for a column when you're ready: add `is_assignable Boolean @default(true)`
// to VendorStatuses, set it false on these three, and the where clause becomes
//   VendorStatus: { is_assignable: true }
// which stops new statuses from silently becoming assignable.
const NON_ASSIGNABLE_STATUSES = ["Terminated", "Lead - DNC", "Duplicate"];

const COMPLIANCE_TYPES = { w9: "W-9", msa: "MSA", ach: "ACH" };

const num = (v) => (v == null ? null : Number(v));

const hasDoc = (docs, type) =>
  docs.some((d) => d.document_type === type && d.date_completed != null);

/**
 * Three states, matching the grid: true (verified and comfortably current),
 * "warn" (on file but expired, expiring soon, or not verified as additionally
 * insured), false (nothing on file).
 */
const coiState = (cois) => {
  if (!cois.length) return false;
  const cutoff = Date.now() + COI_SOON_DAYS * DAY;
  const good = cois.some(
    (c) =>
      c.additionally_insured_verified &&
      new Date(c.expiration_date).getTime() > cutoff,
  );
  return good ? true : "warn";
};

const serializeAssignableVendor = (v) => ({
  id: v.id,
  company: v.company,
  contact_name: v.contact_name,
  contact_email: v.contact_email,
  contact_phone: v.contact_phone,

  lat: num(v.lat),
  lng: num(v.lng),
  city: v.mailing_city,
  state: v.mailing_state?.trim() ?? null,

  status: v.VendorStatus?.name ?? null,
  status_color: v.VendorStatus?.color ?? null,

  // NOTE: the sourcing panel matches these against SERVICE LINE names.
  // See the caveat in the accompanying message — if Trades and ServiceLines
  // don't share a vocabulary, this is the line to change.
  trades: (v.VendorTrades ?? []).map((vt) => vt.Trade?.name).filter(Boolean),
  trade_ids: (v.VendorTrades ?? []).map((vt) => vt.trade_id),

  compliance: {
    w9: hasDoc(v.ComplianceDocuments ?? [], COMPLIANCE_TYPES.w9),
    msa: hasDoc(v.ComplianceDocuments ?? [], COMPLIANCE_TYPES.msa),
    ach: hasDoc(v.ComplianceDocuments ?? [], COMPLIANCE_TYPES.ach),
    coi: coiState(v.COIs ?? []),
  },

  assignment_count: v._count?.ContractSites ?? 0,
});

export function registerAssignableVendorsRoute(router, prisma) {
  router.get("/assignable", async (req, res) => {
    const include_sandbox = "true";
    const {
      q,
      trade_id,
      // include_sandbox
    } = req.query;
    const limit = Math.min(Number(req.query.limit) || 2000, 5000);

    const where = {
      VendorStatus: { name: { notIn: NON_ASSIGNABLE_STATUSES } },
      ...(include_sandbox === "true" ? {} : { sandbox: false }),
      ...(q ? { company: { contains: String(q).trim() } } : {}),
      ...(trade_id
        ? { VendorTrades: { some: { trade_id: Number(trade_id) } } }
        : {}),
    };

    try {
      const vendors = await prisma.vendors.findMany({
        where,
        take: limit,
        orderBy: { company: "asc" },
        select: {
          id: true,
          company: true,
          contact_name: true,
          contact_email: true,
          contact_phone: true,
          lat: true,
          lng: true,
          mailing_city: true,
          mailing_state: true,

          VendorStatus: { select: { id: true, name: true, color: true } },

          VendorTrades: {
            select: {
              trade_id: true,
              Trade: { select: { id: true, name: true } },
            },
          },

          // Only the fields the flags need — not the whole document rows.
          ComplianceDocuments: {
            select: { document_type: true, date_completed: true },
          },
          COIs: {
            select: {
              expiration_date: true,
              additionally_insured_verified: true,
            },
            orderBy: { expiration_date: "desc" },
          },

          _count: { select: { ContractSites: true } },
        },
      });

      res.json(vendors.map(serializeAssignableVendor));
    } catch (error) {
      console.error("Error fetching assignable vendors:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}

export { serializeAssignableVendor };
