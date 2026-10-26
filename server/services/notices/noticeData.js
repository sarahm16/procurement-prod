// services/notices/noticeData.js
//
// What every vendor notice (termination, warning, later compliance and
// end-of-service) needs: the vendor's live service lines grouped by site,
// who the notice goes to, and how a notice is shown in the Notices list.
import { siteAddress } from "../pandadoc/send/sendTerminationNotice.js";

export const pandadocUrl = (id) =>
  id ? `https://app.pandadoc.com/a/#/documents/${id}` : null;

/** A notice as the Notices list shows it. */
export const serializeNotice = (n) => ({
  ...n,
  pandadoc_url: pandadocUrl(n.pandadoc_id),
});

export const VENDOR_SELECT = {
  id: true,
  company: true,
  contact_email: true,
  mailing_address: true,
  mailing_city: true,
  mailing_state: true,
  mailing_zipcode: true,
  status_id: true,
  Contacts: { select: { name: true, email: true, contact_role_id: true } },
};

export const ASSIGNMENT_SELECT = {
  id: true,
  contract_site_id: true,
  is_primary: true,
  ContractSite: {
    select: {
      site_id: true,
      Site: {
        select: {
          store: true,
          mailing_address: true,
          mailing_city: true,
          mailing_state: true,
          mailing_zipcode: true,
          Client: { select: { client: true } },
        },
      },
      Contract: { select: { ServiceLine: { select: { name: true } } } },
    },
  },
};

/** The vendor's assignments that are still open. */
export const liveWhere = (vendorId) => ({
  vendor_id: vendorId,
  VendorSiteStatus: { category: { not: "closed" } },
});

/** Assignments → [{ site_id, client, store, address, lines: [...] }] */
export function groupBySite(assignments) {
  const sites = new Map();
  for (const a of assignments) {
    const cs = a.ContractSite;
    const key = cs.site_id;
    if (!sites.has(key)) {
      sites.set(key, {
        site_id: key,
        client: cs.Site?.Client?.client ?? "",
        store: cs.Site?.store ?? `Site ${key}`,
        address: siteAddress(cs.Site),
        lines: [],
      });
    }
    sites.get(key).lines.push({
      assignment_id: a.id,
      contract_site_id: a.contract_site_id,
      service_line: cs.Contract?.ServiceLine?.name ?? "Service line",
      is_primary: a.is_primary,
    });
  }
  return [...sites.values()]
    .map((s) => ({
      ...s,
      lines: s.lines.sort((x, y) => x.service_line.localeCompare(y.service_line)),
    }))
    .sort(
      (a, b) =>
        a.client.localeCompare(b.client) ||
        a.store.localeCompare(b.store, undefined, { numeric: true }),
    );
}

/** Sites as a notice prints them: line names, not line objects. */
export const sitesForNotice = (sites) =>
  sites.map((s) => ({ ...s, lines: s.lines.map((l) => l.service_line) }));

/** Today as YYYY-MM-DD in the server's time zone. */
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export const clean = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * GET handler for the vendor's live lines and the notice recipient. Both
 * forms use it: /:id/notice-options (and the older /:id/termination-options).
 */
export const noticeOptionsHandler = (prisma, terminationRecipient) => async (req, res) => {
  const id = Number(req.params.id);
  try {
    const vendor = await prisma.vendors.findUnique({ where: { id }, select: VENDOR_SELECT });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const [assignments, msa] = await Promise.all([
      prisma.vendorContractSites.findMany({
        where: liveWhere(id),
        select: ASSIGNMENT_SELECT,
      }),
      // The signed MSA on file, for the compliance notice's "MSA last updated".
      prisma.vendorComplianceDocuments.findFirst({
        where: { vendor_id: id, document_type: "MSA", date_completed: { not: null } },
        orderBy: { date_completed: "desc" },
        select: { date_completed: true },
      }),
    ]);

    res.json({
      vendor: {
        id: vendor.id,
        company: vendor.company,
        recipient: terminationRecipient(vendor),
        msa_last_updated: msa?.date_completed ?? null,
      },
      sites: groupBySite(assignments),
    });
  } catch (e) {
    console.error("Error loading notice options:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
