// client-detail/tabs/ClientServiceLinesCard.jsx
//
// The client's service lines, one per row — same look as the site's
// Service Lines card.
//
// Status is READ-ONLY: it comes from the client's contracts on that line
// (server: loadClientServiceLines in routes/clients.js). What you can do here
// is set the client up for a new line, or take one off that has no active or
// upcoming contracts.
//
// Each line: { id, name, on_client, status_key, status, status_color,
//              active_contracts, upcoming_contracts, ended_contracts,
//              active_sites, upcoming_sites, next_start_date, ends_on,
//              last_end_date, is_current }
//   status_key: active | upcoming | none | ended
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

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
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { getServiceLineConfig } from "../../../*/constants/serviceLineConfig";
import {
  useClientActions,
  useClientDetails,
  useClientServiceLines,
} from "../ClientDetailProvider";

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

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The short line under the name that explains the status. */
function dateNote(line) {
  switch (line.status_key) {
    case "active": {
      const parts = [
        plural(line.active_contracts, "contract"),
        plural(line.active_sites, "site"),
      ];
      if (line.ends_on) parts.push(`through ${fmtDay(line.ends_on)}`);
      if (line.upcoming_contracts)
        parts.push(`${line.upcoming_contracts} more upcoming`);
      return parts.join(" · ");
    }
    case "upcoming":
      return [
        `Starts ${fmtDay(line.next_start_date)}`,
        line.upcoming_sites ? plural(line.upcoming_sites, "site") : null,
      ]
        .filter(Boolean)
        .join(" · ");
    case "ended":
      return line.last_end_date
        ? `Last contract ended ${fmtDay(line.last_end_date)}`
        : "Contracts ended";
    default:
      return "Not on a contract yet";
  }
}

/** Why a line can't be taken off the client, or null if it can. */
function removeBlocker(line) {
  const n = (line.active_contracts ?? 0) + (line.upcoming_contracts ?? 0);
  return n
    ? `Has ${plural(n, "active or upcoming contract")} — end ${n === 1 ? "it" : "them"} first`
    : null;
}

