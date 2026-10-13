// contract-detail/tabs/ContractDetailsTab.jsx
//
// The agreement with the client and the plan for carrying it out. Doing the
// work (dates, sourcing, billing events, closeout) lives on work orders.
// Each card edits and saves on its own.
//
//   Left (what and how)            Right (money and people)
//   ─ Job                          ─ Contract term
//   ─ Scope of work                ─ Money plan
//   ─ Sourcing and timing          ─ Invoicing
//   ─ Requirements to plan for     ─ Systems and communication
//   ─ Warranty                     ─ Team
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, CircularProgress } from "@mui/material";

import InfoGrid from "../../../components/InfoGrid";
import RoleAssignment from "../../../components/RoleAssignment";
import { ServiceLineChip } from "../../../components/ServiceLineChips";
import FieldCard from "../components/FieldCard";
import { fmtDay, fmtMoney } from "../format";
import {
  useContractActions,
  useContractDetails,
} from "../ContractDetailProvider";

const CONTRACT_ENTITY_TYPE_ID = 5;

export const BILLING_TRIGGER_OPTIONS = [
  { id: "upon_completion", name: "Upon completion" },
  { id: "deposit_and_completion", name: "Deposit, then balance at completion" },
  { id: "monthly", name: "Monthly" },
  { id: "per_visit", name: "Per visit" },
];

