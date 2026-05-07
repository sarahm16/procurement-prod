import { useMsal } from "@azure/msal-react";
import axios from "axios";
import { useEffect, useState } from "react";

function useAuthenticatedUser() {
  const { accounts } = useMsal();
  const account = accounts?.[0];
  const ms_user_id = account?.homeAccountId?.split(".")[0];

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ms_user_id) {
      console.warn("No Microsoft user ID found in account information.");
      setLoading(false);
      return;
    }
    axios
      .get(`/api/employees/ms/${ms_user_id}`)
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        if (err.response) {
          console.error(
            "Error fetching authenticated user:",
            err.response.data,
          );
          setError(err.response.data);
          setLoading(false);
        } else {
          console.error("Error fetching authenticated user:", err);
          setError({ error: "Network Error", message: err.message });
          setLoading(false);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ms_user_id]);

  return { user, loading, error };
}

export default useAuthenticatedUser;
