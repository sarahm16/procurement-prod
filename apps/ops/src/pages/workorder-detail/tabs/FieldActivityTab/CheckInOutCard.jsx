// workorder-details/tabs/FieldActivityTab/CheckInOutCard.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import {
  useWorkOrderDetails,
  useWorkOrderActions,
} from "../../WorkOrderDetailProvider";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

// convert an ISO string to the value a datetime-local input wants
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

// One side of the check-in/out (arrival OR completion)
function CheckPoint({
  icon,
  label,
  time,
  notes,
  accent,
  editing,
  draft,
  onDraftChange,
}) {
  const theme = useTheme();
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 1,
            color: accent,
            backgroundColor: alpha(accent, 0.12),
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
      </Box>

      {editing ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <TextField
            type="datetime-local"
            size="small"
            value={draft.time}
            onChange={(e) => onDraftChange({ ...draft, time: e.target.value })}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            size="small"
            multiline
            minRows={2}
            placeholder="Notes"
            value={draft.notes}
            onChange={(e) => onDraftChange({ ...draft, notes: e.target.value })}
            fullWidth
          />
        </Box>
      ) : (
        <Box>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 600, mb: 0.25 }}>
            {fmtDateTime(time) ?? (
              <Box
                component="span"
                sx={{
                  color: "text.disabled",
                  fontWeight: 400,
                  fontStyle: "italic",
                }}
              >
                Not recorded
              </Box>
            )}
          </Typography>
          {notes && (
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: "text.secondary",
                whiteSpace: "pre-wrap",
              }}
            >
              {notes}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function CheckInOutCard() {
  const theme = useTheme();
  const { id } = useParams();
  const details = useWorkOrderDetails();
  const { checkInOut } = useWorkOrderActions(); // provider action (see note)

  const vendorId = details?.vendor?.id ?? details?.vendor_id;

  // the update record for the current vendor
  const update =
    (details?.vendor_updates ?? []).find((u) => u.vendor_id === vendorId) ??
    null;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inDraft, setInDraft] = useState({ time: "", notes: "" });
  const [outDraft, setOutDraft] = useState({ time: "", notes: "" });

  const startEdit = () => {
    setInDraft({
      time: toLocalInput(update?.check_in),
      notes: update?.check_in_notes ?? "",
    });
    setOutDraft({
      time: toLocalInput(update?.check_out),
      notes: update?.check_out_notes ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await checkInOut?.({
        vendor_id: vendorId,
        check_in: inDraft.time ? new Date(inDraft.time).toISOString() : null,
        check_in_notes: inDraft.notes || null,
        check_out: outDraft.time ? new Date(outDraft.time).toISOString() : null,
        check_out_notes: outDraft.notes || null,
      });
      setEditing(false);
    } catch (e) {
      console.error("Error saving check-in/out:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
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
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          Check-In / Check-Out
        </Typography>
        {!vendorId ? null : editing ? (
          <Box>
            <IconButton
              size="small"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={save}
              disabled={saving}
              sx={{ color: "success.main" }}
            >
              {saving ? (
                <CircularProgress size={15} />
              ) : (
                <CheckIcon sx={{ fontSize: 17 }} />
              )}
            </IconButton>
          </Box>
        ) : (
          <IconButton size="small" onClick={startEdit}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        {!vendorId ? (
          <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>
            Assign a vendor to track check-in and check-out.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 3 }}>
            <CheckPoint
              icon={<LoginIcon sx={{ fontSize: 17 }} />}
              label="Checked In"
              time={update?.check_in}
              notes={update?.check_in_notes}
              accent={theme.palette.success.main}
              editing={editing}
              draft={inDraft}
              onDraftChange={setInDraft}
            />
            <Box
              sx={{ width: "1px", backgroundColor: theme.palette.divider }}
            />
            <CheckPoint
              icon={<LogoutIcon sx={{ fontSize: 17 }} />}
              label="Checked Out"
              time={update?.check_out}
              notes={update?.check_out_notes}
              accent={theme.palette.primary.main}
              editing={editing}
              draft={outDraft}
              onDraftChange={setOutDraft}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
