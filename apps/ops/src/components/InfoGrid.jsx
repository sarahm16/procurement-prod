import { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  TextField,
  useTheme,
  alpha,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

// ─── FieldRow ─────────────────────────────────────────────────────────────────
/**
 * A single label/value row inside a InfoCard.
 *
 * Props:
 *   label     {string}
 *   value     {string|ReactNode}
 *   editing   {boolean}           — parent card edit mode
 *   fieldKey  {string}            — key to write back on change
 *   onChange  {fn}                — (key, value) => void
 *   fullWidth {boolean}           — spans both columns in a 2-col card
 *   type      {string}            — input type when editing (default "text")
 *   render    {fn}                — custom render: (value, editing) => ReactNode
 *   editable  {boolean}           — false = never shows an input (default true)
 */
export function FieldRow({
  label,
  value,
  editing = false,
  fieldKey,
  onChange,
  fullWidth = false,
  type = "text",
  render,
  editable = true,
}) {
  const theme = useTheme();
  const showInput = editing && editable && fieldKey;

  return (
    <Box
      sx={{
        display: "contents", // participates in parent CSS grid
        "& > *": {
          gridColumn: fullWidth ? "1 / -1" : undefined,
        },
      }}
    >
      {/* When fullWidth, wrap label+value together in one grid cell */}
      {fullWidth ? (
        <Box
          sx={{
            gridColumn: "1 / -1",
            py: 1.25,
            px: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            "&:last-child": { borderBottom: "none" },
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 600,
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.disabled",
            }}
          >
            {label}
          </Typography>
          {render ? (
            render(value, editing, { onChange, fieldKey })
          ) : showInput ? (
            <TextField
              size="small"
              fullWidth
              type={type}
              value={value ?? ""}
              onChange={(e) => onChange?.(fieldKey, e.target.value)}
              variant="outlined"
              sx={inputSx(theme)}
            />
          ) : (
            <Typography sx={valueSx}>{value || "—"}</Typography>
          )}
        </Box>
      ) : (
        // Two-column: label cell + value cell
        <>
          <Box sx={labelCellSx(theme)}>
            <Typography sx={labelSx}>{label}</Typography>
          </Box>
          <Box sx={valueCellSx(theme)}>
            {render ? (
              render(value, editing, { onChange, fieldKey })
            ) : showInput ? (
              <TextField
                size="small"
                fullWidth
                type={type}
                value={value ?? ""}
                onChange={(e) => onChange?.(fieldKey, e.target.value)}
                variant="outlined"
                sx={inputSx(theme)}
              />
            ) : (
              <Typography sx={valueSx}>{value || "—"}</Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelSx = {
  fontFamily: '"Barlow", sans-serif',
  fontWeight: 600,
  fontSize: "0.68rem",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "text.disabled",
  lineHeight: 1.3,
};

const valueSx = {
  fontFamily: '"Barlow", sans-serif',
  fontSize: "0.85rem",
  color: "text.primary",
  fontWeight: 400,
  lineHeight: 1.4,
  wordBreak: "break-word",
};

const labelCellSx = (theme) => ({
  py: 1.1,
  pr: 1.5,
  display: "flex",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.divider}`,
});

const valueCellSx = (theme) => ({
  py: 1.1,
  display: "flex",
  alignItems: "center",
  borderBottom: `1px solid ${theme.palette.divider}`,
});

const inputSx = (theme) => ({
  "& .MuiInputBase-root": {
    fontFamily: '"Barlow", sans-serif',
    fontSize: "0.85rem",
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: alpha(theme.palette.primary.main, 0.2),
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: alpha(theme.palette.primary.main, 0.4),
  },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "secondary.main",
  },
  "& .MuiInputBase-input": { py: 0.75 },
});

// ─── InfoCard ───────────────────────────────────────────────────────────────
/**
 * A collapsible card for the details tab.
 *
 * Props:
 *   title       {string}
 *   icon        {ReactNode}   — small icon shown in header
 *   children    {ReactNode}   — FieldRow components
 *   collapsible {boolean}     — default true
 *   defaultOpen {boolean}     — default true
 *   editable    {boolean}     — show edit button, default false
 *   onSave      {fn}          — (draft) => Promise<void> — called with draft values
 *   actions     {ReactNode}   — extra buttons in the card header
 *   span        {"half"|"full"} — grid column span (default "half")
 *   editValues  {object}      — current field values (used in edit mode)
 */
export function InfoCard({
  title,
  icon,
  children,
  collapsible = true,
  defaultOpen = true,
  editable = false,
  onSave,
  actions,
  editValues = {},
  span = "half",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const handleEditStart = () => {
    setDraft({ ...editValues });
    setEditing(true);
  };

  const handleEditCancel = () => {
    setEditing(false);
    setDraft({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(draft);
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  // Clone children to inject editing state and onChange
  const enhancedChildren = editing
    ? Array.isArray(children)
      ? children.map((child, i) =>
          child?.type === FieldRow
            ? {
                ...child,
                props: {
                  ...child.props,
                  editing: true,
                  value: child.props.fieldKey
                    ? (draft[child.props.fieldKey] ?? child.props.value)
                    : child.props.value,
                  onChange: handleFieldChange,
                },
              }
            : child,
        )
      : children
    : children;

  return (
    <Box
      sx={{
        gridColumn: span === "full" ? "1 / -1" : undefined,
        backgroundColor: "background.paper",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        // Subtle hover lift
        transition: "box-shadow 0.15s ease",
        "&:hover": {
          boxShadow: isDark
            ? `0 2px 12px ${alpha("#000", 0.3)}`
            : `0 2px 12px ${alpha("#000", 0.06)}`,
        },
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark
            ? alpha(theme.palette.primary.main, 0.06)
            : alpha(theme.palette.primary.main, 0.03),
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon && (
            <Box
              sx={{
                color: theme.palette.secondary.main,
                display: "flex",
                alignItems: "center",
                fontSize: 16,
              }}
            >
              {icon}
            </Box>
          )}
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {title}
          </Typography>
        </Box>

        {/* Header actions */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          onClick={(e) => e.stopPropagation()} // prevent collapse toggle
        >
          {actions}

          {editable && !editing && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={handleEditStart}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <EditOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}

          {editing && (
            <>
              <Tooltip title="Cancel">
                <IconButton
                  size="small"
                  onClick={handleEditCancel}
                  disabled={saving}
                  sx={{ color: "text.disabled" }}
                >
                  <CloseIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Save changes">
                <IconButton
                  size="small"
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ color: "success.main" }}
                >
                  <SaveOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}

          {collapsible && (
            <Box sx={{ color: "text.disabled", display: "flex", ml: 0.5 }}>
              {open ? (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Card body */}
      <Collapse in={open}>
        <Box
          sx={{
            px: 2,
            py: 0,
            // CSS grid for label/value columns
            display: "grid",
            gridTemplateColumns: "minmax(120px, 40%) 1fr",
            "& > *:last-child": {
              borderBottom: "none !important",
            },
          }}
        >
          {enhancedChildren}
        </Box>
      </Collapse>
    </Box>
  );
}

// ─── InfoGrid ──────────────────────────────────────────────────────────
/**
 * Two-column responsive grid for the details tab.
 * Cards with span="full" stretch across both columns.
 *
 * Usage:
 *   <InfoGrid>
 *     <InfoCard title="Vendor Info" icon={<PersonIcon />} editable onSave={handleSave}>
 *       <FieldRow label="Company" value={vendor.company} fieldKey="company" />
 *       <FieldRow label="Contact" value={vendor.contact_name} fieldKey="contact_name" />
 *     </InfoCard>
 *
 *     <InfoCard title="Status" icon={<CircleIcon />}>
 *       <FieldRow label="Status" value={vendor.VendorStatuses?.name} editable={false} />
 *     </InfoCard>
 *
 *     <InfoCard title="Address" span="full" icon={<PlaceIcon />} editable onSave={handleSave}>
 *       <FieldRow label="Street" value={vendor.mailing_address} fieldKey="mailing_address" fullWidth />
 *       <FieldRow label="City" value={vendor.mailing_city} fieldKey="mailing_city" />
 *       <FieldRow label="State" value={vendor.mailing_state} fieldKey="mailing_state" />
 *     </InfoCard>
 *   </InfoGrid>
 */
export default function InfoGrid({ children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
        gap: 2,
        alignItems: "start", // cards don't stretch to match each other's height
        pb: 4,
      }}
    >
      {children}
    </Box>
  );
}
