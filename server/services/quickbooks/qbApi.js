// services/quickbooks/qbApi.js
//
// Talks to the QuickBooks Online API from the server.
//
// The access token still comes from the same Azure function the old app used
// (getQBAccessToken) — that function keeps the refresh token and does the
// OAuth refresh. The only difference is who calls it: the server, so the
// token never reaches a browser and no CORS proxy is needed.
//
// .env:
//   QB_TOKEN_URL   full URL of the getQBAccessToken function, e.g.
//                  https://<your-function-app>.azurewebsites.net/api/getQBAccessToken
//                  (include ?code=… if the function needs a key in the URL)
//   QB_TOKEN_KEY   optional — sent as x-functions-key if your function wants
//                  the key in a header instead
//   QB_REALM_ID    the company ID (the old VITE_QB_PRODUCTION_ACCOUNT)
//   QB_API_BASE    optional, defaults to production:
//                  https://quickbooks.api.intuit.com
//                  (sandbox: https://sandbox-quickbooks.api.intuit.com)

const MINOR_VERSION = 75;

export class QuickBooksError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

/* ── Token ────────────────────────────────────────────────────────────── */

// QuickBooks tokens last an hour. Reuse one for a few minutes (or until just
// before its stated expiry) rather than calling the function on every search.
let cached = null; // { token, until }
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export async function getAccessToken({ force = false } = {}) {
  if (!force && cached && Date.now() < cached.until) return cached.token;

  const url = process.env.QB_TOKEN_URL;
  if (!url) {
    throw new QuickBooksError(
      500,
      "QuickBooks isn't set up: QB_TOKEN_URL is missing",
    );
  }

  let res;
  try {
    res = await fetch(url, {
      headers: process.env.QB_TOKEN_KEY
        ? { "x-functions-key": process.env.QB_TOKEN_KEY }
        : {},
    });
  } catch (e) {
    throw new QuickBooksError(
      502,
      "Couldn't reach the QuickBooks token service",
      e.message,
    );
  }
  if (!res.ok) {
    throw new QuickBooksError(
      502,
      `The QuickBooks token service answered ${res.status}`,
      await res.text().catch(() => ""),
    );
  }

  const body = await res.json().catch(() => ({}));
  const token = body.access_token;
  if (!token) {
    throw new QuickBooksError(502, "No QuickBooks access token came back");
  }

  const ttl = Number(body.expires_in)
    ? Math.max(Number(body.expires_in) * 1000 - 60_000, 30_000)
    : DEFAULT_TTL_MS;
  cached = { token, until: Date.now() + Math.min(ttl, DEFAULT_TTL_MS) };
  return token;
}

/* ── Requests ─────────────────────────────────────────────────────────── */

const apiBase = () => {
  const realm = process.env.QB_REALM_ID;
  if (!realm) {
    throw new QuickBooksError(
      500,
      "QuickBooks isn't set up: QB_REALM_ID is missing",
    );
  }
  const host = (
    process.env.QB_API_BASE || "https://quickbooks.api.intuit.com"
  ).replace(/\/+$/, "");
  return `${host}/v3/company/${realm}`;
};

/** First error message QuickBooks put in a Fault, if any. */
const faultMessage = (body) => {
  const e = body?.Fault?.Error?.[0];
  return e
    ? `${e.Message}${e.Detail ? `: ${e.Detail}` : ""} (code ${e.code ?? e.Code})`
    : null;
};

/** The QuickBooks error code (e.g. "6240" duplicate name), if any. */
export const faultCode = (body) => {
  const e = body?.Fault?.Error?.[0];
  return e ? String(e.code ?? e.Code ?? "") : null;
};

async function qbRequest(method, path, payload, { retried = false } = {}) {
  const token = await getAccessToken({ force: retried });
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(payload && { "Content-Type": "application/json" }),
    },
    ...(payload && { body: JSON.stringify(payload) }),
  });

  // A cached token can go stale early (revoked, refreshed elsewhere).
  // Get a fresh one and try once more.
  if (res.status === 401 && !retried) {
    return qbRequest(method, path, payload, { retried: true });
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new QuickBooksError(
      res.status === 401 ? 502 : res.status >= 500 ? 502 : 400,
      faultMessage(body) ?? `QuickBooks answered ${res.status}`,
      body,
    );
  }
  return body;
}

const qbGet = (path) => qbRequest("GET", path);
const qbPost = (path, payload) =>
  qbRequest("POST", `${path}?minorversion=${MINOR_VERSION}`, payload);

/** Run a QuickBooks query (their SQL-like language). */
export async function qbQuery(query) {
  const body = await qbGet(
    `/query?query=${encodeURIComponent(query)}&minorversion=${MINOR_VERSION}`,
  );
  return body?.QueryResponse ?? {};
}

