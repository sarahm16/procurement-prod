import { useMsal } from "@azure/msal-react";
import axios from "axios";

async function useAuthenticatedUser() {
  const { accounts } = useMsal();
  const account = accounts?.[0];

  console.log("MSAL Account:", account);

  const ms_user_id = account?.homeAccountId?.split(".")[0];

  // Fetch the authenticated user's employee record from the Employees table using their Microsoft ID:
  const user = await axios
    .get(`/api/employees/ms/${ms_user_id}`)
    .then((res) => {
      console.log("Authenticated user data fetched:", res.data);
      return res.data;
    });

  return { user };
}

export default useAuthenticatedUser;
