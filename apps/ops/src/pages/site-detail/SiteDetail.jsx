import { useParams } from "react-router-dom";
import { createContext, useEffect, useState } from "react";

// Layout Components
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Context
import { SiteDetailProvider, useSiteDetails } from "./SiteDetailProvider";

// Components
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
  // const notes = useSiteNotes();
  // const activity = useSiteActivity();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Site ${details?.store ?? ""}`}
          subtitle={`Details for ${details?.store ?? ""}`}
          status={details?.status}
          onStatusChange={(status) => updateDetails({ status })}
          breadcrumbs={[
            { label: "Sites", href: "/sites" },
            { label: details?.store },
          ]}
          address={`${details?.mailing_address}, ${details?.mailing_city}, ${details?.mailing_state} ${details?.mailing_zipcode}`}
        />
      }
      notes={[]}
      onAddNote={() => {}}
      tabs={[
        { label: "Details", content: <></> },
        { label: "Documentation", content: <></> },
        { label: "Sites", content: <></> },
        {
          label: "Activity",
          content: (
            <ActivityLog entries={[]} fieldLabels={{ status_id: "Status" }} />
          ),
        },
      ]}
    />
  );
}

export default SiteDetail;
