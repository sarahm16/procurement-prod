import axios from "axios";
import { useCallback, useEffect, useState } from "react";

export function useFetchAll(endpoint) {
  const [state, setState] = useState({
    data: [],
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const controller = new AbortController();

    try {
      const response = await axios.get(`/api/${endpoint}`, {
        signal: controller.signal,
      });
      setState({ data: response.data, loading: false, error: null });
    } catch (error) {
      if (axios.isCancel(error)) return;
      setState({ data: [], loading: false, error: error.message });
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
