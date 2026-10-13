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
const ChecklistContext = createContext();
const PhasesContext = createContext();
const NotesContext = createContext();
const ActivityContext = createContext();
const ActionsContext = createContext();
const StateContext = createContext();

export function ContractDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState(null); // null = loading
  const [notFound, setNotFound] = useState(false);
  const [sites, setSites] = useState(null); // null = not loaded yet
  const [checklist, setChecklist] = useState(null); // null = not loaded yet
  const [phases, setPhases] = useState(null); // null = not loaded yet
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);

  /** Contract + notes + activity. `quiet` keeps the page up while it reloads. */
  const fetchContract = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setDetails(null);
      const { data } = await axios.get(`/api/contracts/${id}`);
      const { notes: n, activity_log, ...contract } = data;
      setDetails(contract);
      setNotes(n ?? []);
      setActivity(activity_log ?? []);
    },
    [id],
  );

  useEffect(() => {
    let active = true;
    setSites(null);
    setChecklist(null);
    setPhases(null);
    setNotFound(false);
    fetchContract().catch((e) => {
      if (!active) return;
      if (e?.response?.status === 404) setNotFound(true);
      console.error("Error fetching contract:", e);
    });
    return () => {
      active = false;
    };
  }, [fetchContract]);

  /** New activity rows after a change, without reloading the page. */
  const refreshActivity = useCallback(() => {
    axios
      .get(`/api/contracts/${id}`)
      .then(({ data }) => setActivity(data.activity_log ?? []))
      .catch(() => {});
  }, [id]);

  /**
   * Save edited fields (send only the ones the card owns). The server saves
   * what changed and answers with the whole contract; it's merged in so the
   * extra bits from the first load (company options) stay. Throws so the
   * card can show the error.
   */
  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/contracts/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      setDetails((prev) => ({ ...prev, ...data }));
      // Dates drive which sites count and which checklist items tick
      // themselves, so those reload next time they're shown.
      setSites(null);
      setChecklist(null);
      refreshActivity();
    },
    [id, user?.id, refreshActivity],
  );

  /** Submit the handoff. Throws with the server's message (e.g. what's missing). */
  const submitHandoff = useCallback(async () => {
    const { data } = await axios.post(`/api/contracts/${id}/submit-handoff`, {
      user_id: user?.id,
    });
    setDetails((prev) => ({ ...prev, ...data }));
    setPhases(null); // the first and last phases were just added
    setChecklist(null);
    refreshActivity();
  }, [id, user?.id, refreshActivity]);

  const loadSites = useCallback(async () => {
    const { data } = await axios.get(`/api/contracts/${id}/sites`);
    setSites(data);
  }, [id]);

  // ── Checklist ──
  const loadChecklist = useCallback(async () => {
    const { data } = await axios.get(`/api/contracts/${id}/checklist`);
    setChecklist(data);
  }, [id]);

  /** Tick / untick a hand-checked item: { done, done_on?, note? }. */
  const setChecklistItem = useCallback(
    async (itemId, body) => {
      const { data } = await axios.put(
        `/api/contracts/${id}/checklist/${itemId}`,
        { ...body, user_id: user?.id },
      );
      setChecklist(data);
      refreshActivity();
    },
    [id, user?.id, refreshActivity],
  );

  // ── Schedule phases (every call answers with the whole list) ──
  const loadPhases = useCallback(async () => {
    const { data } = await axios.get(`/api/contracts/${id}/phases`);
    setPhases(data);
  }, [id]);

  const addPhase = useCallback(
    async (phase) => {
      const { data } = await axios.post(`/api/contracts/${id}/phases`, phase);
      setPhases(data);
    },
    [id],
  );

  const updatePhase = useCallback(
    async (phaseId, changes) => {
      const { data } = await axios.put(
        `/api/contracts/${id}/phases/${phaseId}`,
        changes,
      );
      setPhases(data);
    },
    [id],
  );

  const deletePhase = useCallback(
    async (phaseId) => {
      const { data } = await axios.delete(
        `/api/contracts/${id}/phases/${phaseId}`,
      );
      setPhases(data);
    },
    [id],
  );

  const reorderPhases = useCallback(
    async (ids) => {
      const { data } = await axios.put(`/api/contracts/${id}/phases/order`, {
        ids,
      });
      setPhases(data);
    },
    [id],
  );

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
    () => ({
      updateDetails,
      submitHandoff,
      loadSites,
      loadChecklist,
      setChecklistItem,
      loadPhases,
      addPhase,
      updatePhase,
      deletePhase,
      reorderPhases,
      addNote,
    }),
    [
      updateDetails,
      submitHandoff,
      loadSites,
      loadChecklist,
      setChecklistItem,
      loadPhases,
      addPhase,
      updatePhase,
      deletePhase,
      reorderPhases,
      addNote,
    ],
  );
  const state = useMemo(() => ({ notFound }), [notFound]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <DetailsContext.Provider value={details}>
          <SitesContext.Provider value={sites}>
            <ChecklistContext.Provider value={checklist}>
              <PhasesContext.Provider value={phases}>
                <NotesContext.Provider value={notes}>
                  <ActivityContext.Provider value={activity}>
                    {children}
                  </ActivityContext.Provider>
                </NotesContext.Provider>
              </PhasesContext.Provider>
            </ChecklistContext.Provider>
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
export const useContractChecklist = () =>
  useCtx(ChecklistContext, "useContractChecklist");
export const useContractPhases = () =>
  useCtx(PhasesContext, "useContractPhases");
export const useContractNotes = () => useCtx(NotesContext, "useContractNotes");
export const useContractActivity = () =>
  useCtx(ActivityContext, "useContractActivity");
export const useContractActions = () =>
  useCtx(ActionsContext, "useContractActions");
export const useContractState = () => useCtx(StateContext, "useContractState");
