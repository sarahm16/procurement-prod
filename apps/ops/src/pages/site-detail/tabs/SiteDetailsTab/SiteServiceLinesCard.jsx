// site-details/tabs/SiteServiceLinesCard.jsx
import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EventIcon from "@mui/icons-material/Event";
import UndoIcon from "@mui/icons-material/Undo";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { getServiceLineConfig } from "../../../../*/constants/serviceLineConfig";
import { useSiteActions } from "../../SiteDetailProvider";

/**
 * Site service lines, one per row.
 *
 * Status is READ-ONLY: it comes from the contract's dates and this site's
 * dates on that contract (server: vw_ServiceLineStatus). The only thing you
 * do to a line here is take the site off that contract — or undo that.
 *
 * Props:
 *  - serviceLines: [{ contract_site_id, service_line, status, status_color,
 *                     status_key, is_current, starts_on, ends_on,
 *                     site_end_date }]
 *    status_key: active | upcoming | removed | contract_ended
 *    dates are "YYYY-MM-DD" strings
 */

/** "2026-10-31" → "Oct 31, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/** Today as "YYYY-MM-DD" in the user's own timezone. */
const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The short line under the service line name that explains the status. */
function dateNote(line) {
  switch (line.status_key) {
    case "upcoming":
      return { text: `Starts ${fmtDay(line.starts_on)}` };
    case "removed":
      return { text: `Removed — last day ${fmtDay(line.ends_on)}` };
    case "contract_ended":
      return { text: `Contract ended ${fmtDay(line.ends_on)}` };
    default:
      return line.ends_on
        ? {
            text: `Last day ${fmtDay(line.ends_on)}`,
            warn: true,
          }
        : { text: `Since ${fmtDay(line.starts_on)}` };
  }
}

