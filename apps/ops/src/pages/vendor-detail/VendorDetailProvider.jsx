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

const VendorDetailsContext = createContext();
const ActivityContext = createContext();
const NotesContext = createContext();
const ContactsContext = createContext();
const ActionsContext = createContext();
const TradesContext = createContext();
const SitesContext = createContext();
const WorkOrdersContext = createContext();

export function VendorDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [trades, setTrades] = useState([]);
  const [sites, setSites] = useState([]);
  const [workorders, setWorkorders] = useState([]);

  useEffect(() => {
    let active = true;

    axios.get(`/api/vendors/${id}`).then(({ data }) => {
      console.log(data);
      if (!active) return;
      setDetails({
        status: data.status,
        company: data.company,
        mailing_address: data.mailing_address,
        mailing_address2: data.mailing_address2,
        mailing_city: data.mailing_city,
        mailing_state: data.mailing_state,
        mailing_zipcode: data.mailing_zipcode,
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        contact_phone2: data.contact_phone2,
      });
      setActivity(data.activity_log);
      setNotes(data.notes);
      setContacts(data.contacts);
      setTrades(data.trades);
      //   setSites(data.sites);
      //   setWorkorders(data.workorders || []);
    });

    return () => {
      active = false;
    };
  }, [id]);

  // Details Actions
  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/vendors/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      console.log("Update response data:", data);
      setDetails((prev) => ({ ...prev, ...draft }));
    },
    [id, user?.id],
  );

  // Contacts Actions
  const addContact = useCallback(
    async (form) => {
      const { data } = await axios.post(`/api/vendors/${id}/contacts`, {
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
        `/api/vendors/${id}/contacts/${contactId}`,
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
        `/api/vendors/${id}/contacts/${contactId}`,
        {
          data: { user_id: user?.id },
        },
      );
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      return data;
    },
    [id, user?.id],
  );

  const deleteTrade = useCallback(
    async (tradeToDelete) => {
      const deleteResponse = await axios.delete(
        `/api/vendors/${id}/trades/${tradeToDelete.id}`,
      );
      setTrades((prevTrades) =>
        prevTrades.filter((trade) => trade.id !== tradeToDelete.id),
      );
    },
    [id],
  );

  const addTrade = useCallback(
    async (tradeToAdd) => {
      const addResponse = await axios.post(
        `/api/vendors/${id}/trades/${tradeToAdd.id}`,
        {
          user_id: user?.id,
        },
      );
      console.log("Add association response:", addResponse.data);
      setTrades((prevTrades) => [...prevTrades, tradeToAdd]);
    },
    [id, user?.id],
  );

  const addNote = useCallback(async (payload) => {
    console.log("payload in addNote:", payload);
    // Save note to database here
    const { data } = await axios.post(`/api/notes`, payload);

    // Update local state
    setNotes((prevNotes) => [...prevNotes, data]);
  }, []);

  const updateStatus = async (newStatus) => {
    try {
      const response = await axios.put(`/api/vendors/${id}`, {
        changes: {
          status_id: Number(newStatus?.id),
        },
        user_id: user?.id,
      });
      console.log("Update status response:", response.data);

      // Use server response rather than the local newStatus object
      setDetails((prev) => ({
        ...prev,
        status_id: response.data.status_id,
        status: response.data.VendorStatus, // ← from include
      }));
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const actions = useMemo(
    () => ({
      updateDetails,
      addNote,
      updateStatus,
      addContact,
      updateContact,
      deleteContact,
      addTrade,
      deleteTrade,
    }),
    [
      updateDetails,
      addContact,
      updateContact,
      deleteContact,
      addTrade,
      deleteTrade,
      addNote,
      updateStatus,
    ],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <VendorDetailsContext.Provider value={details}>
        <ActivityContext.Provider value={activity}>
          <NotesContext.Provider value={notes}>
            <ContactsContext.Provider value={contacts}>
              <SitesContext.Provider value={sites}>
                <TradesContext.Provider value={trades}>
                  <WorkOrdersContext.Provider value={workorders}>
                    {children}
                  </WorkOrdersContext.Provider>
                </TradesContext.Provider>
              </SitesContext.Provider>
            </ContactsContext.Provider>
          </NotesContext.Provider>
        </ActivityContext.Provider>
      </VendorDetailsContext.Provider>
    </ActionsContext.Provider>
  );
}

function useCtx(ctx, name) {
  const v = useContext(ctx);
  if (v === undefined)
    throw new Error(`${name} must be used within a VendorDetailProvider`);
  return v;
}

export const useVendorDetails = () =>
  useCtx(VendorDetailsContext, "useVendorDetails");
export const useVendorActivity = () =>
  useCtx(ActivityContext, "useVendorActivity");
export const useVendorNotes = () => useCtx(NotesContext, "useVendorNotes");
export const useVendorContacts = () =>
  useCtx(ContactsContext, "useVendorContacts");
export const useVendorActions = () =>
  useCtx(ActionsContext, "useVendorActions");
export const useVendorTrades = () => useCtx(TradesContext, "useVendorTrades");
export const useVendorWorkorders = () =>
  useCtx(WorkOrdersContext, "useVendorWorkorders");
