// contract-detail/ContractDetailProvider.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

const CONTRACT_ENTITY_TYPE_ID = 5;

const DetailsContext = createContext();
const SitesContext = createContext();
const NotesContext = createContext();
const ActivityContext = createContext();
const ActionsContext = createContext();
const StateContext = createContext();

export function ContractDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState(null); // null = loading
  const [notFound, setNotFound] = useState(false);
  const [sites, setSites] = useState(null); // null = not loaded yet
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let active = true;
    setDetails(null);
    setSites(null);
    setNotFound(false);

    axios
      .get(`/api/contracts/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const { notes: n, activity_log, ...contract } = data;
        setDetails(contract);
        setNotes(n ?? []);
        setActivity(activity_log ?? []);
      })
      .catch((e) => {
        if (!active) return;
        if (e?.response?.status === 404) setNotFound(true);
        console.error("Error fetching contract:", e);
      });

    return () => {
      active = false;
    };
  }, [id]);

  /**
   * Save edited fields. The server saves only what changed and answers with
   * the whole contract — its status may move with the dates. Throws so the
   * card can show the error.
   */
  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/contracts/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      setDetails(data);
      // Dates can change which sites count as on the contract.
      setSites(null);
      // Pick up the new log rows.
      axios
        .get(`/api/contracts/${id}`)
        .then(({ data: fresh }) => setActivity(fresh.activity_log ?? []))
        .catch(() => {});
    },
    [id, user?.id],
  );

  const loadSites = useCallback(async () => {
    const { data } = await axios.get(`/api/contracts/${id}/sites`);
    setSites(data);
  }, [id]);

  const addNote = useCallback(
    async (note) => {
      const { data } = await axios.post(`/api/notes`, {
        entity_type_id: CONTRACT_ENTITY_TYPE_ID,
        entity_id: Number(id),
        ...note,
      });
      setNotes((prev) => [...prev, data]);
    },
    [id],
  );

  const actions = useMemo(
    () => ({ updateDetails, loadSites, addNote }),
    [updateDetails, loadSites, addNote],
  );
  const state = useMemo(() => ({ notFound }), [notFound]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <DetailsContext.Provider value={details}>
          <SitesContext.Provider value={sites}>
            <NotesContext.Provider value={notes}>
              <ActivityContext.Provider value={activity}>
                {children}
              </ActivityContext.Provider>
            </NotesContext.Provider>
          </SitesContext.Provider>
        </DetailsContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

function useCtx(ctx, name) {
  const v = useContext(ctx);
  if (v === undefined)
    throw new Error(`${name} must be used within a ContractDetailProvider`);
  return v;
}

export const useContractDetails = () =>
  useCtx(DetailsContext, "useContractDetails");
export const useContractSites = () => useCtx(SitesContext, "useContractSites");
export const useContractNotes = () => useCtx(NotesContext, "useContractNotes");
export const useContractActivity = () =>
  useCtx(ActivityContext, "useContractActivity");
export const useContractActions = () =>
  useCtx(ActionsContext, "useContractActions");
export const useContractState = () => useCtx(StateContext, "useContractState");
