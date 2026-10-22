// routes/quickbooks.js — mounted at /api/quickbooks
//
// Linking our clients, sites and vendors to their QuickBooks records.
//
//   GET /:kind/search?search=…&id=…   QuickBooks records matching a name (or ID),
//                                     each with what it's already linked to here
//   PUT /:kind/:id                    link one of ours to a QuickBooks record
//       { quickbooks_id, user_id }    (quickbooks_id: null unlinks)
//
//   kind     ours        QuickBooks
//   clients  Clients     a customer (top-level)
//   sites    Sites       a customer, normally a sub-customer under the client's
//   vendors  Vendors     a vendor
//
// For sites, pass id= (the site) on search and each result says whether it
// sits under that site's client in QuickBooks; those come first.
//
// In server.js / app.js:
//   import quickbooksRouter from "./routes/quickbooks.js";
//   app.use("/api/quickbooks", quickbooksRouter(prisma));
import { Router } from "express";
import { logActivity } from "../utils/logActivity.js";
import {
  QuickBooksError,
  getEntity,
  searchEntities,
} from "../services/quickbooks/qbApi.js";

/** Everything that differs between clients, sites and vendors. */
const KINDS = {
  clients: {
    model: "clients",
    entityTypeId: 3,
    qbEntity: "Customer",
    label: "client",
    nameOf: (r) => r.client,
    select: { id: true, client: true, quickbooks_id: true },
    // Clients are top-level customers; sub-customers are sites.
    accept: (q) => !q.is_sub_customer,
  },
  sites: {
    model: "sites",
    entityTypeId: 2,
    qbEntity: "Customer",
    label: "site",
    nameOf: (r) => r.store ?? `Site ${r.id}`,
    select: {
      id: true,
      store: true,
      quickbooks_id: true,
      Client: { select: { client: true } },
    },
    accept: () => true,
  },
  vendors: {
    model: "vendors",
    entityTypeId: 1,
    qbEntity: "Vendor",
    label: "vendor",
    nameOf: (r) => r.company,
    select: { id: true, company: true, quickbooks_id: true },
    accept: () => true,
  },
};

/** "Store 307 (Costco Wholesale)" for a site, the plain name otherwise. */
const describe = (kind, r) =>
  kind === "sites" && r.Client?.client
    ? `${KINDS.sites.nameOf(r)} (${r.Client.client})`
    : KINDS[kind].nameOf(r);

function sendError(res, e, what) {
  if (e instanceof QuickBooksError) {
    if (e.detail) console.error(`QuickBooks ${what}:`, e.detail);
    return res.status(e.status).json({ error: e.message });
  }
  console.error(`Error ${what}:`, e);
  return res.status(500).json({ error: "Internal Server Error" });
}

