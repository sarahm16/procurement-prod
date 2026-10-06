import { useParams } from "react-router-dom";

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
import SiteDetailsTab from "./tabs/SiteDetailsTab/SiteDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";
import SiteSourcingTab from "./tabs/SourcingTab/SiteSourcingTab";
import SiteAttachmentsTab from "./tabs/AttachmentsTab/AttachmentsTab";

/** "2026-11-01" → "Nov 1, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

/**
 * The short note next to the status chip. The status itself is worked out
 * from the site's service lines, so the note says which part of that matters:
 * how many lines are running, when it starts, or when it stopped.
 */
function statusHint(d) {
  const active = d?.active_lines ?? 0;
  const total = active + (d?.upcoming_lines ?? 0) + (d?.ended_lines ?? 0);
  switch (d?.status_key) {
    case "active":
      return total > active
        ? `${active} of ${total} service lines active`
        : null;
    case "upcoming":
      return d.next_start_date ? `Starts ${fmtDay(d.next_start_date)}` : null;
    case "inactive":
      return d.last_end_date
        ? `Last service ended ${fmtDay(d.last_end_date)}`
        : null;
    default:
      return null;
  }
}

/** Address without "undefined, undefined" while the site is loading. */
const formatAddress = (d) => {
  const cityLine = [
    d?.mailing_city,
    [d?.mailing_state, d?.mailing_zipcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [d?.mailing_address, cityLine].filter(Boolean).join(", ") || null;
};

function SiteDetail() {
  const { id } = useParams();
  return (
    <SiteDetailProvider id={id}>
      <SiteDetailLayout />
    </SiteDetailProvider>
  );
}

function SiteDetailLayout() {
  const { id } = useParams();
  const details = useSiteDetails();
  const notes = useSiteNotes();
  const activity = useSiteActivity();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Site ${details?.store ?? ""}`}
          subtitle={`Details for ${details?.store ?? ""}`}
          // Read-only: no statusOptions / onStatusChange. A site is Active
          // when one of its service lines is — change the lines on the
          // Details tab, not the site.
          status={details?.status}
          statusHint={statusHint(details)}
          statusTooltip="Worked out from this site's service lines. To change it, add or remove the site on a contract from the Service Lines card."
          breadcrumbs={[
            { label: "Sites", href: "/sites" },
            { label: details?.store },
          ]}
          address={formatAddress(details)}
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
          label: "Sourcing",
          content: <SiteSourcingTab siteId={id} />,
        },
        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{
                status_id: "Status", // older entries, from the manual status
                status: "Status",
                service_line_status: "Service line",
                service_line_dates: "Service line",
              }}
            />
          ),
        },
      ]}
    />
  );
}

export default SiteDetail;
