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
const FieldActivityContext = createContext();
const LinkedContext = createContext();
const MobilizationContext = createContext();

export function WorkOrderDetailProvider({ id, children }) {
  const { user } = useAuthenticatedUser();

  const [details, setDetails] = useState({});
  const [notes, setNotes] = useState([]);
  const [activity, setActivity] = useState([]);
  const [services, setServices] = useState([]);
  const [site, setSite] = useState({});
  const [fieldActivity, setFieldActivity] = useState({});
  const [linked, setLinked] = useState({
    parent: null,
    family: [],
    client_total: null,
  });
  const [loading, setLoading] = useState(true);
  const [mobilizationFees, setMobilizationFees] = useState([]);

  /**
   * Pulled out of the effect so it can be re-run. Creating a child work order
   * from this page changes both this record and its family, and there's no
   * way to patch that locally with any confidence.
   */
  const load = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/api/workorders/${id}`, { signal });
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
        setActivity(data.activity_log ?? []);
        setNotes(data.notes ?? []);
        setSite(data.site ?? {});
        setServices(data.services ?? []);
        setFieldActivity({
          communications: data?.communications ?? [],
          vendor_updates: data?.vendor_updates ?? [],
        });
        setLinked({
          parent: data?.parent ?? null,
          family: data?.family ?? [],
          client_total: data?.client_total ?? null,
        });
        setMobilizationFees(data?.mobilization_fees ?? []);
      } catch (error) {
        if (axios.isCancel?.(error) || error.name === "CanceledError") return;
        console.error("Error fetching work order:", error);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

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
        {
          user_id: user?.id,
          changes,
        },
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

  const addCommunication = useCallback(
    async (payload) => {
      try {
        const { data } = await axios.post(
          `/api/workorders/${id}/communications`,
          {
            ...payload,
            user_id: user?.id,
          },
        );
        setFieldActivity((prev) => ({
          ...prev,
          communications: [...(prev.communications ?? []), data],
        }));
      } catch (error) {
        console.error("error saving communication", error);
      }
    },
    [id, user?.id],
  );

  /**
   * Detaches a child from this job. The work order isn't deleted — it keeps
   * its vendor, pricing and history and simply becomes standalone.
   */
  const unlinkWorkOrder = useCallback(
    async (childId) => {
      await axios.put(`/api/workorders/${childId}/unlink`, {
        user_id: user?.id,
      });
      setLinked((prev) => ({
        ...prev,
        family: prev.family.filter((w) => w.id !== childId),
      }));
    },
    [user?.id],
  );

  const replaceFee = (fee) =>
    setMobilizationFees((prev) => {
      const exists = prev.some((f) => f.id === fee.id);
      return exists
        ? prev.map((f) => (f.id === fee.id ? fee : f))
        : [fee, ...prev];
    });

  const createMobilizationFee = useCallback(
    async ({ amount, notes }) => {
      const { data } = await axios.post(
        `/api/workorders/${id}/mobilization-fees`,
        {
          amount,
          notes,
          user_id: user?.id,
        },
      );
      replaceFee(data);
    },
    [id, user?.id],
  );

  const updateMobilizationFee = useCallback(
    async (feeId, changes) => {
      const { data } = await axios.put(
        `/api/workorders/${id}/mobilization-fees/${feeId}`,
        { ...changes, user_id: user?.id },
      );
      replaceFee(data);
    },
    [id, user?.id],
  );

  const sendMobilizationFee = useCallback(
    async (feeId) => {
      try {
        const { data } = await axios.post(
          `/api/workorders/${id}/mobilization-fees/${feeId}/send`,
          { user_id: user?.id },
        );
        replaceFee(data);
      } catch (err) {
        if (
          err.response?.status === 409 &&
          err.response.data?.needsPandaDocAuth
        ) {
          window.location.href = "/api/pandadoc/oauth/initiate";
          return;
        }
        throw err;
      }
    },
    [id, user?.id],
  );

  const markMobilizationFeePaid = useCallback(
    async (feeId, quickbooks_bill_id) => {
      const { data } = await axios.put(
        `/api/workorders/${id}/mobilization-fees/${feeId}/paid`,
        { quickbooks_bill_id, user_id: user?.id },
      );
      replaceFee(data);
    },
    [id, user?.id],
  );

  const voidMobilizationFee = useCallback(
    async (feeId, reason) => {
      const { data } = await axios.put(
        `/api/workorders/${id}/mobilization-fees/${feeId}/void`,
        { reason, user_id: user?.id },
      );
      replaceFee(data);
    },
    [id, user?.id],
  );

  const mobilizationValue = useMemo(() => {
    const open = mobilizationFees.find((f) => f.is_open);
    const current = open ?? mobilizationFees[0] ?? null;
    const vendorTotal =
      services.reduce((t, s) => t + (Number(s.vendor_price) || 0), 0) || null;
    const paid = mobilizationFees
      .filter((f) => f.status === "Paid")
      .reduce((t, f) => t + (Number(f.amount) || 0), 0);

    return {
      fees: mobilizationFees,
      current,
      history: mobilizationFees.filter((f) => f.id !== current?.id),
      vendorTotal,
      balanceDue: vendorTotal ? vendorTotal - paid : null,
      loading,
    };
  }, [mobilizationFees, services, loading]);

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
      addCommunication,
      unlinkWorkOrder,
      refresh,
      replaceFee,
      createMobilizationFee,
      updateMobilizationFee,
      sendMobilizationFee,
      markMobilizationFeePaid,
      voidMobilizationFee,
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
      addCommunication,
      unlinkWorkOrder,
      refresh,
      replaceFee,
      createMobilizationFee,
      updateMobilizationFee,
      sendMobilizationFee,
      markMobilizationFeePaid,
      voidMobilizationFee,
    ],
  );

  /**
   * `isParent` / `isChild` are derived here rather than in each consumer,
   * because more than the linked card cares: a parent holds no vendor, so the
   * Assigned Vendor and Vendor Onboarding cards shouldn't render on one.
   *
   * The job's client price lives on the parent, so a child reads it from
   * there and a parent reads its own.
   */
  const linkedValue = useMemo(() => {
    const isChild = Boolean(linked.parent);
    return {
      workOrderId: Number(id),
      parent: linked.parent,
      family: linked.family,
      isChild,
      isParent: !isChild && linked.family.length > 0,
      clientTotal: linked.parent?.client_total ?? linked.client_total,
      loading,
    };
  }, [linked, loading, id]);

  return (
    <ActionsContext.Provider value={actions}>
      <WorkOrderDetailsContext.Provider value={details}>
        <ActivityContext.Provider value={activity}>
          <NotesContext.Provider value={notes}>
            <SiteContext.Provider value={site}>
              <FieldActivityContext.Provider value={fieldActivity}>
                <LinkedContext.Provider value={linkedValue}>
                  <ServicesContext.Provider value={services}>
                    <MobilizationContext value={mobilizationValue}>
                      {children}
                    </MobilizationContext>
                  </ServicesContext.Provider>
                </LinkedContext.Provider>
              </FieldActivityContext.Provider>
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
export const useFieldActivity = () =>
  useCtx(FieldActivityContext, "useFieldActivity");
export const useLinkedWorkOrders = () =>
  useCtx(LinkedContext, "useLinkedWorkOrders");
export const useMobilizationFees = () =>
  useCtx(MobilizationContext, "useMobilizationFees");
