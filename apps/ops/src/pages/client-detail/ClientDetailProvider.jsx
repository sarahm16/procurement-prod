// Client Detail Provider

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

// Hooks
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

const DetailsContext = createContext();
const ContactsContext = createContext();
const ServiceLinesContext = createContext();
const ContractsContext = createContext();
const NotesContext = createContext();
const ActivityContext = createContext();
const ActionsContext = createContext();
const SitesContext = createContext();

/**
 * The client's status fields from the API. Status is worked out from the
 * client's contracts (or Paused, set by hand), so it's read-only here —
 * pause/unpause patch these from the server's answer.
 */
const STATUS_FIELDS = [
  "status",
  "status_key",
  "status_name",
  "status_color",
  "contract_status_key",
  "contract_status_name",
  "active_contracts",
  "upcoming_contracts",
  "ended_contracts",
  "total_contracts",
  "next_start_date",
  "last_end_date",
  "is_paused",
  "paused_at",
  "paused_reason",
  "paused_by_name",
];
const pickStatus = (data) =>
  Object.fromEntries(
    STATUS_FIELDS.filter((k) => k in (data ?? {})).map((k) => [k, data[k]]),
  );

export function ClientDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [contacts, setContacts] = useState([]);
  const [serviceLines, setServiceLines] = useState([]);
  const [contracts, setContracts] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [sites, setSites] = useState(null);

  useEffect(() => {
    let active = true;

    axios
      .get(`/api/clients/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setNotes(data.notes);

        // Details Tab
        setDetails({
          id: data.id,
          ...pickStatus(data),
          client: data.client,
          legal_name: data.legal_name,
          mailing_address: data.mailing_address,
          mailing_address2: data.mailing_address2,
          mailing_city: data.mailing_city,
          mailing_state: data.mailing_state,
          mailing_zipcode: data.mailing_zipcode,
          billing_address: data.billing_address,
          billing_address2: data.billing_address2,
          billing_city: data.billing_city,
          billing_state: data.billing_state,
          billing_zipcode: data.billing_zipcode,
        });
        setActivity(data.activity_log);
        setContacts(data.contacts);
        setServiceLines(data.service_lines ?? []);
      })
      .catch((e) => console.error("Error fetching client details:", e));

    return () => {
      active = false;
    };
  }, [id]);

  // ----- ACTIONS ----

  // Details Actions
  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/clients/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      setDetails((prev) => ({ ...prev, ...draft }));
    },
    [id, user?.id],
  );

  // Contacts Actions
  const addContact = useCallback(
    async (form) => {
      const { data } = await axios.post(`/api/clients/${id}/contacts`, {
        user_id: user?.id,
        ...form,
      });
      setContacts((prev) => [...prev, data]);
      return data; // Return the newly created contact
    },
    [id, user?.id],
  );

  const updateContact = useCallback(
    async (contactId, draft) => {
      const { data } = await axios.put(
        `/api/clients/${id}/contacts/${contactId}`,
        {
          user_id: user?.id,
          changes: draft,
        },
      );
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === contactId ? { ...contact, ...draft } : contact,
        ),
      );
    },
    [id, user?.id],
  );

  const deleteContact = useCallback(
    async (contactId) => {
      const { data } = await axios.delete(
        `/api/clients/${id}/contacts/${contactId}`,
        {
          data: { user_id: user?.id },
        },
      );
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      return data;
    },
    [id, user?.id],
  );

  // Service Lines Actions
  //
  // Both answer with the client's full list of lines (with statuses), so the
  // card just takes what comes back. They throw on failure — the card shows
  // the server's message (e.g. "Snow has 2 active contracts. End them first.").
  const addServiceLine = useCallback(
    async (serviceLineId) => {
      const { data } = await axios.post(`/api/clients/${id}/service-lines`, {
        service_line_id: serviceLineId,
        user_id: user?.id,
      });
      setServiceLines(data);
    },
    [id, user?.id],
  );

  const removeServiceLine = useCallback(
    async (serviceLineId) => {
      const { data } = await axios.delete(
        `/api/clients/${id}/service-lines/${serviceLineId}`,
        { data: { user_id: user?.id } },
      );
      setServiceLines(data);
    },
    [id, user?.id],
  );

  // Pause Actions — the one status set by hand. Throw on failure.
  const pauseClient = useCallback(
    async (reason) => {
      const { data } = await axios.put(`/api/clients/${id}/pause`, {
        reason,
        user_id: user?.id,
      });
      setDetails((prev) => ({ ...prev, ...pickStatus(data) }));
    },
    [id, user?.id],
  );

  const unpauseClient = useCallback(async () => {
    const { data } = await axios.put(`/api/clients/${id}/unpause`, {
      user_id: user?.id,
    });
    setDetails((prev) => ({ ...prev, ...pickStatus(data) }));
  }, [id, user?.id]);

  // Notes Actions
  const addNote = useCallback(async (note) => {
    const { data } = await axios.post(`/api/notes`, note);
    setNotes((prev) => [...prev, data]);
  }, []);

  // Contracts Actions
  const loadContracts = useCallback(async () => {
    const { data } = await axios.get(`/api/clients/${id}/contracts`);
    setContracts(data);
  }, [id]);

  const updateContract = useCallback(
    async (contractId, draft) => {
      const { data } = await axios.put(
        `/api/clients/${id}/contracts/${contractId}`,
        {
          user_id: user?.id,
          changes: draft,
        },
      );
      setContracts((prev) =>
        prev.map((contract) =>
          contract.id === contractId ? { ...contract, ...draft } : contract,
        ),
      );
    },
    [id, user?.id],
  );

  // Sites Actions
  const loadSites = useCallback(async () => {
    const { data } = await axios.get(`/api/clients/${id}/sites`);
    setSites(data);
  }, [id]);

  const actions = useMemo(() => {
    return {
      updateDetails,
      addNote,

      // Contacts actions
      addContact,
      updateContact,
      deleteContact,
      // Service Lines actions
      addServiceLine,
      removeServiceLine,
      // Status
      pauseClient,
      unpauseClient,

      // Contracts actions
      loadContracts,
      updateContract,
      // Sites actions
      loadSites,
      // TO DO: Add Sites actions like updateSite, deleteSite, etc.
      // Sites context
    };
  }, [
    updateDetails,
    addNote,
    addContact,
    updateContact,
    deleteContact,
    addServiceLine,
    removeServiceLine,
    pauseClient,
    unpauseClient,
    loadContracts,
    updateContract,
    loadSites,
  ]);

  return (
    <ActionsContext.Provider value={actions}>
      <DetailsContext.Provider value={details}>
        <ContactsContext.Provider value={contacts}>
          <ServiceLinesContext.Provider value={serviceLines}>
            <ContractsContext.Provider value={contracts}>
              <SitesContext.Provider value={sites}>
                <NotesContext.Provider value={notes}>
                  <ActivityContext.Provider value={activity}>
                    {children}
                  </ActivityContext.Provider>
                </NotesContext.Provider>
              </SitesContext.Provider>
            </ContractsContext.Provider>
          </ServiceLinesContext.Provider>
        </ContactsContext.Provider>
      </DetailsContext.Provider>
    </ActionsContext.Provider>
  );
}

function useCtx(ctx, name) {
  const v = useContext(ctx);
  if (v === undefined)
    throw new Error(`${name} must be used within a ClientDetailProvider`);
  return v;
}

export const useClientDetails = () =>
  useCtx(DetailsContext, "useClientDetails");
export const useClientContacts = () =>
  useCtx(ContactsContext, "useClientContacts");
export const useClientServiceLines = () =>
  useCtx(ServiceLinesContext, "useClientServiceLines");
export const useClientContracts = () =>
  useCtx(ContractsContext, "useClientContracts");
export const useClientNotes = () => useCtx(NotesContext, "useClientNotes");
export const useClientActivity = () =>
  useCtx(ActivityContext, "useClientActivity");
export const useClientSites = () => useCtx(SitesContext, "useClientSites");
export const useClientActions = () =>
  useCtx(ActionsContext, "useClientActions");