/** Quote a value for a QuickBooks query: backslash-escape quotes. */
export const qbString = (s) =>
  `'${String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")}'`;

/* ── Customers and vendors ───────────────────────────────────────────── */

const addressBits = (a) => ({
  city: a?.City ?? null,
  state: a?.CountrySubDivisionCode ?? null,
});

export const serializeCustomer = (c) => ({
  id: String(c.Id),
  name: c.DisplayName ?? null,
  // "Costco Wholesale:Store 307" for a sub-customer.
  full_name: c.FullyQualifiedName ?? c.DisplayName ?? null,
  company: c.CompanyName ?? null,
  email: c.PrimaryEmailAddr?.Address ?? null,
  ...addressBits(c.ShipAddr?.City ? c.ShipAddr : c.BillAddr),
  balance: c.Balance ?? null,
  active: c.Active !== false,
  // Sub-customers (jobs) sit under a parent customer.
  parent_id: c.ParentRef?.value ? String(c.ParentRef.value) : null,
  is_sub_customer: Boolean(c.Job || c.ParentRef),
});

export const serializeVendor = (v) => ({
  id: String(v.Id),
  name: v.DisplayName ?? null,
  full_name: v.DisplayName ?? null,
  company: v.CompanyName ?? null,
  email: v.PrimaryEmailAddr?.Address ?? null,
  ...addressBits(v.BillAddr),
  balance: v.Balance ?? null,
  active: v.Active !== false,
  is_1099: Boolean(v.Vendor1099),
});

const ENTITIES = {
  Customer: serializeCustomer,
  Vendor: serializeVendor,
};

/**
 * Search QuickBooks customers or vendors by name, anywhere in the display
 * name. An all-digits search ("307") also matches that QuickBooks ID, so a
 * store number still finds stores by name.
 */
export async function searchEntities(entity, term, { limit = 25 } = {}) {
  const serialize = ENTITIES[entity];
  if (!serialize) throw new Error(`Unknown QuickBooks entity ${entity}`);
  const t = String(term ?? "").trim();
  if (!t) return [];

  const byName = qbQuery(
    `SELECT * FROM ${entity} WHERE DisplayName LIKE ${qbString(
      `%${t.replace(/%/g, "")}%`,
    )} ORDERBY DisplayName MAXRESULTS ${limit}`,
  );
  const byId = /^\d+$/.test(t)
    ? qbQuery(`SELECT * FROM ${entity} WHERE Id = ${qbString(t)}`)
    : Promise.resolve({});

  const [named, ided] = await Promise.all([byName, byId]);
  const seen = new Set();
  return [...(ided[entity] ?? []), ...(named[entity] ?? [])]
    .filter((r) => !seen.has(r.Id) && seen.add(r.Id))
    .map(serialize);
}

/** One customer or vendor by ID, or null if QuickBooks has no such record. */
export async function getEntity(entity, id) {
  const serialize = ENTITIES[entity];
  const res = await qbQuery(
    `SELECT * FROM ${entity} WHERE Id = ${qbString(id)}`,
  );
  const row = res[entity]?.[0];
  return row ? serialize(row) : null;
}

/* ── Vendor bills ─────────────────────────────────────────────────────── */

export const serializeBill = (b) => ({
  id: String(b.Id),
  doc_number: b.DocNumber ?? null,
  txn_date: b.TxnDate ?? null,
  due_date: b.DueDate ?? null,
  total: Number(b.TotalAmt ?? 0),
  balance: Number(b.Balance ?? 0),
  memo: b.PrivateNote ?? null,
  created_at: b.MetaData?.CreateTime ?? null,
  updated_at: b.MetaData?.LastUpdatedTime ?? null,
  // Everything a work order number could be written in.
  text: [
    b.DocNumber,
    b.PrivateNote,
    ...(b.Line ?? []).map((l) => l.Description),
  ]
    .filter(Boolean)
    .join(" "),
});

/** Every bill for a QuickBooks vendor, newest first (up to 1,000). */
export async function getVendorBills(vendorQbId) {
  const { Bill = [] } = await qbQuery(
    `SELECT * FROM Bill WHERE VendorRef = ${qbString(vendorQbId)} ORDERBY TxnDate DESC MAXRESULTS 1000`,
  );
  return Bill.map(serializeBill);
}

/* ── Creating a vendor ────────────────────────────────────────────────── */

/**
 * Create a vendor in QuickBooks. QuickBooks won't allow two names (across
 * customers, vendors and employees) to be the same; that comes back as a
 * QuickBooksError with code "6240".
 */
export async function createVendor(payload) {
  try {
    const body = await qbPost("/vendor", payload);
    return serializeVendor(body.Vendor);
  } catch (e) {
    if (e instanceof QuickBooksError && faultCode(e.detail) === "6240") {
      e.status = 409;
      e.code = "duplicate_name";
    }
    throw e;
  }
}
