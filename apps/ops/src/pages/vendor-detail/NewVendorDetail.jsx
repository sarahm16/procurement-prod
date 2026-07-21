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
import VendorDetailsTab from "./tabs/DetailsTab/VendorDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";

// Local Functions
import { sendEmailFromHTML } from "../../*/api/microsoftApi";
import { useVendorStatuses } from "../../*/hooks/useVendorStatuses";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import {
  useVendorNotes,
  useVendorDetails,
  useVendorActions,
  useVendorActivity,
  VendorDetailProvider,
} from "./VendorDetailProvider";

function VendorDetail() {
  const { id } = useParams();
  return (
    <VendorDetailProvider id={id}>
      <VendorDetailLayout />
    </VendorDetailProvider>
  );
}

function VendorDetailLayout() {
  // Get the vendor details from the vendor context

  // Hooks
  const { data: vendorStatuses = [] } = useVendorStatuses();
  const { user } = useAuthenticatedUser();

  const notes = useVendorNotes();
  const details = useVendorDetails();
  const activity = useVendorActivity();
  const { updateStatus, addNote } = useVendorActions();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={details.company}
          subtitle={`Details for Vendor ${details.company}`}
          status={details?.status}
          statusOptions={vendorStatuses}
          onStatusChange={updateStatus}
          breadcrumbs={[
            { label: "Vendors", href: "/vendors" },
            { label: `Vendor #${details.id}` },
          ]}
          meta={[]}
          address="123 Main St, Anytown, USA"
          onBack={() => console.log("Back button clicked")}
          actions={[]}
        />
      }
      tabs={[
        {
          label: "Details",
          //   content: <></>,
          content: <VendorDetailsTab />,
        },
        {
          label: "Documentation",
          content: <></>,
        },
        {
          label: "Sites",
          content: <></>,
        },
        {
          label: "Work Orders",
          content: <></>,
        },
        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{ status_id: "Status" }}
              valueFormatters={{
                status_id: (value) => {
                  const status = vendorStatuses.find(
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

export default VendorDetail;
