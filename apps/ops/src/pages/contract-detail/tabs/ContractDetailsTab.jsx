// contract-detail/tabs/ContractDetailsTab.jsx
//
// The contract's fields, grouped into cards. New fields go into whichever
// card they belong to (or a new card) — each card edits and saves on its own.
//
//   Left:   Terms (what and when)
//   Right:  Pricing (money), Team (who on our side)
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import InfoGrid, { FieldRow, InfoCard } from "../../../components/InfoGrid";
import RoleAssignment from "../../../components/RoleAssignment";
import { ServiceLineChip } from "../../../components/ServiceLineChips";
import {
  useContractActions,
  useContractDetails,
} from "../ContractDetailProvider";

const CONTRACT_ENTITY_TYPE_ID = 5;

/** "2026-11-01" → "Nov 1, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

const fmtMoney = (v) =>
  v == null || v === ""
    ? "—"
    : Number(v).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      });

const text = (v) => (
  <Typography sx={{ fontSize: "0.85rem" }}>{v ?? "—"}</Typography>
);

/** Two independent columns, so cards of different heights don't leave gaps. */
const Column = ({ children }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
    {children}
  </Box>
);

// ─── Field renderers ─────────────────────────────────────────────────────────

const dateField =
  (key) =>
  (value, editing, { onChange }) =>
    editing ? (
      <TextField
        type="date"
        size="small"
        fullWidth
        value={value ?? ""}
        onChange={(e) => onChange(key, e.target.value || null)}
        InputLabelProps={{ shrink: true }}
      />
    ) : (
      text(fmtDay(value))
    );

const selectField =
  (key, options) =>
  (value, editing, { onChange }) =>
    editing ? (
      <TextField
        select
        size="small"
        fullWidth
        value={value ?? ""}
        onChange={(e) =>
          onChange(key, e.target.value === "" ? null : e.target.value)
        }
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {o.name}
          </MenuItem>
        ))}
      </TextField>
    ) : (
      text(options.find((o) => o.id === value)?.name)
    );

const numberField =
  (key, format) =>
  (value, editing, { onChange }) =>
    editing ? (
      <TextField
        type="number"
        size="small"
        fullWidth
        value={value ?? ""}
        onChange={(e) => onChange(key, e.target.value)}
      />
    ) : (
      text(format(value))
    );

// ─── Tab ─────────────────────────────────────────────────────────────────────

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

  const save = async (draft) => {
    setError(null);
    try {
      await updateDetails(draft);
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
              lg: "minmax(0, 7fr) minmax(0, 5fr)",
            },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Column>
            <InfoCard
              title="Terms"
              icon={null}
              collapsible
              defaultOpen
              editable
              editValues={contract}
              onSave={save}
              span="full"
            >
              <FieldRow
                label="Name"
                value={contract.project_name}
                fieldKey="project_name"
                fullWidth
              />
              <FieldRow
                label="Service Line"
                value={contract.service_line}
                fieldKey="service_line"
                // Not editable: sites, vendors and pricing hang off the line.
                render={(value) =>
                  value ? <ServiceLineChip line={{ name: value }} /> : text("—")
                }
              />
              <FieldRow
                label="Service Type"
                value={contract.service_type_id}
                fieldKey="service_type_id"
                render={selectField("service_type_id", serviceTypes)}
              />
              <FieldRow
                label="Software"
                value={contract.software_id}
                fieldKey="software_id"
                render={selectField("software_id", softwares)}
              />
              <FieldRow
                label="Start Date"
                value={contract.start_date}
                fieldKey="start_date"
                render={dateField("start_date")}
              />
              <FieldRow
                label="End Date"
                value={contract.end_date}
                fieldKey="end_date"
                render={(value, editing, helpers) =>
                  !editing && contract.auto_renew
                    ? text(
                        value
                          ? `${fmtDay(value)} (ignored — auto-renews)`
                          : "None — auto-renews",
                      )
                    : dateField("end_date")(value, editing, helpers)
                }
              />
              <FieldRow
                label="Auto Renew"
                value={contract.auto_renew}
                fieldKey="auto_renew"
                render={(value, editing, { onChange }) =>
                  editing ? (
                    <Switch
                      checked={Boolean(value)}
                      onChange={(e) => onChange("auto_renew", e.target.checked)}
                    />
                  ) : (
                    text(value ? "Yes" : "No")
                  )
                }
              />
            </InfoCard>
          </Column>

          <Column>
            <InfoCard
              title="Pricing"
              icon={null}
              collapsible
              defaultOpen
              editable
              editValues={contract}
              onSave={save}
              span="full"
            >
              <FieldRow
                label="Contract Value"
                value={contract.value}
                fieldKey="value"
                render={numberField("value", fmtMoney)}
              />
              <FieldRow
                label="Annual Increase"
                value={contract.annual_increase_percent}
                fieldKey="annual_increase_percent"
                render={numberField("annual_increase_percent", (v) =>
                  v == null || v === "" ? "—" : `${v}%`,
                )}
              />
            </InfoCard>

            <RoleAssignment
              entity_type_id={CONTRACT_ENTITY_TYPE_ID}
              entity_id={contract.id}
            />
          </Column>
        </Box>
      </Box>
    </InfoGrid>
  );
}
