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
  company_id: "Operating brand",
  start_date: "Start date",
  end_date: "End date",
  auto_renew: "Auto renew",
  value: "Gross contract value",
  annual_increase_percent: "Annual increase %",
  executive_summary: "Executive summary",
  scope_of_work: "Scope of work",
  approved_on: "Approved",
  sub_budget_percent: "Subcontractor budget %",
  target_margin_percent: "Required gross margin %",
  deposit_percent: "Deposit %",
  deposit_invoiced_on: "Deposit invoiced",
  deposit_due_on: "Deposit due",
  deposit_received_on: "Deposit received",
  deposit_exception_reason: "Deposit exception",
  deposit_exception_by: "Exception approved by",
  deposit_exception_on: "Exception approved on",
  final_invoiced_on: "Final invoiced",
  final_due_on: "Final due",
  final_received_on: "Final received",
  lead_time_days: "Lead time (days)",
  target_start_on: "Target start",
  client_required_on: "Client required date",
  client_sla: "Client SLA",
  lead_time_override_reason: "Lead-time override reason",
  production_rate_per_day: "Daily production rate",
  production_days: "Production days",
  planned_finish_on: "Planned finish",
  update_cadence: "Update cadence",
  communication_plan: "Communication plan",
  sub_award_business_days: "Award window (business days)",
  sub_awarded_on: "Subcontractor awarded",
  client_payment_terms: "Client payment terms",
  sub_payment_terms: "Sub payment terms",
  permits_required: "Permits required",
  traffic_control_required: "Traffic control required",
  inspections_required: "Inspections required",
  safety_notes: "Safety and site rules",
  substantial_completion_on: "Substantial completion",
  completion_notice_on: "Completion notice sent",
  client_accepted_on: "Client accepted",
  closed_on: "Handoff closed",
  warranty_expires_on: "Warranty expires",
  follow_up_on: "Follow-up",
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