export default function ClientServiceLinesCard() {
  const theme = useTheme();
  const details = useClientDetails();
  const serviceLines = useClientServiceLines() ?? [];
  const { addServiceLine, removeServiceLine } = useClientActions();

  const [allLines, setAllLines] = useState([]);
  const [addAnchor, setAddAnchor] = useState(null);
  const [menu, setMenu] = useState({ anchor: null, line: null });
  const [confirm, setConfirm] = useState(null); // line to remove
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    axios
      .get("/api/serviceLines")
      .then(({ data }) => setAllLines(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Error fetching service lines:", e));
  }, []);

  const current = useMemo(
    () => serviceLines.filter((l) => l.status_key !== "ended"),
    [serviceLines],
  );
  const past = useMemo(
    () => serviceLines.filter((l) => l.status_key === "ended"),
    [serviceLines],
  );

  // Lines the client isn't set up for yet.
  const addable = useMemo(() => {
    const onClient = new Set(
      serviceLines.filter((l) => l.on_client).map((l) => l.id),
    );
    return allLines
      .filter((l) => !onClient.has(l.id))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [allLines, serviceLines]);

  const run = async (lineId, fn, fallback) => {
    setBusyId(lineId);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      console.error(fallback, e);
      setError(e?.response?.data?.error ?? fallback);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = (line) => {
    setAddAnchor(null);
    run(
      line.id,
      () => addServiceLine(line.id),
      `Couldn't add ${line.name}. Try again.`,
    );
  };

  const handleRemove = async () => {
    const line = confirm;
    const ok = await run(
      line.id,
      () => removeServiceLine(line.id),
      `Couldn't remove ${line.name}. Try again.`,
    );
    if (ok) setConfirm(null);
  };

  const renderRow = (line, idx, muted = false) => {
    const cfg = getServiceLineConfig(line.name);
    const Icon = cfg.icon;
    const tint = muted ? theme.palette.text.disabled : cfg.color;
    const statusColor = line.status_color ?? theme.palette.text.disabled;
    const isBusy = busyId === line.id;

    return (
      <Box
        key={line.id ?? `${line.name}-${idx}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
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
            color: tint,
            backgroundColor: alpha(tint, 0.12),
          }}
        >
          <Icon sx={{ fontSize: 19 }} />
        </Box>

        {/* Name + what the status means */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
            {line.name}
          </Typography>
          <Typography
            sx={{ fontSize: "0.74rem", color: "text.secondary" }}
            noWrap
          >
            {dateNote(line)}
          </Typography>
        </Box>

        {/* Read-only status */}
        <Chip
          label={line.status}
          size="small"
          variant={line.status_key === "none" ? "outlined" : "filled"}
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            fontSize: "0.72rem",
            height: 24,
            backgroundColor:
              line.status_key === "none"
                ? "transparent"
                : alpha(statusColor, 0.12),
            color: statusColor,
            border: `1px ${line.status_key === "none" ? "dashed" : "solid"} ${alpha(statusColor, 0.4)}`,
          }}
        />

        {/* Actions — only for lines the client is set up for */}
        <Box sx={{ width: 32, display: "flex", justifyContent: "center" }}>
          {isBusy ? (
            <CircularProgress size={18} />
          ) : line.on_client ? (
            <IconButton
              size="small"
              aria-label={`Actions for ${line.name}`}
              onClick={(e) => setMenu({ anchor: e.currentTarget, line })}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>
      </Box>
    );
  };

  const menuBlocker = menu.line ? removeBlocker(menu.line) : null;

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Header — matches the other cards on the page */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.02),
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: "0.85rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.primary",
          }}
        >
          Service Lines
        </Typography>
        {current.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.72rem",
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
        <Box sx={{ flex: 1 }} />
        <Tooltip
          title={addable.length ? "Add a service line" : "All lines added"}
        >
          <span>
            <IconButton
              size="small"
              aria-label="Add a service line"
              disabled={!addable.length}
              onClick={(e) => setAddAnchor(e.currentTarget)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
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
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
            {past.length
              ? `${details?.client ?? "This client"} has no active service lines.`
              : "No service lines yet. Add one with +."}
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
              px: 2.5,
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

      {/* + menu */}
      <Menu
        anchorEl={addAnchor}
        open={Boolean(addAnchor)}
        onClose={() => setAddAnchor(null)}
      >
        {addable.map((l) => {
          const { color, icon: Icon } = getServiceLineConfig(l.name);
          return (
            <MenuItem
              key={l.id}
              onClick={() => handleAdd(l)}
              sx={{ fontSize: "0.85rem" }}
            >
              <ListItemIcon sx={{ minWidth: 30, color }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {l.name}
            </MenuItem>
          );
        })}
      </Menu>

      {/* ⋮ menu */}
      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => setMenu({ anchor: null, line: null })}
      >
        <MenuItem
          disabled={Boolean(menuBlocker)}
          onClick={() => {
            setError(null);
            setConfirm(menu.line);
            setMenu({ anchor: null, line: null });
          }}
          sx={{ color: "error.main", alignItems: "flex-start" }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 30, mt: 0.25 }}>
            <RemoveCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Remove from client"
            secondary={menuBlocker}
            primaryTypographyProps={{ fontSize: "0.82rem" }}
            secondaryTypographyProps={{ fontSize: "0.72rem" }}
          />
        </MenuItem>
      </Menu>

      {/* Confirm remove */}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => !busyId && setConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Remove {confirm?.name}?
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ fontSize: "0.85rem" }}>
            {details?.client ?? "This client"} won't be set up for{" "}
            {confirm?.name} any more.
            {confirm?.ended_contracts
              ? " Its ended contracts stay on record under past service lines."
              : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setConfirm(null)}
            disabled={Boolean(busyId)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemove}
            disabled={Boolean(busyId)}
          >
            {busyId ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
