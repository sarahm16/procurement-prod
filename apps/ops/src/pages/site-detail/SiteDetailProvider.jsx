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

/**
 * The site-level status fields GET /api/sites/:id and the line-dates endpoint
 * both send. Kept in one list so a line change can refresh the header without
 * a refetch.
 */
const SITE_STATUS_FIELDS = [
  "status",
  "status_name",
  "status_color",
  "status_key",
  "active_lines",
  "upcoming_lines",
  "ended_lines",
  "next_start_date",
  "last_end_date",
];

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
      if (!active) return;
      // No fallback status: the server always sends the real, derived one.
      // (The old `{ name: "Active" }` default made sites with no contracts
      // look active.)
      setDetails(data);
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
      await axios.put(`/api/sites/${id}`, {
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
      await axios.put(`/api/sites/${id}/contacts/${contactId}`, {
        user_id: user?.id,
        changes: draft,
      });
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

  /**
   * Take the site off a contract, change its last day, or put it back.
   *
   *   updateServiceLineDates(csId, { end_date: "2026-10-31" })  // remove
   *   updateServiceLineDates(csId, { end_date: null })          // put back
   *
   * Statuses aren't set — they follow from the dates. The server answers with
   * the line and the site's new rolled-up status, both patched in here so
   * the card and the header update together. Throws on failure so the caller
   * can show the error.
   */
  const updateServiceLineDates = useCallback(
    async (contractSiteId, dates) => {
      const { data } = await axios.put(
        `/api/sites/${id}/contract-sites/${contractSiteId}`,
        { ...dates, user_id: user?.id },
      );

      setDetails((prev) => {
        const siteFields = Object.fromEntries(
          SITE_STATUS_FIELDS.filter((k) => k in (data.site ?? {})).map((k) => [
            k,
            data.site[k],
          ]),
        );
        return {
          ...prev,
          ...siteFields,
          service_lines: prev.service_lines?.map((line) =>
            line.contract_site_id === contractSiteId && data.line
              ? { ...line, ...data.line }
              : line,
          ),
        };
      });

      // A removed line drops out of sourcing, so reload that tab next visit.
      loadedRef.current = false;

      // Pick up the new activity entry quietly; the change itself is already
      // on screen, so a failure here isn't worth bothering anyone about.
      axios
        .get(`/api/sites/${id}`)
        .then(({ data: fresh }) => setActivity(fresh.activity_log ?? []))
        .catch(() => {});

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
      updateServiceLineDates,
      loadSourcing,
      assignVendor,
    }),
    [
      updateDetails,
      addContact,
      updateContact,
      deleteContact,
      updateServiceLineDates,
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
export const useSiteSourcing = () => useCtx(SourcingContext, "useSiteSourcing");
