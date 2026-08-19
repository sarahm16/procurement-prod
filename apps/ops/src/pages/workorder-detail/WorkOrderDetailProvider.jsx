import {
  createContext,
  useState,
  useMemo,
  useCallback,
  useContext,
  useEffect,
} from "react";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import axios from "axios";

const WorkOrderDetailsContext = createContext();
const ActivityContext = createContext();
const NotesContext = createContext();
// const ContactsContext = createContext();
const ActionsContext = createContext();
const ServicesContext = createContext();
const SiteContext = createContext();

export function WorkOrderDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  //   const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [site, setSite] = useState({});

  useEffect(() => {
    let active = true;

    axios.get(`/api/workorders/${id}`).then(({ data }) => {
      console.log(data);
      if (!active) return;
      setDetails({
        status: data.status,
        work_order_number: data.work_order_number,
        external_id: data?.external_id,
        company: data.company,
        software: data?.software,
        type: data?.type,
        created_at: data.created_at,
        due_date: data.due_date,
        start_date: data?.start_date,
      });
      setActivity(data.activity_log);
      setNotes(data.notes);
      setSite(data.site);
      //   setContacts(data.contacts);
      setServices(data.services);
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
      const { data } = await axios.put(`/api/workorders/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      console.log("Update response data:", data);
      setDetails((prev) => ({ ...prev, ...draft }));
    },
    [id, user?.id],
  );

  const updateService = useCallback(
    async (sid, changes) => {
      console.log("changes in detail provider", changes);
      const { data } = await axios.put(
        `/api/workorders/${id}/services/${sid}`,
        {
          user_id: user?.id,
          changes: changes,
        },
      );
      console.log("Updated service", data);
    },
    [id],
  );

  //   // Contacts Actions
  //   const addContact = useCallback(
  //     async (form) => {
  //       const { data } = await axios.post(`/api/vendors/${id}/contacts`, {
  //         user_id: user?.id,
  //         ...form,
  //       });
  //       setContacts((prev) => [...prev, data]);
  //       return data; // Return the newly created contact
  //     },
  //     [id, user?.id],
  //   );

  //   const updateContact = useCallback(
  //     async (contactId, draft) => {
  //       const { data } = await axios.put(
  //         `/api/vendors/${id}/contacts/${contactId}`,
  //         {
  //           user_id: user?.id,
  //           changes: draft,
  //         },
  //       );
  //       setContacts((prev) =>
  //         prev.map((contact) =>
  //           contact.id === contactId ? { ...contact, ...draft } : contact,
  //         ),
  //       );
  //     },
  //     [id, user?.id],
  //   );

  //   const deleteContact = useCallback(
  //     async (contactId) => {
  //       const { data } = await axios.delete(
  //         `/api/vendors/${id}/contacts/${contactId}`,
  //         {
  //           data: { user_id: user?.id },
  //         },
  //       );
  //       setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
  //       return data;
  //     },
  //     [id, user?.id],
  //   );

  // TO DO: Update this function for work orders, create endpoint
  const deleteService = useCallback(
    async (serviceToDelete) => {
      const deleteResponse = await axios.delete(
        `/api/workorders/${id}/services/${serviceToDelete.id}`,
        {
          data: { user_id: user?.id },
        },
      );
      setServices((prevServices) =>
        prevServices.filter((service) => service.id !== serviceToDelete.id),
      );
    },
    [id, user?.id],
  );

  // TO DO: Also update this function
  const addService = useCallback(
    async (serviceToAdd) => {
      const addResponse = await axios.post(
        `/api/workorders/${id}/services/${serviceToAdd.id}`,
        {
          user_id: user?.id,
        },
      );
      console.log("Add association response:", addResponse.data);
      setServices((prevServices) => [...prevServices, serviceToAdd]);
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

  // TO DO: Also update this
  const updateStatus = async (newStatus) => {
    try {
      const response = await axios.put(`/api/workorders/${id}`, {
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
      //   addContact,
      //   updateContact,
      //   deleteContact,
      addService,
      deleteService,
      updateService,
    }),
    [
      updateDetails,
      //   addContact,
      //   updateContact,
      //   deleteContact,
      addService,
      deleteService,
      addNote,
      updateStatus,
      updateService,
    ],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <WorkOrderDetailsContext.Provider value={details}>
        <ActivityContext.Provider value={activity}>
          <NotesContext.Provider value={notes}>
            <SiteContext.Provider value={site}>
              <ServicesContext.Provider value={services}>
                {children}
              </ServicesContext.Provider>
            </SiteContext.Provider>
          </NotesContext.Provider>
        </ActivityContext.Provider>
      </WorkOrderDetailsContext.Provider>
    </ActionsContext.Provider>
  );
}

function useCtx(ctx, name) {
  const v = useContext(ctx);
  if (v === undefined)
    throw new Error(`${name} must be used within a WorkOrderDetailProvider`);
  return v;
}

export const useWorkOrderDetails = () =>
  useCtx(WorkOrderDetailsContext, "useWorkOrderDetails");
export const useWorkOrderSite = () => useCtx(SiteContext, "useWorkOrderSite");
export const useWorkOrderActivity = () =>
  useCtx(ActivityContext, "useWorkOrderActivity");
export const useWorkOrderNotes = () =>
  useCtx(NotesContext, "useWorkOrderNotes");
// export const useWorkOrderContacts = () =>
//   useCtx(ContactsContext, "useWorkOrderContacts");
export const useWorkOrderActions = () =>
  useCtx(ActionsContext, "useWorkOrderActions");
export const useWorkOrderServices = () =>
  useCtx(ServicesContext, "useWorkOrderServices");
