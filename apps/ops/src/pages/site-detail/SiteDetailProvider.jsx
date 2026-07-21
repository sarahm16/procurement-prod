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
const ActivityContext = createContext();
const NotesContext = createContext();
const SiteContactsContext = createContext();
const ActionsContext = createContext();

export function SiteDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    let active = true;

    axios.get(`/api/sites/${id}`).then(({ data }) => {
      console.log(data);
      if (!active) return;
      setDetails(data);
      setActivity(data.activity_log);
      setNotes(data.notes);
      setContacts(data.contacts);
    });

    return () => {
      active = false;
    };
  }, [id]);

  // Details Actions
  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/sites/${id}`, {
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
      const { data } = await axios.post(`/api/sites/${id}/contacts`, {
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
        `/api/sites/${id}/contacts/${contactId}`,
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
        `/api/sites/${id}/contacts/${contactId}`,
        {
          data: { user_id: user?.id },
        },
      );
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      return data;
    },
    [id, user?.id],
  );

  const actions = useMemo(
    () => ({
      updateDetails,
      addContact,
      updateContact,
      deleteContact,
    }),
    [updateDetails, addContact, updateContact, deleteContact],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <SiteDetailsContext.Provider value={details}>
        <ActivityContext.Provider value={activity}>
          <NotesContext.Provider value={notes}>
            <SiteContactsContext.Provider value={contacts}>
              {children}
            </SiteContactsContext.Provider>
          </NotesContext.Provider>
        </ActivityContext.Provider>
      </SiteDetailsContext.Provider>
    </ActionsContext.Provider>
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
export const useSiteActivity = () => useCtx(ActivityContext, "useSiteActivity");
export const useSiteNotes = () => useCtx(NotesContext, "useSiteNotes");
export const useSiteContacts = () =>
  useCtx(SiteContactsContext, "useSiteContacts");
export const useSiteActions = () => useCtx(ActionsContext, "useSiteActions");
