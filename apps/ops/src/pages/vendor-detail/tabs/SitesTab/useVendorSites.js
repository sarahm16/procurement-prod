// pages/Vendors/useVendorSites.js
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/**
 * Every site/service line a vendor is assigned to.
 *
 * `includePast` is a server round-trip rather than a client-side filter: a
 * vendor's replaced assignments are the long tail, and on a national provider
 * they can outnumber the live ones several times over. No reason to ship them
 * to a tab that opens on the current work by default.
 */
export function useVendorSites(vendorId, { includePast = false } = {}) {
  const [rows, setRows] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!vendorId) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/sourcing/vendors/${vendorId}`, {
        params: includePast ? { include_past: true } : undefined,
      });
      if (mine !== seq.current) return;
      setRows(data?.rows ?? []);
      setCompliance(data?.compliance ?? null);
      setSummary(data?.summary ?? null);
      setError(null);
    } catch (e) {
      if (mine !== seq.current) return;
      console.error("Error fetching vendor sites:", e);
      // Kept distinct from an empty list — "no sites" and "we couldn't find
      // out" need different words on screen.
      setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [vendorId, includePast]);

  useEffect(() => {
    load();
    return () => {
      seq.current++;
    };
  }, [load]);

  return { rows, compliance, summary, loading, error, refresh: load };
}
