import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Layout Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Context
import {
  SiteDetailProvider,
  useSiteDetails,
  useSiteNotes,
  useSiteActivity,
  useSiteActions,
} from "./SiteDetailProvider";

// Tabs
import SiteDetailsTab from "./tabs/SiteDetailsTab/SiteDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";
import SiteAttachmentsTab from "./tabs/AttachmentsTab/AttachmentsTab";
import axios from "axios";

function SiteDetail() {
  const { id } = useParams();
  return (
    <SiteDetailProvider id={id}>
      <SiteDetailLayout />
    </SiteDetailProvider>
  );
}

function SiteDetailLayout() {
  const details = useSiteDetails();
  const notes = useSiteNotes();
  const activity = useSiteActivity();
  const [statusOptions, setStatusOptions] = useState([]);

  const { updateStatus } = useSiteActions();

  const fetchSiteStatuses = async () => {
    const response = await axios.get(`/api/sites/statuses`);
    console.log("fetched statuses", response.data);
    setStatusOptions(response.data);
  };

  useEffect(() => {
    fetchSiteStatuses();
  }, []);

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Site ${details?.store ?? ""}`}
          subtitle={`Details for ${details?.store ?? ""}`}
          status={details?.status}
          statusOptions={statusOptions}
          onStatusChange={updateStatus}
          breadcrumbs={[
            { label: "Sites", href: "/sites" },
            { label: details?.store },
          ]}
          address={`${details?.mailing_address}, ${details?.mailing_city}, ${details?.mailing_state} ${details?.mailing_zipcode}`}
        />
      }
      notes={notes}
      onAddNote={() => {}}
      tabs={[
        {
          label: "Details",
          content: (
            <>
              <SiteDetailsTab />
            </>
          ),
        },
        { label: "Attachments", content: <SiteAttachmentsTab /> },
        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{ status_id: "Status" }}
            />
          ),
        },
      ]}
    />
  );
}

export default SiteDetail;
