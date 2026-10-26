import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/** Debounce any value. Used for the search box so we don't query per keystroke. */
export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export const DEFAULT_FILTERS = {
  q: "",
  clientId: null,
  serviceLineIds: [],
  state: "todo", // todo | urgent | sourced | all
  missing: [],
  sort: "site",
  dir: "asc",
  page: 1,
  limit: 100,
};

export function buildQuery(f) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.clientId) p.set("client_id", String(f.clientId));
  if (f.serviceLineIds.length)
    p.set("service_line_id", f.serviceLineIds.join(","));
  if (f.missing.length) p.set("missing", f.missing.join(","));
  p.set("state", f.state);
  p.set("sort", f.sort);
  p.set("dir", f.dir);
  p.set("page", String(f.page));
  p.set("limit", String(f.limit));
  return p.toString();
}

/**
 * The grid's data. `filters` must be a stable object (hold it in state),
 * otherwise this refetches on every render.
 */
export function useSourcing(filters) {
  const qs = useMemo(() => buildQuery(filters), [filters]);

  const [data, setData] = useState({ rows: [], total: 0, urgentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async (query) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const { data: res } = await axios.get(`/api/sourcing?${query}`, {
        signal: controller.signal,
      });
      setData({
        rows: res.rows,
        total: res.total,
        // Every line flagged to resource now, whatever the filters.
        urgentCount: res.urgent_count ?? 0,
      });
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === "CanceledError") return;
      console.error("Error fetching sourcing grid:", err);
      setError("Couldn't load the sourcing grid. Try again in a moment.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(qs);
    return () => abortRef.current?.abort();
  }, [qs, load]);

  /** Merge rows the server handed back after a write, keyed by contract site. */
  const patchRows = useCallback((updated) => {
    if (!updated?.length) return;
    setData((d) => {
      // Keep the "Resource now" count honest after a remove / assign,
      // without waiting for a refetch.
      let urgentCount = d.urgentCount;
      const rows = d.rows.map((r) => {
        const u = updated.find((x) => x.contract_site_id === r.contract_site_id);
        if (!u) return r;
        if (Boolean(u.needs_resourcing) !== Boolean(r.needs_resourcing)) {
          urgentCount += u.needs_resourcing ? 1 : -1;
        }
        return u;
      });
      return { ...d, rows, urgentCount: Math.max(0, urgentCount) };
    });
  }, []);

  return { ...data, loading, error, refetch: () => load(qs), patchRows };
}

/* ── Reference data ─────────────────────────────────────────────────────── */

export function useClients() {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    axios
      .get("/api/sourcing/clients")
      .then(({ data }) => setClients(data))
      .catch((e) => console.error("Error fetching clients:", e));
  }, []);
  return clients;
}

export function useServiceLines() {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    axios
      .get("/api/serviceLines")
      .then(({ data }) => setLines(data))
      .catch((e) => console.error("Error fetching service lines:", e));
  }, []);
  return lines;
}

/* ── Assignable vendors ─────────────────────────────────────────────────────
 * The vendor catalogue is identical on every site, so it's cached at module
 * level and fetched once per session rather than per site profile.
 *
 * Expected row shape from GET /api/vendors/assignable:
 *   { id, company, contact_name, contact_email, contact_phone,
 *     lat, lng, city, state, trades: ["Snow", ...], status, assignment_count,
 *     compliance: { w9: bool, coi: bool|"warn", msa: bool, ach: bool } }
 *
 * Returns { vendors, error, refresh }:
 *   vendors === null  → still loading
 *   error !== null    → the fetch failed; NOT the same as "no vendors match"
 */
let vendorsPromise = null;

export function invalidateAssignableVendors() {
  vendorsPromise = null;
}

export function useAssignableVendors() {
  const [vendors, setVendors] = useState(null);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!vendorsPromise) {
      vendorsPromise = axios.get("/api/vendors/assignable").then((r) => r.data);
    }
    let active = true;
    setError(null);
    vendorsPromise
      .then((d) => active && setVendors(d))
      .catch((e) => {
        vendorsPromise = null; // let the next mount retry
        console.error("Error fetching assignable vendors:", e);
        if (active) {
          setVendors([]);
          setError("Couldn't load the vendor list.");
        }
      });
    return () => {
      active = false;
    };
  }, [nonce]);

  /** Drop the cache and refetch — call after creating a vendor. */
  const refresh = useCallback(() => {
    vendorsPromise = null;
    setVendors(null);
    setNonce((n) => n + 1);
  }, []);

  return { vendors, error, refresh };
}

/** Straight-line miles. Good enough for a proximity sort; not driving distance. */
export function milesBetween(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null)
    return null;
  const R = 3958.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
