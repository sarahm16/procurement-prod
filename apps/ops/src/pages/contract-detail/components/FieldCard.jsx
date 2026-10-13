// contract-detail/components/FieldCard.jsx
//
// One InfoCard built from a list of field specs, so the Details tab can
// describe ~50 handoff fields as data instead of 50 hand-written FieldRows.
//
//   <FieldCard title="Money and billing" contract={c} kind={c.handoff_kind}
//              onSave={save} fields={[
//     { key: "value", label: "Gross contract value", type: "money", required: true },
//     { key: "deposit_percent", label: "Deposit", type: "percent", projectOnly: true,
//       hint: (c) => fmtMoney(c.deposit_amount) },
//     { label: "Subcontractor ceiling", type: "computed", display: (c) => fmtMoney(c.sub_ceiling) },
//   ]} />
//
// Field types: text · longtext · date · money · percent · int · bool ·
// select (options: [{ id, name }]) · computed (read-only, display(c)).
// showIf(contract) hides a field when it returns false (e.g. deposit % only
// when the contract bills a deposit). projectOnly fields hide unless the
// contract is a project (or its kind is
// unknown). onSave gets only this card's editable fields.
import { isValidElement } from "react";
import { Box, MenuItem, Switch, TextField, Typography } from "@mui/material";

import { FieldRow, InfoCard } from "../../../components/InfoGrid";
import { fmtDay, fmtMoney, fmtNumber } from "../format";

const text = (v, sx) =>
  isValidElement(v) ? (
    <Box sx={{ display: "flex", alignItems: "center", minHeight: 22 }}>{v}</Box>
  ) : (
    <Typography sx={{ fontSize: "0.85rem", whiteSpace: "pre-wrap", ...sx }}>
      {v === null || v === undefined || v === "" ? "—" : v}
    </Typography>
  );

const hintLine = (h, tone) =>
  h ? (
    <Typography
      sx={{
        fontSize: "0.72rem",
        mt: 0.25,
        color:
          tone === "warn"
            ? "warning.dark"
            : tone === "bad"
              ? "error.main"
              : "text.secondary",
        fontWeight: tone ? 600 : 400,
      }}
    >
      {h}
    </Typography>
  ) : null;

/** How a saved value reads on the page. */
function viewValue(f, value, contract) {
  switch (f.type) {
    case "date":
      return fmtDay(value);
    case "money":
      return fmtMoney(value);
    case "percent":
      return value == null || value === "" ? null : `${fmtNumber(value)}%`;
    case "int":
      return value == null || value === ""
        ? null
        : `${value}${f.unit ? ` ${f.unit}` : ""}`;
    case "bool":
      return value ? "Yes" : "No";
    case "select":
      return f.options?.find((o) => o.id === value)?.name ?? null;
    case "computed":
      return f.display?.(contract);
    default:
      return value;
  }
}

/** The input for a field while the card is being edited. */
function editInput(f, value, onChange) {
  const set = (v) => onChange(f.key, v);
  const common = { size: "small", fullWidth: true };
  switch (f.type) {
    case "longtext":
      return (
        <TextField
          {...common}
          multiline
          minRows={f.rows ?? 3}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          inputProps={{ maxLength: f.max }}
          placeholder={f.placeholder}
        />
      );
    case "date":
      return (
        <TextField
          {...common}
          type="date"
          value={value ?? ""}
          onChange={(e) => set(e.target.value || null)}
          InputLabelProps={{ shrink: true }}
        />
      );
    case "money":
    case "percent":
    case "int":
      return (
        <TextField
          {...common}
          type="number"
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          inputProps={{
            min: f.min ?? 0,
            max: f.type === "percent" ? 100 : undefined,
            step: f.type === "int" ? 1 : "any",
          }}
          InputProps={{
            startAdornment:
              f.type === "money" ? (
                <Typography sx={{ mr: 0.5, color: "text.secondary" }}>
                  $
                </Typography>
              ) : undefined,
            endAdornment:
              f.type === "percent" || f.unit ? (
                <Typography
                  sx={{
                    ml: 0.5,
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.type === "percent" ? "%" : f.unit}
                </Typography>
              ) : undefined,
          }}
        />
      );
    case "bool":
      return (
        <Switch
          checked={Boolean(value)}
          onChange={(e) => set(e.target.checked)}
        />
      );
    case "select":
      return (
        <TextField
          {...common}
          select
          value={value ?? ""}
          onChange={(e) => set(e.target.value === "" ? null : e.target.value)}
        >
          {!f.required && (
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
          )}
          {(f.options ?? []).map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>
      );
    default:
      return (
        <TextField
          {...common}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          inputProps={{ maxLength: f.max }}
          placeholder={f.placeholder}
        />
      );
  }
}

export default function FieldCard({
  title,
  fields,
  contract,
  kind,
  onSave,
  editable = true,
  children,
}) {
  const visible = fields.filter(
    (f) =>
      (!f.projectOnly || kind === "project" || kind == null) &&
      (!f.showIf || f.showIf(contract)),
  );
  const editableKeys = visible
    .filter((f) => f.key && f.type !== "computed" && !f.readOnly)
    .map((f) => f.key);

  const save = (draft) =>
    onSave(
      Object.fromEntries(editableKeys.map((k) => [k, draft?.[k] ?? null])),
    );

  return (
    <InfoCard
      title={title}
      icon={null}
      collapsible
      defaultOpen
      editable={editable && editableKeys.length > 0}
      editValues={contract}
      onSave={save}
      span="full"
    >
      {visible.map((f, i) => (
        <FieldRow
          key={f.key ?? `${f.label}-${i}`}
          label={f.label}
          value={f.key ? contract[f.key] : null}
          fieldKey={f.key ?? `computed_${i}`}
          fullWidth={f.type === "longtext"}
          render={(value, editing, helpers) => {
            const hint = f.hint?.(contract);
            const tone = f.tone?.(contract);
            if (editing && f.key && f.type !== "computed" && !f.readOnly)
              return (
                <Box>
                  {editInput(f, value, helpers.onChange)}
                  {f.editHint && hintLine(f.editHint(contract))}
                </Box>
              );
            return (
              <Box>
                {text(
                  viewValue(f, f.key ? value : null, contract),
                  tone === "bad"
                    ? { color: "error.main", fontWeight: 600 }
                    : undefined,
                )}
                {hintLine(hint, tone)}
              </Box>
            );
          }}
        />
      ))}
      {children}
    </InfoCard>
  );
}
