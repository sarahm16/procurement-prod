// pages/Sites/useSiteSourcing.js
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/**
 * Sourcing state for one site.
 *
 * Deliberately self-contained rather than hanging off SiteDetailProvider: the
 * tab is the only consumer, and fetching here means notes, activity and the
 * rest of the site profile don't re-render when a rate changes. If you'd
 * rather it live in the provider, the only thing that has to move is `load` —
 * everything below is just merge logic.
 */
export function useSiteSourcing(siteId) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Guards against a refresh landing after the component unmounted, and
  // against two overlapping refreshes resolving out of order.
  const seq = useRef(0);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!siteId) return;
      const mine = ++seq.current;
      if (!quiet) setLoading(true);
      try {
        const { data } = await axios.get(`/api/sourcing/sites/${siteId}`);
        if (mine !== seq.current) return;
        setRows(data?.rows ?? []);
        setSummary(data?.summary ?? null);
        setError(null);
      } catch (e) {
        if (mine !== seq.current) return;
        console.error("Error fetching site sourcing:", e);
        // Distinct from an empty list. An empty list means "nothing to source
        // here"; an error means "we don't know" — the tab must not render the
        // reassuring empty state for the second one.
        setError(e);
      } finally {
        if (mine === seq.current && !quiet) setLoading(false);
      }
    },
    [siteId],
  );

  useEffect(() => {
    load();
    return () => {
      seq.current++; // invalidate anything in flight
    };
  }, [load]);

  /**
   * Merge grid rows handed back by assign / replace / pricing.
   *
   * Those endpoints return serializeGridRow output, which has the seven checks
   * and the totals but NOT `assignments` / `prior_assignments` — so the spread
   * keeps the history we already had. After a replace that history is stale by
   * exactly one row, which is why this kicks off a quiet refetch behind the
   * merge: the numbers update instantly, the history trues up a beat later
   * without a spinner.
   */
  const mergeRows = useCallback(
    (incoming) => {
      if (!Array.isArray(incoming) || !incoming.length) return;
      setRows((prev) =>
        prev.map((r) => {
          const hit = incoming.find(
            (i) => i.contract_site_id === r.contract_site_id,
          );
          return hit ? { ...r, ...hit } : r;
        }),
      );
      load({ quiet: true });
    },
    [load],
  );

  return { rows, summary, loading, error, refresh: load, mergeRows };
}

/**
 * The service catalogue and current rates for one contract site.
 *
 * Fetched per card and only once the card is open, because a site with a
 * dozen service lines would otherwise fire a dozen requests on mount to
 * populate tables nobody has looked at yet.
 */
export function useContractSiteServices(
  contractSiteId,
  { enabled = true, assignmentId } = {},
) {
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!contractSiteId || !enabled) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/sourcing/contract-sites/${contractSiteId}/services`,
        { params: assignmentId ? { assignment_id: assignmentId } : undefined },
      );
      console.log("useSiteSourcing data:", data);
      if (mine !== seq.current) return;
      setServices(data ?? []);
      setError(null);
    } catch (e) {
      if (mine !== seq.current) return;
      console.error("Error fetching contract site services:", e);
      setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [contractSiteId, enabled, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { services, loading, error, refresh: load, setServices };
}