/** Two independent columns, so cards of different heights don't leave gaps. */
const Column = ({ children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
    {children}
  </Box>
);

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function ContractDetailsTab() {
  const contract = useContractDetails();
  const { updateDetails } = useContractActions();

  const [serviceTypes, setServiceTypes] = useState([]);
  const [softwares, setSoftwares] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("/api/service-types")
      .then(({ data }) => setServiceTypes(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching service types:", e));
    axios
      .get("/api/softwares")
      .then(({ data }) => setSoftwares(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching softwares:", e));
  }, []);

  const opts = useMemo(
    () => ({
      clientPlatforms: softwares.filter((s) => !s.is_internal),
      internalSystems: softwares.filter((s) => s.is_internal),
    }),
    [softwares],
  );

  const save = async (changes) => {
    setError(null);
    try {
      await updateDetails(changes);
    } catch (e) {
      console.error("Error updating contract:", e);
      setError(
        e?.response?.data?.error ?? "Couldn't save the contract. Try again.",
      );
    }
  };

  if (!contract)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );

  const c = contract;
  const card = { contract: c, kind: c.handoff_kind, onSave: save };

  return (
    <InfoGrid>
      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 1fr) minmax(0, 1fr)",
            },
            gap: 3,
            alignItems: "start",
          }}
        >
          {/* ───────────── Left: what and how ───────────── */}
          <Column>
            <FieldCard
              {...card}
              title="Job"
              fields={[
                {
                  key: "project_name",
                  label: "Name",
                  type: "text",
                  required: true,
                  max: 255,
                },
                {
                  label: "Service line",
                  type: "computed",
                  display: (x) =>
                    x.service_line ? (
                      <ServiceLineChip line={{ name: x.service_line }} />
                    ) : null,
                },
                {
                  key: "service_type_id",
                  label: "Service type",
                  type: "select",
                  options: serviceTypes,
                },
                {
                  key: "company_id",
                  label: "Operating brand",
                  type: "select",
                  options: c.company_options ?? [],
                  hint: (x) =>
                    x.company_id ? null : "N/A — the parent company",
                },
                {
                  key: "executive_summary",
                  label: "Executive summary",
                  type: "longtext",
                  max: 2000,
                  placeholder:
                    "2–4 sentences: what NFC sold, why the client needs it, the result, and the promise that matters most",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Scope of work"
              fields={[
                {
                  key: "scope_of_work",
                  label: "Scope",
                  type: "longtext",
                  rows: 6,
                  placeholder:
                    "Approved tasks, materials, exclusions and acceptance requirements. Quantities per site go on the work orders.",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Sourcing and timing"
              fields={[
                {
                  label: "Source by",
                  type: "computed",
                  display: (x) =>
                    fmtDay(x.source_by_on) ?? "Set the approval date",
                  hint: (x) =>
                    x.sites_total
                      ? `${x.sites_sourced} of ${plural(x.sites_total, "site")} have a primary vendor`
                      : null,
                  tone: (x) => (x.source_by_overdue ? "bad" : null),
                },
                {
                  key: "sub_award_business_days",
                  label: "Sourcing window",
                  type: "int",
                  unit: "business days",
                  required: true,
                  hint: () => "From the approval date",
                },
                {
                  key: "lead_time_days",
                  label: "Construction lead time",
                  type: "int",
                  unit: "days",
                  required: true,
                  projectOnly: true,
                  hint: () => "Earliest start after the handoff",
                },
                {
                  key: "complete_by_on",
                  label: "Complete all work by",
                  type: "date",
                  hint: () => "The client's deadline, if any",
                },
                {
                  key: "client_sla",
                  label: "Client SLA",
                  type: "text",
                  max: 200,
                  placeholder: "e.g. Respond 4 hrs, complete 48 hrs",
                },
                {
                  key: "lead_time_override_reason",
                  label: "Why the client's dates win",
                  type: "text",
                  max: 300,
                  projectOnly: true,
                },
                {
                  label: "Handoff",
                  type: "computed",
                  display: (x) =>
                    x.handoff_on
                      ? `${fmtDay(x.handoff_on)}${x.handoff_submitted_by_name ? ` · ${x.handoff_submitted_by_name}` : ""}`
                      : "Not submitted",
                  hint: (x) =>
                    x.handoff_on ? null : "Submit from the Handoff tab",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Requirements to plan for"
              fields={[
                {
                  key: "permits_required",
                  label: "Permits expected",
                  type: "bool",
                },
                {
                  key: "traffic_control_required",
                  label: "Traffic control expected",
                  type: "bool",
                },
                {
                  key: "inspections_required",
                  label: "Inspections expected",
                  type: "bool",
                },
                {
                  key: "safety_notes",
                  label: "Safety and site rules",
                  type: "longtext",
                  max: 1000,
                  placeholder: "PPE, client site rules, licensing",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Warranty"
              fields={[
                {
                  key: "warranty_months",
                  label: "Length",
                  type: "int",
                  unit: "months",
                  hint: (x) =>
                    x.warranty_months
                      ? "From each work order's completion"
                      : null,
                },
                {
                  key: "warranty_terms",
                  label: "Terms",
                  type: "longtext",
                  max: 1000,
                },
              ]}
            />
          </Column>

          {/* ───────── Right: money and people ───────── */}
          <Column>
            <FieldCard
              {...card}
              title="Contract term"
              fields={[
                {
                  key: "start_date",
                  label: "Start date",
                  type: "date",
                  required: true,
                },
                {
                  key: "end_date",
                  label: "End date",
                  type: "date",
                  hint: (x) => (x.auto_renew ? "Ignored — auto-renews" : null),
                },
                { key: "auto_renew", label: "Auto renew", type: "bool" },
                {
                  key: "annual_increase_percent",
                  label: "Annual increase",
                  type: "percent",
                },
                { key: "approved_on", label: "Approved", type: "date" },
              ]}
            />

            <FieldCard
              {...card}
              title="Money plan"
              fields={[
                {
                  key: "value",
                  label: "Gross contract value",
                  type: "money",
                  required: true,
                },
                {
                  key: "sub_budget_percent",
                  label: "Subcontractor budget",
                  type: "percent",
                  required: true,
                  hint: (x) =>
                    x.sub_ceiling != null
                      ? `Ceiling ${fmtMoney(x.sub_ceiling)}`
                      : null,
                },
                {
                  key: "target_margin_percent",
                  label: "Required gross margin",
                  type: "percent",
                  required: true,
                },
                {
                  label: "Sub price vs client price",
                  type: "computed",
                  display: (x) =>
                    x.sub_price_percent == null
                      ? "No Sourcing pricing yet"
                      : `${x.sub_price_percent}%`,
                  hint: (x) =>
                    x.within_sub_budget == null
                      ? "From Sourcing, primary vendors"
                      : x.within_sub_budget
                        ? "Within budget"
                        : `Over the ${x.sub_budget_percent}% budget`,
                  tone: (x) => (x.within_sub_budget === false ? "bad" : null),
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Invoicing"
              fields={[
                {
                  key: "billing_trigger",
                  label: "When we invoice",
                  type: "select",
                  required: true,
                  options: BILLING_TRIGGER_OPTIONS,
                  hint: () => "Each work order is invoiced this way",
                },
                {
                  key: "deposit_percent",
                  label: "Deposit",
                  type: "percent",
                  required: true,
                  showIf: (x) => x.billing_trigger === "deposit_and_completion",
                  hint: (x) =>
                    x.final_percent != null
                      ? `Balance of ${x.final_percent}% at completion`
                      : null,
                },
                {
                  key: "client_payment_terms",
                  label: "Client payment terms",
                  type: "text",
                  max: 50,
                  placeholder: "e.g. Net 30",
                },
                {
                  key: "invoicing_notes",
                  label: "Invoicing instructions",
                  type: "longtext",
                  max: 1000,
                  placeholder:
                    "Portal steps, PO on every invoice, who to send to…",
                },
                {
                  key: "sub_payment_terms",
                  label: "Sub payment terms",
                  type: "text",
                  max: 50,
                  placeholder: "e.g. Net 45",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Systems and communication"
              fields={[
                {
                  key: "internal_system_id",
                  label: "Our system of record",
                  type: "select",
                  options: opts.internalSystems,
                },
                {
                  key: "software_id",
                  label: "Client platform",
                  type: "select",
                  options: opts.clientPlatforms,
                },
                {
                  key: "update_cadence",
                  label: "Client update cadence",
                  type: "text",
                  required: true,
                  max: 100,
                },
                {
                  key: "communication_plan",
                  label: "Communication plan",
                  type: "longtext",
                  max: 1000,
                  placeholder: "Who gets updates and how",
                },
              ]}
            />

            <RoleAssignment
              entity_type_id={CONTRACT_ENTITY_TYPE_ID}
              entity_id={c.id}
            />
          </Column>
        </Box>
      </Box>
    </InfoGrid>
  );
}
