// workorder-details/tabs/DetailsTab/GeneralInfoCard.jsx
// MUI Components
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";

// Hooks
import { useSoftwares } from "../../../../*/hooks/useSoftwares";

// Local Components
import { InfoCard, FieldRow } from "../../../../components/InfoGrid";

// Local Constants
import { workOrderTypes } from "../../../../*/constants/workorderTypes";
import { workOrderPriorityConfig } from "../../../../*/constants/workOrderPriorityConfig";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
const toInputDate = (iso) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";

export default function GeneralInfoCard({ details, onSave }) {
  const { data: softwares = [] } = useSoftwares();

  console.log("details", details);

  const typeColor =
    workOrderTypes.find((t) => t.name === details?.type)?.color ?? "#6b7280";
  console.log("type color", typeColor);

  const cfg = workOrderPriorityConfig?.[details?.priority];

  return (
    <InfoCard
      title="Work Order Info"
      collapsible
      defaultOpen
      editable
      onSave={onSave}
      editValues={details}
      span="half"
    >
      {/* Work order number — read only (system generated) */}
      <FieldRow
        label="WO #"
        value={details?.work_order_number}
        render={(value) => (
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {value ?? "—"}
          </Typography>
        )}
      />

      {/* Type */}
      <FieldRow
        label="Type"
        value={details?.type}
        render={(value) =>
          value ? (
            <Chip
              label={value}
              size="small"
              sx={{
                height: 22,
                fontSize: "0.72rem",
                backgroundColor: typeColor + "22",
                color: typeColor,
                border: `1px solid ${typeColor}55`,
              }}
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>—</Typography>
          )
        }
      />

      {/* Priority */}
      <FieldRow
        label="Priority"
        value={details?.priority}
        render={(value) =>
          cfg ? (
            <Chip
              label={cfg?.label}
              size="small"
              sx={{
                backgroundColor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}55`,
                fontWeight: 600,
                fontSize: "0.7rem",
                height: 22,
              }}
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>—</Typography>
          )
        }
      />

      {/* Date created — read only */}
      <FieldRow
        label="Created"
        value={details?.created_at}
        render={(value) => (
          <Typography sx={{ fontSize: "0.85rem" }}>{fmtDate(value)}</Typography>
        )}
      />

      {/* Start date — editable */}
      <FieldRow
        label="Start Date"
        fieldKey="start_date"
        value={details?.start_date}
        render={(value, editing, { onChange, fieldKey }) =>
          editing ? (
            <TextField
              size="small"
              type="date"
              value={toInputDate(value)}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>
              {fmtDate(value)}
            </Typography>
          )
        }
      />

      {/* Due date — editable */}
      <FieldRow
        label="Due Date"
        fieldKey="due_date"
        value={details?.due_date}
        render={(value, editing, { onChange, fieldKey }) =>
          editing ? (
            <TextField
              size="small"
              type="date"
              value={toInputDate(value)}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>
              {fmtDate(value)}
            </Typography>
          )
        }
      />

      {/* Software — editable dropdown */}
      <FieldRow
        label="Software"
        fieldKey="software_id"
        value={details?.software_id}
        render={(value, editing, { onChange, fieldKey }) =>
          editing ? (
            <TextField
              select
              size="small"
              value={value ?? ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {softwares.map((sw) => (
                <MenuItem key={sw.id} value={sw.id}>
                  {sw.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>
              {details?.software?.name || "—"}{" "}
              {/* display still uses the object */}
            </Typography>
          )
        }
      />

      {/* External ID — editable text field */}
      <FieldRow
        label="External ID"
        fieldKey="external_id"
        value={details?.external_id}
        render={(value, editing, { onChange, fieldKey }) =>
          editing ? (
            <TextField
              size="small"
              value={value ?? ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              placeholder="External reference"
              fullWidth
            />
          ) : (
            <Typography sx={{ fontSize: "0.85rem" }}>{value || "—"}</Typography>
          )
        }
      />
    </InfoCard>
  );
}
