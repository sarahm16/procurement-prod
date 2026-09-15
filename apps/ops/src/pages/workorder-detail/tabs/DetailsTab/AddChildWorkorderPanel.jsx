import { useMemo, useState } from "react";
import axios from "axios";
import { Alert } from "@mui/material";

import SlideOutPanel from "../../../../components/ListPageLayout/SlideOutPanel";
import CreateWorkorderForm from "../../../workorders/CreateWorkorderForm";
import {
  useLinkedWorkOrders,
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderSite,
} from "../../WorkOrderDetailProvider";
import useAuthenticatedUser from "../../../../*/hooks/useAuthenticatedUser";

/**
 * Adds another vendor's scope to the job this work order belongs to.
 *
 * Works from either end. Opened on a parent, the new work order becomes its
 * child. Opened on a child, it becomes a sibling — parented to the same job —
 * because "we need a third vendor" is just as likely to occur to someone
 * looking at the concrete work order as at the job container.
 */
export default function AddChildWorkOrderPanel({ open, onClose }) {
  const { user } = useAuthenticatedUser;
  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const { workOrderId, parent, isChild } = useLinkedWorkOrders();
  const { refresh } = useWorkOrderActions();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Site always comes from the current record — a child is the same site as
   * its parent, so it doesn't matter which end we're standing on. Type,
   * priority, dates and software seed from this work order since a sibling is
   * the same job on the same schedule; only the scope and vendor differ.
   */
  const lockedParent = useMemo(
    () => ({
      id: parent?.id ?? workOrderId,
      work_order_number:
        parent?.work_order_number ?? details?.work_order_number,
      type: details?.type,
      priority: details?.priority,
      software_id: details?.software_id,
      start_date: details?.start_date,
      due_date: details?.due_date,
      site_id: site?.id,
      site: site?.store,
      client: site?.Client?.client,
      // Only relevant when this work order is about to become a parent for the
      // first time — an existing parent already has no vendor.
      vendor: isChild ? null : (details?.vendor?.company ?? null),
      vendor_id: isChild ? null : (details?.vendor?.id ?? null),
    }),
    [parent, workOrderId, details, site, isChild],
  );

  const handleSubmit = async (form, services, roleAssignments) => {
    setSubmitting(true);
    setError(null);
    try {
      await axios.post("/api/workorders", {
        parent_work_order_id: Number(form.parent_work_order_id),
        site_id: Number(form.site_id),
        type: form.type,
        external_id: form.external_id || null,
        software_id: form.software_id ? Number(form.software_id) : null,
        priority: form.priority,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        user_id: user?.id,
        created_by_email: user?.email,
        scope_of_work: form.scope_of_work,
        services: services
          .filter((s) => s.service_id)
          .map((s) => ({
            service_id: Number(s.service_id),
            client_price: s.client_price === "" ? null : Number(s.client_price),
            vendor_price: s.vendor_price === "" ? null : Number(s.vendor_price),
          })),
        role_assignments: Object.entries(roleAssignments || {}).flatMap(
          ([roleId, empIds]) =>
            empIds.map((employee_id) => ({
              internal_role_id: Number(roleId),
              employee_id: Number(employee_id),
            })),
        ),
      });

      // Refetch rather than patch: creating the first child clears this work
      // order's vendor, so details are stale too, not just the family.
      await refresh();
      onClose();
    } catch (e) {
      console.error("Error creating child work order:", e);
      setError(e.response?.data?.error ?? "Couldn't create that work order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SlideOutPanel
      open={open}
      onClose={onClose}
      width={560}
      title="Add Work Order to Job"
      subtitle={`Another vendor's scope on ${lockedParent.work_order_number ?? "this job"}`}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <CreateWorkorderForm
        submitting={submitting}
        onClose={onClose}
        onSubmit={handleSubmit}
        lockedParent={lockedParent}
      />
    </SlideOutPanel>
  );
}
