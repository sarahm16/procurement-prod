// pages/Vendors/useVendorWorkOrders.js
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

/**
 * Every work order a vendor is on, plus the header totals.
 *
 * All of it in one fetch and filtered in the browser: a vendor's work order
 * history is bounded by how much work they've actually done, which is a few
 * hundred rows at the top end. Paging it server-side would cost a round trip
 * per status flip and make the header totals lie about anything off-page.
 */
export function useVendorWorkOrders(vendorId) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!vendorId) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/sourcing/vendors/${vendorId}/workorders`,
      );
      if (mine !== seq.current) return;
      setRows(data?.rows ?? []);
      setSummary(data?.summary ?? null);
      setError(null);
    } catch (e) {
      if (mine !== seq.current) return;
      console.error("Error fetching vendor work orders:", e);
      setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    load();
    return () => {
      seq.current++;
    };
  }, [load]);

  return { rows, summary, loading, error, refresh: load };
}
