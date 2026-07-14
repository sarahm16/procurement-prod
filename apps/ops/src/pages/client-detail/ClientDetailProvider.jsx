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

export function ClientDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();
  console.log("authenticated user in ClientDetailProvider:", user);

  const [details, setDetails] = useState({});
  const [contacts, setContacts] = useState([]);
  const [serviceLines, setServiceLines] = useState([]);
  const [contracts, setContracts] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let active = true;

    axios
      .get(`/api/clients/${id}`)
      .then(({ data }) => {
        console.log("ClientDetailProvider data:", data);
        if (!active) return;
        setNotes(data.notes);

        // Details Tab
        setDetails({
          id: data.id,
          status: data.status,
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
        setServiceLines(data.service_lines);
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

  // TO DO: Create Service Lines actions

  // Notes Actions
  const addNote = useCallback(async (note) => {
    const { data } = await axios.post(`/api/notes`, note);
    setNotes((prev) => [...prev, data]);
  }, []);

  // Contracts Actions
  const loadContracts = useCallback(async () => {
    const { data } = await axios.get(`/api/clients/${id}/contracts`);
    console.log("Loaded contracts for client in context provider:", data);
    setContracts(data);
  }, [id]);

  const actions = useMemo(() => {
    return {
      updateDetails,
      addNote,
      addContact,
      updateContact,
      // TO DO: Add Service Lines actions

      // Contracts actions
      loadContracts,
    };
  }, [updateDetails, addNote, addContact, updateContact, loadContracts]);

  return (
    <ActionsContext.Provider value={actions}>
      <DetailsContext.Provider value={details}>
        <ContactsContext.Provider value={contacts}>
          <ServiceLinesContext.Provider value={serviceLines}>
            <ContractsContext.Provider value={contracts}>
              <NotesContext.Provider value={notes}>
                <ActivityContext.Provider value={activity}>
                  {children}
                </ActivityContext.Provider>
              </NotesContext.Provider>
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
export const useClientActions = () =>
  useCtx(ActionsContext, "useClientActions");
