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
const ActionsContext = createContext();
const ServicesContext = createContext();
const SiteContext = createContext();

export function WorkOrderDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [services, setServices] = useState([]);
  const [site, setSite] = useState({});

  useEffect(() => {
    let active = true;

    axios.get(`/api/workorders/${id}`).then(({ data }) => {
      if (!active) return;
      setDetails({
        status: data.status,
        work_order_number: data.work_order_number,
        external_id: data?.external_id,
        software: data?.software,
        software_id: data?.software_id,
        type: data?.type,
        priority: data?.priority,
        created_at: data.created_at,
        due_date: data.due_date,
        start_date: data?.start_date,
        scope_of_work: data?.scope_of_work,
        vendor: data?.vendor,
        vendor_id: data?.vendor?.id,
        msa: data?.msa ?? null,
        vendor_compliance: data?.vendor?.compliance,
      });
      setActivity(data.activity_log);
      setNotes(data.notes);
      setSite(data.site);
      setServices(data.services);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const updateDetails = useCallback(
    async (draft) => {
      const { data } = await axios.put(`/api/workorders/${id}`, {
        user_id: user?.id,
        changes: draft,
      });
      setDetails((prev) => ({
        ...prev,
        ...draft,
        software: data?.Software ?? prev.software,
        software_id: data?.software_id ?? prev.software_id,
        vendor: data?.vendor ?? (draft.vendor_id === null ? null : prev.vendor),
        vendor_id:
          data?.vendor?.id ??
          (draft.vendor_id === null ? null : prev.vendor_id),
      }));
    },
    [id, user?.id],
  );

  const updateService = useCallback(
    async (sid, changes) => {
      const { data } = await axios.put(
        `/api/workorders/${id}/services/${sid}`,
        { user_id: user?.id, changes },
      );
      setServices((prev) =>
        prev.map((s) => (s.id === sid ? { ...s, ...data } : s)),
      );
    },
    [id, user?.id],
  );

  const deleteService = useCallback(
    async (serviceToDeleteId) => {
      await axios.delete(
        `/api/workorders/${id}/services/${serviceToDeleteId}`,
        {
          data: { user_id: user?.id },
        },
      );
      setServices((prev) => prev.filter((s) => s.id !== serviceToDeleteId));
    },
    [id, user?.id],
  );

  const addService = useCallback(
    async (serviceToAdd) => {
      const { data } = await axios.post(`/api/workorders/${id}/services`, {
        user_id: user?.id,
        ...serviceToAdd,
      });
      setServices((prev) => [...prev, data]);
    },
    [id, user?.id],
  );

  const addNote = useCallback(async (payload) => {
    const { data } = await axios.post(`/api/notes`, payload);
    setNotes((prev) => [...prev, data]);
  }, []);

  const updateStatus = useCallback(
    async (newStatus) => {
      try {
        const { data } = await axios.put(`/api/workorders/${id}`, {
          changes: { status_id: Number(newStatus?.id) },
          user_id: user?.id,
        });
        setDetails((prev) => ({
          ...prev,
          status: data?.Status?.name ?? prev.status,
        }));
      } catch (error) {
        console.error("Error updating status:", error);
      }
    },
    [id, user?.id],
  );

  const updateScope = useCallback(
    async (scope_of_work) => {
      await axios.put(`/api/workorders/${id}`, {
        user_id: user?.id,
        changes: { scope_of_work },
      });
      setDetails((prev) => ({ ...prev, scope_of_work }));
    },
    [id, user?.id],
  );

  const sendMSA = useCallback(async () => {
    try {
      const { data } = await axios.post(`/api/workorders/${id}/msa`, {
        user_id: user?.id,
      });
      // reflect the sent MSA in details so the card flips to the sent state
      setDetails((prev) => ({ ...prev, msa: data }));
      return data;
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response.data?.needsPandaDocAuth
      ) {
        window.location.href = "/api/pandadoc/oauth/initiate";
      } else {
        console.error("Error sending MSA:", err);
      }
    }
  }, [id, user?.id]);

  const actions = useMemo(
    () => ({
      updateDetails,
      updateService,
      deleteService,
      addService,
      addNote,
      updateStatus,
      updateScope,
      sendMSA,
    }),
    [
      updateDetails,
      updateService,
      deleteService,
      addService,
      addNote,
      updateStatus,
      updateScope,
      sendMSA,
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
export const useWorkOrderActions = () =>
  useCtx(ActionsContext, "useWorkOrderActions");
export const useWorkOrderServices = () =>
  useCtx(ServicesContext, "useWorkOrderServices");
