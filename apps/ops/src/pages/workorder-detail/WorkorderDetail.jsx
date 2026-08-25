// Libraries
import { useParams } from "react-router-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

// Local Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Tabs
// import WorkOrderDetailsTab from "./tabs/DetailsTab/WorkOrderDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";
// import WorkOrderDocumentationTab from "./tabs/Documentation/WorkOrderDocumentationTab";

// Local Functions
import { sendEmailFromHTML } from "../../*/api/microsoftApi";
import { useWorkOrderStatuses } from "../../*/hooks/useWorkOrderStatuses";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import {
  useWorkOrderNotes,
  useWorkOrderDetails,
  useWorkOrderActions,
  useWorkOrderActivity,
  WorkOrderDetailProvider,
  useWorkOrderSite,
} from "./WorkOrderDetailProvider";
import WorkOrderDetailsTab from "./tabs/DetailsTab/WorkOrderDetailsTab";
import FieldActivityTab from "./tabs/FieldActivityTab/FieldActivityTab";
import AttachmentsTab from "./tabs/AttachmentsTab/AttachmentsTab";

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

  // Hooks
  const { data: WorkOrderStatuses = [] } = useWorkOrderStatuses();
  const { user } = useAuthenticatedUser();

  const notes = useWorkOrderNotes();
  const details = useWorkOrderDetails();
  const site = useWorkOrderSite();
  const activity = useWorkOrderActivity();
  const { updateStatus, addNote } = useWorkOrderActions();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={details.work_order_number}
          subtitle={`Details for Work Order ${details.work_order_number}`}
          status={details?.status}
          statusOptions={WorkOrderStatuses}
          onStatusChange={updateStatus}
          breadcrumbs={[
            { label: "Work Orders", href: "/workorders" },
            { label: `${details.work_order_number}` },
          ]}
          meta={[]}
          address={`${site.mailing_address ?? ""}, ${site.mailing_city ?? ""}, ${site.mailing_state ?? ""} ${site.mailing_zipcode ?? ""}`}
          onBack={() => console.log("Back button clicked")}
          actions={[]}
        />
      }
      tabs={[
        {
          label: "Details",
          content: <WorkOrderDetailsTab />,
        },
        {
          label: "Field Activity",
          content: <FieldActivityTab />,
        },
        {
          label: "Attachments",
          content: <AttachmentsTab />,
        },

        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{ status_id: "Status" }}
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
