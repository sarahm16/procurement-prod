import {
  createContext,
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import axios from "axios";

const SiteDetailsContext = createContext();
const ActivityContext = createContext();
const NotesContext = createContext();
const SiteContactsContext = createContext();
const AttachmentsContext = createContext();
const SourcingContext = createContext();
const ActionsContext = createContext();

export function SiteDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const loadedRef = useRef(false);
  const [sourcing, setSourcing] = useState(null); // null = never loaded
  const [sourcingLoading, setSourcingLoading] = useState(false);

  useEffect(() => {
    let active = true;

    axios.get(`/api/sites/${id}`).then(({ data }) => {
      console.log(data);
      if (!active) return;
      setDetails({
        ...data,
        status: data?.status || {
          name: "Active",
          id: 1,
          description: "",
        },
      });
      setActivity(data.activity_log);
      setNotes(data.notes);
      setContacts(data.contacts);
      setAttachments(data?.attachments);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const loadSourcing = useCallback(
    async ({ force = false } = {}) => {
      if (loadedRef.current && !force) return;
      loadedRef.current = true;
      setSourcingLoading(true);
      try {
        const { data } = await axios.get(`/api/sites/${id}/sourcing`);
        console.log("fetched sourcing data", data);
        setSourcing(data);
      } catch (e) {
        loadedRef.current = false; // let it retry
        console.error("Error fetching sourcing:", e);
      } finally {
        setSourcingLoading(false);
      }
    },
    [id],
  );

  const sourcingValue = useMemo(
    () => ({ sourcing, sourcingLoading }),
    [sourcing, sourcingLoading],
  );

  const assignVendor = useCallback(async (contractSiteId, vendorId) => {
    const { data } = await axios.post(
      `/api/contract-sites/${contractSiteId}/vendors`,
      { vendor_id: vendorId },
    );
    setSourcing(
      (prev) =>
        prev?.map((cs) =>
          cs.contract_site_id === contractSiteId
            ? { ...cs, vendors: [...cs.vendors, data] }
            : cs,
        ) ?? prev,
    );
  }, []);

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

  const updateStatus = useCallback(
    async (newStatus) => {
      try {
        const { data } = await axios.put(`/api/sites/${id}/status`, {
          status_id: newStatus.id,
          user_id: user?.id,
        });
        console.log("status update response", data);

        setDetails((prev) => ({
          ...prev,
          ...data,
        }));
      } catch (error) {
        console.error("Error updating status:", error);
      }
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

  const updateServiceLineStatus = useCallback(
    async (contractSiteId, statusId) => {
      const { data } = await axios.put(
        `/api/sites/${id}/contract-sites/${contractSiteId}/status`,
        { status_id: statusId, user_id: user?.id },
      );
      console.log("update service line status", data);
      // update local state — find the service line by contract_site_id, update its status
      setDetails((prev) => ({
        ...prev,
        service_lines: prev.service_lines?.map((line) =>
          line.contract_site_id === contractSiteId
            ? {
                ...line,
                status: data.status,
                status_id: data.status_id,
                status_color: data.status_color,
              }
            : line,
        ),
      }));
    },
    [id, user?.id],
  );

  const actions = useMemo(
    () => ({
      updateDetails,
      addContact,
      updateContact,
      deleteContact,
      updateStatus,
      updateServiceLineStatus,
      loadSourcing,
      assignVendor,
    }),
    [
      updateDetails,
      addContact,
      updateContact,
      deleteContact,
      updateStatus,
      updateServiceLineStatus,
      loadSourcing,
      assignVendor,
    ],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <SiteDetailsContext.Provider value={details}>
        <ActivityContext.Provider value={activity}>
          <NotesContext.Provider value={notes}>
            <SiteContactsContext.Provider value={contacts}>
              <AttachmentsContext.Provider value={attachments}>
                <SourcingContext.Provider value={sourcingValue}>
                  {children}
                </SourcingContext.Provider>
              </AttachmentsContext.Provider>
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
export const useAttachments = () =>
  useCtx(AttachmentsContext, "useAttachments");
const useSiteSourcing = () => useCtx(SourcingContext, "useSiteSourcing");
