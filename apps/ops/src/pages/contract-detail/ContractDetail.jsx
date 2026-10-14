// contract-detail/ContractDetail.jsx
//
// One contract's own page: /contracts/:id. Add the route next to the client
// one:   <Route path="/contracts/:id" element={<ContractDetail />} />
import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";

// Layout
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";

// Tabs
import ContractDetailsTab from "./tabs/ContractDetailsTab";
import ContractHandoffTab from "./tabs/ContractHandoffTab";
import ContractSitesTab from "./tabs/ContractSitesTab";
import ContractAttachmentsTab from "./tabs/ContractAttachmentsTab";

import {
  ContractDetailProvider,
  useContractActions,
  useContractActivity,
  useContractDetails,
  useContractNotes,
  useContractState,
} from "./ContractDetailProvider";

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

/** The short note next to the status chip. */
function statusHint(c) {
  switch (c?.status_key) {
    case "upcoming":
      return `Starts ${fmtDay(c.starts_on)}`;
    case "ended":
      return `Ended ${fmtDay(c.ends_on)}`;
    case "active":
      if (c.auto_renew) return `Since ${fmtDay(c.starts_on)} · auto-renews`;
      return c.ends_on
        ? `${fmtDay(c.starts_on)} – ${fmtDay(c.ends_on)}`
        : `Since ${fmtDay(c.starts_on)} · no end date`;
    default:
      return null;
  }
}

const sitesText = (c) =>
  c.upcoming_sites
    ? `${c.active_sites} (+${c.upcoming_sites} upcoming)`
    : String(c.active_sites ?? 0);

/** Field names as the Activity tab shows them. */
const FIELD_LABELS = {
  project_name: "Name",
  service_type_id: "Service type",
  software_id: "Client platform",
  internal_system_id: "Our system of record",
  start_date: "Start date",
  end_date: "End date",
  auto_renew: "Auto renew",
  annual_increase_percent: "Annual increase %",
  approved_on: "Approved",
  value: "Gross contract value",
  executive_summary: "Executive summary",
  scope_of_work: "Scope of work",
  sub_budget_percent: "Subcontractor budget %",
  target_margin_percent: "Required gross margin %",
  billing_trigger: "When we invoice",
  deposit_percent: "Deposit %",
  client_payment_terms: "Client payment terms",
  invoicing_notes: "Invoicing instructions",
  sub_payment_terms: "Sub payment terms",
  sub_award_business_days: "Sourcing window (business days)",
  lead_time_days: "Construction lead time (days)",
  complete_by_on: "Complete all work by",
  client_sla: "Client SLA",
  lead_time_override_reason: "Why the client's dates win",
  update_cadence: "Update cadence",
  communication_plan: "Communication plan",
  permits_required: "Permits expected",
  traffic_control_required: "Traffic control expected",
  inspections_required: "Inspections expected",
  safety_notes: "Safety and site rules",
  warranty_months: "Warranty (months)",
  warranty_terms: "Warranty terms",
  handoff: "Handoff",
  checklist: "Checklist",
};

function ContractDetail() {
  const { id } = useParams();
  return (
    <ContractDetailProvider id={id}>
      <ContractDetailLayout />
    </ContractDetailProvider>
  );
}

function ContractDetailLayout() {
  const contract = useContractDetails();
  const notes = useContractNotes();
  const activity = useContractActivity();
  const { addNote } = useContractActions();
  const { notFound } = useContractState();

  if (notFound)
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography sx={{ color: "text.secondary" }}>
          This contract doesn't exist, or it was deleted.
        </Typography>
      </Box>
    );

  const name = contract?.project_name || "Untitled contract";

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={contract ? name : ""}
          subtitle={contract?.client ? `Contract for ${contract.client}` : ""}
          // Read-only — the status follows the contract's dates.
          status={contract?.status}
          statusHint={statusHint(contract)}
          statusTooltip="Worked out from the contract's start and end dates. Change the dates on the Details tab."
          breadcrumbs={[
            { label: "Clients", href: "/clients" },
            {
              label: contract?.client,
              href: contract ? `/clients/${contract.client_id}` : undefined,
            },
            { label: contract ? name : "" },
          ]}
          meta={
            contract
              ? [
                  {
                    label: "Service line",
                    value: contract.service_line ?? "—",
                  },
                  { label: "Sites", value: sitesText(contract) },
                  {
                    label: "Handoff",
                    value: contract.handoff_on
                      ? `Submitted ${fmtDay(contract.handoff_on)}`
                      : "Not submitted",
                  },
                ]
              : []
          }
        />
      }
      notes={notes}
      onAddNote={addNote}
      tabs={[
        { label: "Details", content: <ContractDetailsTab /> },
        { label: "Handoff", content: <ContractHandoffTab /> },
        { label: "Sites", content: <ContractSitesTab /> },
        { label: "Attachments", content: <ContractAttachmentsTab /> },
        {
          label: "Activity",
          content: (
            <ActivityLog entries={activity} fieldLabels={FIELD_LABELS} />
          ),
        },
      ]}
    />
  );
}

export default ContractDetail;
