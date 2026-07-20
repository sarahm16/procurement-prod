import {
  createContext,
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
} from "react";
import useParams from "react";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import axios from "axios";

const SiteDetailsContext = createContext();

export function SiteDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [siteDetails, setSiteDetails] = useState(null);
  const [siteContacts, setSiteContacts] = useState([]);
  const [notesContext, setNotesContext] = useState([]);
  const [activityContext, setActivityContext] = useState([]);

  useEffect(() => {
    let active = true;

    axios.get(`/api/sites/${id}`).then((response) => {
      if (!active) return;
      setSiteDetails(response.data);
    });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <SiteDetailsContext.Provider value={siteDetails}>
      {children}
    </SiteDetailsContext.Provider>
  );
}

function useCtx(ctx, name) {
  const v = useContext(ctx);
  if (v === undefined)
    throw new Error(`${name} must be used within a SiteDetailProvider`);
  return v;
}

export const useSiteDetails = () =>
  useCtx(SiteDetailsContext, "useSiteDetails");
