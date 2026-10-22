// Libraries
import { useParams } from "react-router-dom";

// Local Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";
import ClientSegmentChip from "../../components/ClientSegmentChip/ClientSegmentChip";

// Tabs
// import WorkOrderDetailsTab from "./tabs/DetailsTab/WorkOrderDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";
import MessagesTab from "./tabs/MessagesTab/MessagesTab";
import WorkOrderDetailsTab from "./tabs/DetailsTab/WorkOrderDetailsTab";
import FieldActivityTab from "./tabs/FieldActivityTab/FieldActivityTab";
import AttachmentsTab from "./tabs/AttachmentsTab/AttachmentsTab";
import PhaseActions from "./PhaseActions";
import AccountingTab from "./tabs/AccountingTab/AccountingTab";

// Local Functions
import { useWorkOrderStatuses } from "../../*/hooks/useWorkOrderStatuses";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import {
  useWorkOrderNotes,
  useWorkOrderDetails,
  useWorkOrderActions,
  useWorkOrderActivity,
  WorkOrderDetailProvider,
  useWorkOrderSite,
  useLinkedWorkOrders,
} from "./WorkOrderDetailProvider";

import Tooltip from "@mui/material/Tooltip";

function WorkOrderDetail() {
  const { id } = useParams();
  return (
    <WorkOrderDetailProvider id={id}>
      <WorkOrderDetailLayout id={id} />
    </WorkOrderDetailProvider>
  );
}

function WorkOrderDetailLayout({ id }) {
  // Get the WorkOrder details from the WorkOrder context
  const linked = useLinkedWorkOrders();

  // Hooks
  const { data: WorkOrderStatuses = [] } = useWorkOrderStatuses();
  const { user } = useAuthenticatedUser();

  const notes = useWorkOrderNotes();
  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const activity = useWorkOrderActivity();
  const { updateStatus, addNote } = useWorkOrderActions();

  // The status menu only offers the current phase's statuses. A child in
  // finance is tracked on its parent, so its status is read-only.
  const phase = details.phase ?? "ops";
  const currentStatus =
    WorkOrderStatuses.find((s) => s.name === details.status) ??
    (details.status ? { name: details.status } : null);
  const lockedChild = linked.isChild && phase === "finance";
  const statusOptions = lockedChild
    ? []
    : WorkOrderStatuses.filter((s) => (s.phase ?? "ops") === phase);

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={details.work_order_number}
          subtitle={`Details for Work Order ${details.work_order_number}`}
          status={currentStatus}
          statusOptions={statusOptions}
          statusTooltip={
            lockedChild
              ? "In finance with its parent; change it there"
              : undefined
          }
          actions={<PhaseActions />}
          onStatusChange={updateStatus}
          breadcrumbs={[
            { label: "Work Orders", href: "/workorders" },
            { label: `${details.work_order_number}` },
          ]}
          meta={[]}
          address={`${site.mailing_address ?? ""}, ${site.mailing_city ?? ""}, ${site.mailing_state ?? ""} ${site.mailing_zipcode ?? ""}`}
          onBack={() => console.log("Back button clicked")}
          badges={
            details?.segment ? (
              <Tooltip
                title={`From the client${details?.client ? ` (${details.client})` : ""} — change it there`}
                arrow
              >
                <span>
                  <ClientSegmentChip segment={details.segment} />
                </span>
              </Tooltip>
            ) : null
          }
        />
      }
      tabs={[
        {
          label: "Details",
          content: <WorkOrderDetailsTab />,
        },

        {
          label: "Attachments",
          content: <AttachmentsTab />,
        },
        {
          label: "Field Activity",
          content: <FieldActivityTab />,
        },
        {
          label: "Messages",
          content: <MessagesTab />,
        },
        {
          label: "Accounting",
          content: <AccountingTab />,
        },
        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{ status_id: "Status", phase: "Phase" }}
              valueFormatters={{
                status_id: (value) => {
                  const status = WorkOrderStatuses.find(
                    (s) => s.id === Number(value),
                  );
                  return status ? status.name : value;
                },
              }}
            />
          ),
        },
      ]}
      notes={notes}
      notesLoading={false}
      onAddNote={addNote}
      currentUser="Sarah Carter"
      entityName={details.company}
    />
  );
}

export default WorkOrderDetail;