export default function quickbooksRouter(prisma) {
  const router = Router();

  const kindOf = (req, res) => {
    const k = KINDS[req.params.kind];
    if (!k) res.status(404).json({ error: "Unknown record type" });
    return k;
  };

  /** Search, or a 400 message. Resolves to { error } or { results, client_linked }. */
  const runSearch = async (req, kindName) => {
    const kind = KINDS[kindName];
    const term = String(req.query.search ?? "").trim();
    if (!term) return { error: "Enter a name to search for" };
    if (term.length > 100) return { error: "Search is too long" };

    // A site's matches are judged against its client's QuickBooks customer.
    let parentQbId = null;
    if (kindName === "sites" && Number(req.query.id)) {
      const site = await prisma.sites.findUnique({
        where: { id: Number(req.query.id) },
        select: { Client: { select: { quickbooks_id: true } } },
      });
      parentQbId = site?.Client?.quickbooks_id ?? null;
    }

    const found = (await searchEntities(kind.qbEntity, term)).filter(
      kind.accept,
    );

    // What each result is already linked to on our side.
    const linked = found.length
      ? await prisma[kind.model].findMany({
          where: { quickbooks_id: { in: found.map((f) => f.id) } },
          select: kind.select,
        })
      : [];
    const byQbId = new Map(linked.map((r) => [r.quickbooks_id, r]));

    const results = found.map((f) => {
      const l = byQbId.get(f.id);
      return {
        ...f,
        linked_to: l ? { id: l.id, name: describe(kindName, l) } : null,
        ...(kindName === "sites" && {
          under_client: Boolean(parentQbId) && f.parent_id === parentQbId,
        }),
      };
    });
    if (kindName === "sites") {
      results.sort((a, b) => Number(b.under_client) - Number(a.under_client));
    }

    return {
      results,
      client_linked: kindName === "sites" ? Boolean(parentQbId) : undefined,
    };
  };

  // GET /api/quickbooks/:kind/search?search=…&id=…
  router.get("/:kind/search", async (req, res) => {
    if (!kindOf(req, res)) return;
    try {
      const out = await runSearch(req, req.params.kind);
      if (out.error) return res.status(400).json(out);
      res.json(out);
    } catch (e) {
      sendError(res, e, `searching QuickBooks for ${req.params.kind}`);
    }
  });

  // The older client-only search (a bare array), kept so nothing breaks.
  router.get("/customers", async (req, res) => {
    try {
      const out = await runSearch(req, "clients");
      if (out.error) return res.status(400).json(out);
      res.json(out.results);
    } catch (e) {
      sendError(res, e, "searching QuickBooks for clients");
    }
  });

  // PUT /api/quickbooks/:kind/:id   { quickbooks_id | null, user_id }
  router.put("/:kind/:id", async (req, res) => {
    const kind = kindOf(req, res);
    if (!kind) return;
    const kindName = req.params.kind;
    const id = Number(req.params.id);
    const { user_id } = req.body ?? {};
    const raw = req.body?.quickbooks_id;
    const qbId = raw == null || raw === "" ? null : String(raw).trim();

    if (qbId != null && !/^\d{1,20}$/.test(qbId)) {
      return res.status(400).json({ error: "That isn't a QuickBooks ID" });
    }

    try {
      const record = await prisma[kind.model].findUnique({
        where: { id },
        select: kind.select,
      });
      if (!record)
        return res
          .status(404)
          .json({ error: `That ${kind.label} doesn't exist` });
      const previous = record.quickbooks_id ?? null;
      if (previous === qbId) return res.json({ id, quickbooks_id: qbId });

      let qbRecord = null;
      if (qbId) {
        // One QuickBooks record per client / site / vendor, or invoices and
        // bills end up under the wrong name.
        const other = await prisma[kind.model].findFirst({
          where: { quickbooks_id: qbId, id: { not: id } },
          select: kind.select,
        });
        if (other) {
          return res.status(409).json({
            error: `That QuickBooks record is already linked to ${describe(kindName, other)}`,
          });
        }
        qbRecord = await getEntity(kind.qbEntity, qbId);
        if (!qbRecord) {
          return res.status(404).json({
            error: `QuickBooks has no ${kind.qbEntity.toLowerCase()} with that ID`,
          });
        }
        if (!kind.accept(qbRecord)) {
          return res.status(400).json({
            error:
              "That's a sub-customer. Link a client to a top-level customer.",
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx[kind.model].update({
          where: { id },
          data: { quickbooks_id: qbId },
        });
        await logActivity(tx, {
          entityTypeId: kind.entityTypeId,
          entityId: id,
          fieldChanged: "quickbooks_id",
          previousValue: previous,
          newValue: qbId
            ? `${qbId} (${qbRecord.full_name ?? qbRecord.name})`
            : null,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });
      });

      res.json({ id, quickbooks_id: qbId, record: qbRecord });
    } catch (e) {
      sendError(res, e, `linking ${kind.label} to QuickBooks`);
    }
  });

  return router;
}
