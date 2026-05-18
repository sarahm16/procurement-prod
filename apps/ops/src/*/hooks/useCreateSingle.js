import { useState } from "react";

import axios from "axios";

export function useCreateSingle(endpoint) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const createSingle = async (data) => {
    setCreating(true);
    setError(null);
    try {
      const response = await axios.post(`/api/${endpoint}`, data);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || error.message);
    } finally {
      setCreating(false);
    }
  };

  return { createSingle, creating, error };
}
