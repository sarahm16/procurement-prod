import { useState } from "react";

import axios from "axios";

export function useUpdateSingle(endpoint) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  const updateSingle = async (id, data) => {
    setUpdating(true);
    setError(null);
    try {
      const response = await axios.put(`/api/${endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || error.message);
    } finally {
      setUpdating(false);
    }
  };

  return { updateSingle, updating, error };
}
