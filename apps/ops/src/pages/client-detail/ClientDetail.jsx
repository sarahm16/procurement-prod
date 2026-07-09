import { useParams } from "react-router-dom";

import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";
import ClientDetailsTab from "./tabs/ClientDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";

import {
  ClientDetailProvider,
  useClientActions,
  useClientActivity,
  useClientDetails,
  useClientNotes,
} from "./ClientDetailProvider";

function ClientDetail() {
  const { id } = useParams();
  return (
    <ClientDetailProvider id={id}>
      <ClientDetailLayout />
    </ClientDetailProvider>
  );
}

function ClientDetailLayout() {
  const details = useClientDetails();
  const notes = useClientNotes();
  const activity = useClientActivity();
  const { addNote, updateDetails } = useClientActions();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Client ${details?.client ?? ""}`}
          subtitle={`Details for ${details?.client ?? ""}`}
          status={details?.status}
          onStatusChange={(status) => updateDetails({ status })}
          breadcrumbs={[
            { label: "Clients", href: "/clients" },
            { label: details?.client },
          ]}
          address={`${details?.mailing_address}, ${details?.mailing_city}, ${details?.mailing_state} ${details?.mailing_zipcode}`}
        />
      }
      notes={notes}
      onAddNote={addNote}
      tabs={[
        { label: "Details", content: <ClientDetailsTab /> },
        { label: "Documentation", content: <></> },
        { label: "Sites", content: <></> },
        { label: "Work Orders", content: <></> },
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

export default ClientDetail;
