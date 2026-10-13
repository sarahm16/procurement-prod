// contract-detail/tabs/ContractDetailsTab.jsx
//
// Every contract and handoff field, grouped the way the handoff deck groups
// them. Each card edits and saves on its own. Project-only fields (deposit,
// lead time, production) hide on On Demand and PM contracts.
//
//   Left (the work)         Right (the money and the people)
//   ─ Job                   ─ Contract term
//   ─ Scope of work         ─ Money and billing
//   ─ Schedule              ─ Subcontractor and risk
//   ─ Closeout              ─ Systems and communication
//                           ─ Team
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, CircularProgress } from "@mui/material";

import InfoGrid from "../../../components/InfoGrid";
import RoleAssignment from "../../../components/RoleAssignment";
import { ServiceLineChip } from "../../../components/ServiceLineChips";
import { useEmployees } from "../../../*/hooks/useEmployees";
import FieldCard from "../components/FieldCard";
import { fmtDay, fmtMoney } from "../format";
import {
  useContractActions,
  useContractDetails,
} from "../ContractDetailProvider";

const CONTRACT_ENTITY_TYPE_ID = 5;

/** Two independent columns, so cards of different heights don't leave gaps. */
const Column = ({ children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
    {children}
  </Box>
);

export default function ContractDetailsTab() {
  const contract = useContractDetails();
  const { updateDetails } = useContractActions();
  const { data: employees = [] } = useEmployees();

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
      employees: employees
        .filter((e) => !e.terminated)
        .map((e) => ({ id: e.id, name: e.name })),
    }),
    [softwares, employees],
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
          {/* ───────────── Left: the work ───────────── */}
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
                    "Each approved task, quantity, material, location, exclusion and acceptance requirement",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Schedule"
              fields={[
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
                {
                  key: "lead_time_days",
                  label: "Lead time",
                  type: "int",
                  unit: "days",
                  projectOnly: true,
                  required: true,
                },
                {
                  key: "target_start_on",
                  label: "Target start",
                  type: "date",
                  hint: (x) =>
                    x.handoff_kind === "project" ? "Handoff + lead time" : null,
                },
                {
                  key: "client_required_on",
                  label: "Client required date",
                  type: "date",
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
                  label: "Why the client's date wins",
                  type: "text",
                  max: 300,
                  projectOnly: true,
                },
                {
                  key: "production_rate_per_day",
                  label: "Daily production rate",
                  type: "money",
                  projectOnly: true,
                },
                {
                  key: "production_days",
                  label: "Production days",
                  type: "int",
                  min: 1,
                  unit: "days",
                  projectOnly: true,
                  hint: (x) =>
                    x.production_days_computed
                      ? `Value ÷ rate = ${x.production_days_computed} days`
                      : null,
                  tone: (x) =>
                    x.production_days &&
                    x.production_days_computed &&
                    x.production_days !== x.production_days_computed
                      ? "warn"
                      : null,
                },
                {
                  key: "planned_finish_on",
                  label: "Planned finish",
                  type: "date",
                  hint: () => "Weekends skipped",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Closeout"
              fields={[
                {
                  key: "substantial_completion_on",
                  label: "Substantial completion",
                  type: "date",
                },
                {
                  key: "completion_notice_on",
                  label: "Completion notice sent",
                  type: "date",
                },
                {
                  key: "client_accepted_on",
                  label: "Client accepted",
                  type: "date",
                },
                { key: "closed_on", label: "Handoff closed", type: "date" },
                {
                  key: "warranty_expires_on",
                  label: "Warranty expires",
                  type: "date",
                },
                { key: "follow_up_on", label: "Follow-up", type: "date" },
              ]}
            />
          </Column>

          {/* ───────── Right: the money and the people ───────── */}
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
              ]}
            />

            <FieldCard
              {...card}
              title="Money and billing"
              fields={[
                {
                  key: "value",
                  label: "Gross contract value",
                  type: "money",
                  required: true,
                },
                { key: "approved_on", label: "Approved", type: "date" },
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
                {
                  key: "target_margin_percent",
                  label: "Required gross margin",
                  type: "percent",
                  required: true,
                },
                {
                  key: "deposit_percent",
                  label: "Deposit",
                  type: "percent",
                  required: true,
                  projectOnly: true,
                  hint: (x) =>
                    x.deposit_amount != null
                      ? `${fmtMoney(x.deposit_amount)} · final ${x.final_percent}% = ${fmtMoney(x.final_amount)}`
                      : null,
                },
                {
                  key: "deposit_invoiced_on",
                  label: "Deposit invoiced",
                  type: "date",
                  projectOnly: true,
                },
                {
                  key: "deposit_due_on",
                  label: "Deposit due",
                  type: "date",
                  projectOnly: true,
                },
                {
                  key: "deposit_received_on",
                  label: "Deposit received",
                  type: "date",
                  projectOnly: true,
                  hint: (x) =>
                    x.deposit_received_on || x.deposit_exception_on
                      ? null
                      : "No mobilization until received",
                  tone: (x) =>
                    !x.deposit_received_on && !x.deposit_exception_on
                      ? "warn"
                      : null,
                },
                {
                  key: "deposit_exception_reason",
                  label: "Mobilize-before-deposit exception",
                  type: "text",
                  max: 300,
                  projectOnly: true,
                },
                {
                  key: "deposit_exception_by",
                  label: "Exception approved by",
                  type: "select",
                  options: opts.employees,
                  projectOnly: true,
                },
                {
                  key: "deposit_exception_on",
                  label: "Exception approved on",
                  type: "date",
                  projectOnly: true,
                },
                {
                  key: "final_invoiced_on",
                  label: "Final invoiced",
                  type: "date",
                },
                { key: "final_due_on", label: "Final due", type: "date" },
                {
                  key: "final_received_on",
                  label: "Final received",
                  type: "date",
                },
              ]}
            />

            <FieldCard
              {...card}
              title="Subcontractor and risk"
              fields={[
                {
                  key: "sub_award_business_days",
                  label: "Award window",
                  type: "int",
                  unit: "business days",
                  required: true,
                },
                {
                  label: "Award deadline",
                  type: "computed",
                  display: (x) =>
                    fmtDay(x.sub_award_deadline_on) ?? "Set the approval date",
                  hint: (x) =>
                    x.sub_awarded_on
                      ? null
                      : x.sub_award_overdue
                        ? "Overdue"
                        : null,
                  tone: (x) => (x.sub_award_overdue ? "bad" : null),
                },
                {
                  key: "sub_awarded_on",
                  label: "Subcontractor awarded",
                  type: "date",
                },
                {
                  key: "client_payment_terms",
                  label: "Client payment terms",
                  type: "text",
                  max: 50,
                  placeholder: "e.g. Net 30",
                },
                {
                  key: "sub_payment_terms",
                  label: "Sub payment terms",
                  type: "text",
                  max: 50,
                  placeholder: "e.g. Net 45",
                },
                {
                  key: "permits_required",
                  label: "Permits required",
                  type: "bool",
                },
                {
                  key: "traffic_control_required",
                  label: "Traffic control required",
                  type: "bool",
                },
                {
                  key: "inspections_required",
                  label: "Inspections required",
                  type: "bool",
                },
                {
                  key: "safety_notes",
                  label: "Safety and site rules",
                  type: "longtext",
                  max: 1000,
                  placeholder: "PPE, site-specific rules, licensing",
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
