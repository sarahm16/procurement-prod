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
} from "./SiteDetailProvider";

// Tabs
import SiteDetailsTab from "./tabs/SiteDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";

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

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Site ${details?.store ?? ""}`}
          subtitle={`Details for ${details?.store ?? ""}`}
          status={details?.status}
          onStatusChange={() => {}}
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
        { label: "Documentation", content: <></> },
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