export default function SiteServiceLinesCard({
  serviceLines = [],
  span = "full",
}) {
  const theme = useTheme();
  const { updateServiceLineDates } = useSiteActions();

  const [menu, setMenu] = useState({ anchor: null, line: null });
  const [dialog, setDialog] = useState(null); // { line, lastDay }
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);
  const [showPast, setShowPast] = useState(false);

  const current = useMemo(
    () => serviceLines.filter((l) => l.is_current),
    [serviceLines],
  );
  const past = useMemo(
    () => serviceLines.filter((l) => !l.is_current),
    [serviceLines],
  );

  const closeMenu = () => setMenu({ anchor: null, line: null });

  const save = async (line, dates) => {
    setSavingId(line.contract_site_id);
    setError(null);
    try {
      await updateServiceLineDates(line.contract_site_id, dates);
      setDialog(null);
    } catch (e) {
      console.error("Error updating service line dates:", e);
      setError(
        e?.response?.data?.error ??
          `Couldn't update ${line.service_line}. Try again.`,
      );
    } finally {
      setSavingId(null);
    }
  };

  /** What the ⋮ menu offers for this line. */
  const actionsFor = (line) => {
    if (line.status_key === "contract_ended") return [];
    if (line.status_key === "removed")
      return [
        {
          key: "restore",
          label: "Put back on contract",
          icon: <UndoIcon fontSize="small" />,
          run: () => save(line, { end_date: null }),
        },
      ];
    if (line.site_end_date)
      return [
        {
          key: "change",
          label: "Change last day…",
          icon: <EventIcon fontSize="small" />,
          run: () => setDialog({ line, lastDay: line.site_end_date }),
        },
        {
          key: "cancel",
          label: "Cancel removal",
          icon: <UndoIcon fontSize="small" />,
          run: () => save(line, { end_date: null }),
        },
      ];
    return [
      {
        key: "remove",
        label: "Remove from contract…",
        icon: <RemoveCircleOutlineIcon fontSize="small" />,
        danger: true,
        run: () => setDialog({ line, lastDay: todayYmd() }),
      },
    ];
  };

  const renderRow = (line, idx, muted = false) => {
    const cfg = getServiceLineConfig(line.service_line);
    const Icon = cfg.icon;
    const statusColor = line.status_color ?? theme.palette.text.disabled;
    const note = dateNote(line);
    const actions = actionsFor(line);
    const isSaving = savingId === line.contract_site_id;

    return (
      <Box
        key={line.contract_site_id ?? `${line.service_line}-${idx}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderTop: idx === 0 ? "none" : `1px solid ${theme.palette.divider}`,
          opacity: muted ? 0.75 : 1,
        }}
      >
        {/* Service line icon badge */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 1.5,
            flexShrink: 0,
            color: muted ? theme.palette.text.disabled : cfg.color,
            backgroundColor: alpha(
              muted ? theme.palette.text.disabled : cfg.color,
              0.12,
            ),
          }}
        >
          <Icon sx={{ fontSize: 19 }} />
        </Box>

        {/* Name + what the dates mean */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
            {line.service_line}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.74rem",
              color: note.warn ? "warning.dark" : "text.secondary",
              fontWeight: note.warn ? 600 : 400,
            }}
          >
            {note.text}
          </Typography>
        </Box>

        {/* Read-only status */}
        <Chip
          label={line.status}
          size="small"
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            fontSize: "0.72rem",
            height: 24,
            backgroundColor: alpha(statusColor, 0.12),
            color: statusColor,
            border: `1px solid ${alpha(statusColor, 0.3)}`,
          }}
        />

        {/* Actions */}
        <Box sx={{ width: 32, display: "flex", justifyContent: "center" }}>
          {isSaving ? (
            <CircularProgress size={18} />
          ) : actions.length ? (
            <IconButton
              size="small"
              aria-label={`Actions for ${line.service_line}`}
              onClick={(e) => setMenu({ anchor: e.currentTarget, line })}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          ) : (
            <Tooltip
              title="The whole contract has ended. Change it on the contract, not here."
              arrow
            >
              <Box sx={{ width: 32, height: 32 }} />
            </Tooltip>
          )}
        </Box>
      </Box>
    );
  };

  const dialogLine = dialog?.line;
  const lastDayInvalid =
    dialog &&
    (!dialog.lastDay ||
      (dialogLine?.starts_on && dialog.lastDay < dialogLine.starts_on));

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
        gridColumn: span === "full" ? "1 / -1" : "auto",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AccountTreeOutlinedIcon
          sx={{ fontSize: 17, color: "text.secondary" }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          Service Lines
        </Typography>
        {current.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              backgroundColor: alpha(theme.palette.text.primary, 0.06),
              px: 0.85,
              py: 0.1,
              borderRadius: 1,
            }}
          >
            {current.length}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ borderRadius: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* Current lines */}
      {current.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
            {past.length
              ? "This site isn't on any active contracts."
              : "This site isn't on any contracts yet."}
          </Typography>
        </Box>
      ) : (
        current.map((l, i) => renderRow(l, i))
      )}

      {/* Past lines, tucked away */}
      {past.length > 0 && (
        <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button
            fullWidth
            size="small"
            color="inherit"
            onClick={() => setShowPast((v) => !v)}
            endIcon={showPast ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{
              justifyContent: "space-between",
              px: 2,
              py: 1,
              fontSize: "0.75rem",
              color: "text.secondary",
              textTransform: "none",
              borderRadius: 0,
            }}
          >
            Past service lines ({past.length})
          </Button>
          <Collapse in={showPast}>
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
              {past.map((l, i) => renderRow(l, i, true))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* ⋮ menu */}
      <Menu anchorEl={menu.anchor} open={!!menu.anchor} onClose={closeMenu}>
        {menu.line &&
          actionsFor(menu.line).map((a) => (
            <MenuItem
              key={a.key}
              onClick={() => {
                closeMenu();
                a.run();
              }}
              sx={{
                fontSize: "0.82rem",
                color: a.danger ? "error.main" : "text.primary",
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 30 }}>
                {a.icon}
              </ListItemIcon>
              {a.label}
            </MenuItem>
          ))}
      </Menu>

      {/* Remove / change last day */}
      <Dialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogLine?.site_end_date
            ? `Change last day on ${dialogLine?.service_line}`
            : `Remove from ${dialogLine?.service_line} contract`}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
            The site stays on the contract through this day, then shows as
            Removed. The contract and its other sites aren't affected.
          </Typography>
          <TextField
            label="Last day of service"
            type="date"
            fullWidth
            size="small"
            value={dialog?.lastDay ?? ""}
            onChange={(e) =>
              setDialog((d) => ({ ...d, lastDay: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: dialogLine?.starts_on ?? undefined }}
            error={Boolean(lastDayInvalid && dialog?.lastDay)}
            helperText={
              lastDayInvalid && dialog?.lastDay
                ? `Can't be before ${fmtDay(dialogLine?.starts_on)}`
                : " "
            }
          />
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
            Vendors, rates and exhibits stay on record and come back if the site
            is put back on the contract.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setDialog(null)}
            disabled={Boolean(savingId)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={dialogLine?.site_end_date ? "primary" : "error"}
            disabled={Boolean(savingId) || Boolean(lastDayInvalid)}
            onClick={() => save(dialogLine, { end_date: dialog.lastDay })}
          >
            {savingId
              ? "Saving…"
              : dialogLine?.site_end_date
                ? "Save"
                : "Remove from contract"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
