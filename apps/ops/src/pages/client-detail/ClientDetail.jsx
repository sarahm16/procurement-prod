import { useState } from "react";
import { useParams } from "react-router-dom";

// MUI
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

// Layout
import DetailPageHeader from "../../components/DetailPageLayout/DetailPageHeader";
import DetailPageLayout from "../../components/DetailPageLayout/DetailPageLayout";

// Tabs
import ClientDocumentationTab from "./tabs/ClientDocumentationTab";
import ClientDetailsTab from "./tabs/ClientDetailsTab";
import ActivityLog from "../../components/DetailPageLayout/ActivityLog";
import ClientSitesTab from "./tabs/ClientSitesTab";

import {
  ClientDetailProvider,
  useClientActions,
  useClientActivity,
  useClientDetails,
  useClientNotes,
} from "./ClientDetailProvider";

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

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The short note next to the status chip. */
function statusHint(d) {
  switch (d?.status_key) {
    case "paused":
      return [d.paused_at && `Since ${fmtDay(d.paused_at)}`, d.paused_reason]
        .filter(Boolean)
        .join(" · ");
    case "active":
      return d.active_contracts
        ? plural(d.active_contracts, "active contract")
        : null;
    case "upcoming":
      return d.next_start_date
        ? `First contract starts ${fmtDay(d.next_start_date)}`
        : null;
    case "inactive":
      return d.last_end_date
        ? `Last contract ended ${fmtDay(d.last_end_date)}`
        : null;
    default:
      return null;
  }
}

function statusTooltip(d) {
  if (d?.status_key === "paused")
    return `Paused by hand${d.paused_by_name ? ` by ${d.paused_by_name}` : ""}. Going by its contracts alone, this client is ${String(d.contract_status_name ?? "—").toLowerCase()}. Unpause to go back to that.`;
  return "Worked out from this client's contracts: Active while at least one is current. Pause the client to override it.";
}

const formatAddress = (d) =>
  [
    d?.mailing_address,
    d?.mailing_city,
    [d?.mailing_state, d?.mailing_zipcode]
      .map((p) => (typeof p === "string" ? p.trim() : p))
      .filter(Boolean)
      .join(" "),
  ]
    .map((p) => (typeof p === "string" ? p.trim() : p))
    .filter(Boolean)
    .join(", ") || undefined;

function ClientDetail() {
  const { id } = useParams();
  return (
    <ClientDetailProvider id={id}>
      <ClientDetailLayout />
    </ClientDetailProvider>
  );
}

/** Pause (with a reason) or unpause — the one status set by hand. */
function PauseButton() {
  const details = useClientDetails();
  const { pauseClient, unpauseClient } = useClientActions();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!details?.status_key) return null;
  const paused = details.status_key === "paused";

  const submit = async (fn) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      setOpen(false);
    } catch (e) {
      console.error("Error changing pause:", e);
      setError(e?.response?.data?.error ?? "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color={paused ? "primary" : "warning"}
        startIcon={
          paused ? <PlayCircleOutlineIcon /> : <PauseCircleOutlineIcon />
        }
        onClick={() => {
          setError(null);
          setReason("");
          setOpen(true);
        }}
      >
        {paused ? "Unpause" : "Pause"}
      </Button>

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {paused ? `Unpause ${details.client}?` : `Pause ${details.client}`}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}
          {paused ? (
            <Typography sx={{ fontSize: "0.85rem" }}>
              Its status goes back to what its contracts say:{" "}
              <strong>{details.contract_status_name}</strong>.
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
                Shows the client as Paused until someone unpauses it. Contracts
                and sites aren't changed.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Reason"
                placeholder="e.g. Billing dispute"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                inputProps={{ maxLength: 200 }}
                helperText={`${reason.length}/200`}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={paused ? "primary" : "warning"}
            disabled={saving || (!paused && !reason.trim())}
            onClick={() =>
              submit(paused ? unpauseClient : () => pauseClient(reason.trim()))
            }
          >
            {saving ? "Saving…" : paused ? "Unpause" : "Pause client"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ClientDetailLayout() {
  const details = useClientDetails();
  const notes = useClientNotes();
  const activity = useClientActivity();
  const { addNote } = useClientActions();

  return (
    <DetailPageLayout
      header={
        <DetailPageHeader
          title={`Client ${details?.client ?? ""}`}
          subtitle={`Details for ${details?.client ?? ""}`}
          // Read-only: no statusOptions / onStatusChange. The status comes
          // from the client's contracts; Pause is the only manual override.
          status={details?.status}
          statusHint={statusHint(details)}
          statusTooltip={statusTooltip(details)}
          actions={<PauseButton />}
          breadcrumbs={[
            { label: "Clients", href: "/clients" },
            { label: details?.client },
          ]}
          address={formatAddress(details)}
        />
      }
      notes={notes}
      onAddNote={addNote}
      tabs={[
        { label: "Details", content: <ClientDetailsTab /> },
        { label: "Documentation", content: <ClientDocumentationTab /> },
        { label: "Sites", content: <ClientSitesTab /> },
        {
          label: "Activity",
          content: (
            <ActivityLog
              entries={activity}
              fieldLabels={{ paused: "Status", service_line: "Service lines" }}
            />
          ),
        },
      ]}
    />
  );
}

export default ClientDetail;
