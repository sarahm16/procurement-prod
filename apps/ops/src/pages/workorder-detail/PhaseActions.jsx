// workorder-detail/PhaseActions.jsx
//
// The header button that moves a work order between ops and finance.
//
//   Ops, Completed           "Send to Finance" → confirm dialog
//   Ops, parent with open    "Send to Finance" disabled; the tooltip says
//     children                which children are still open
//   Finance                  "Send back to Ops" → dialog that needs a reason
//   Child                    nothing to click; a child moves with its parent
//
// The server re-checks everything, so a stale page can't push through a move
// that's no longer allowed. Its message is shown in the dialog.
import axios from "axios";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoNotDisturbOnOutlinedIcon from "@mui/icons-material/DoNotDisturbOnOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import {
  useLinkedWorkOrders,
  useWorkOrderActions,
  useWorkOrderDetails,
  useWorkOrderServices,
} from "./WorkOrderDetailProvider";
import {
  FINANCE_START,
  OPS_DONE,
  fmtMoney,
  jobTotals,
  marginColor,
  openChildren,
} from "./finance";

const REASON_MAX = 500;

/** "Completed → Fin Open" with each side in its own colour. */
function StatusChange({ from, to }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
      <Chip size="small" label={from} variant="outlined" />
      <ArrowForwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
      <Chip size="small" label={to} color="primary" />
    </Box>
  );
}

function MoneyRow({ label, value, color, bold }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
      <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.85rem",
          fontWeight: bold ? 700 : 600,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/* ── Send to finance ──────────────────────────────────────────────────── */

function SendToFinanceDialog({ open, onClose, onDone }) {
  const details = useWorkOrderDetails();
  const linked = useLinkedWorkOrders();
  const services = useWorkOrderServices();
  const { user } = useAuthenticatedUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const totals = jobTotals({ services, linked });
  const children = linked.isParent ? linked.family : [];

  // Not blockers — finance can fix these — but worth a second look first.
  const warnings = [
    totals.client == null &&
      "There's no client price on this job, so accounting can't invoice it yet.",
    totals.vendor == null &&
      (linked.isParent
        ? "None of the child work orders have a vendor price."
        : "There's no vendor price, so accounting can't create the bill yet."),
  ].filter(Boolean);

  const send = async () => {
    setSaving(true);
    setError(null);
    try {
      await axios.post(`/api/workorders/${linked.workOrderId}/phase`, {
        phase: "finance",
        user_id: user?.id,
      });
      onDone();
    } catch (e) {
      setError(e.response?.data?.error ?? "Couldn't send it to finance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Send {details.work_order_number} to finance?
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography sx={{ fontSize: "0.88rem" }}>
          Accounting takes it from here: invoicing the client and paying the
          vendor{children.length > 1 ? "s" : ""}. Ops can't change it after this
          unless accounting sends it back.
        </Typography>

        <Box>
          <StatusChange from={OPS_DONE} to={FINANCE_START} />
        </Box>

        <Box
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            px: 1.75,
            py: 1,
          }}
        >
          <MoneyRow label="Client price" value={fmtMoney(totals.client)} />
          <MoneyRow
            label={linked.isParent ? "Vendor cost (all children)" : "Vendor cost"}
            value={fmtMoney(totals.vendor)}
          />
          <MoneyRow
            label="Margin"
            bold
            value={totals.margin == null ? "—" : `${totals.margin.toFixed(1)}%`}
            color={marginColor(totals.margin)}
          />
        </Box>

        {children.length > 0 && (
          <Box>
            <Typography
              sx={{ fontSize: "0.8rem", fontWeight: 600, mb: 0.75 }}
            >
              These {children.length} work order
              {children.length === 1 ? "" : "s"} go with it
            </Typography>
            {children.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.35,
                  fontSize: "0.82rem",
                }}
              >
                {c.status === "Cancelled" ? (
                  <DoNotDisturbOnOutlinedIcon
                    sx={{ fontSize: 16, color: "text.disabled" }}
                  />
                ) : (
                  <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
                )}
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {c.work_order_number}
                </Box>
                <Box
                  component="span"
                  sx={{
                    color: "text.secondary",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.vendor ?? "No vendor"}
                </Box>
                <Box
                  component="span"
                  sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                >
                  {fmtMoney(c.vendor_total)}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {warnings.map((w) => (
          <Alert key={w} severity="warning" sx={{ py: 0 }}>
            {w}
          </Alert>
        ))}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={send}
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <AccountBalanceOutlinedIcon />
            )
          }
        >
          {saving ? "Sending…" : "Send to Finance"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Back to ops ──────────────────────────────────────────────────────── */

function SendBackToOpsDialog({ open, onClose, onDone }) {
  const details = useWorkOrderDetails();
  const linked = useLinkedWorkOrders();
  const { user } = useAuthenticatedUser();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const trimmed = reason.trim();
  const children = linked.isParent ? linked.family.length : 0;

  const send = async () => {
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await axios.post(`/api/workorders/${linked.workOrderId}/phase`, {
        phase: "ops",
        reason: trimmed,
        user_id: user?.id,
      });
      setReason("");
      onDone();
    } catch (e) {
      setError(e.response?.data?.error ?? "Couldn't send it back to ops.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Send {details.work_order_number} back to ops?
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography sx={{ fontSize: "0.88rem" }}>
          It goes back on ops' list
          {children
            ? `, along with its ${children} child work order${children === 1 ? "" : "s"}`
            : ""}
          , as Reopened. The reason is saved in the activity log so ops knows
          what to fix.
        </Typography>
        <Box>
          <StatusChange from={details.status ?? "Finance"} to="Reopened" />
        </Box>
        <TextField
          autoFocus
          label="Why is it going back?"
          placeholder="e.g. Client disputed the invoice; vendor needs to return to finish the punch list"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
          multiline
          minRows={3}
          fullWidth
          required
          helperText={`${reason.length}/${REASON_MAX}`}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={send}
          disabled={saving || !trimmed}
          startIcon={
            saving ? <CircularProgress size={14} color="inherit" /> : <UndoIcon />
          }
        >
          {saving ? "Sending…" : "Send back to Ops"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── The header actions ───────────────────────────────────────────────── */

export default function PhaseActions() {
  const details = useWorkOrderDetails();
  const linked = useLinkedWorkOrders();
  const { refresh } = useWorkOrderActions();
  const [dialog, setDialog] = useState(null); // "finance" | "ops" | null

  if (linked.loading || !details.work_order_number) return null;

  const phase = details.phase ?? "ops";
  const close = () => setDialog(null);
  const done = () => {
    setDialog(null);
    refresh();
  };

  // A child moves with its parent: say so instead of offering a button.
  if (linked.isChild) {
    return phase === "finance" ? (
      <Chip
        size="small"
        icon={<AccountBalanceOutlinedIcon />}
        label={`In finance with ${linked.parent?.work_order_number ?? "its parent"}`}
        color="primary"
        variant="outlined"
      />
    ) : null;
  }

  if (phase === "finance") {
    return (
      <>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          startIcon={<UndoIcon />}
          onClick={() => setDialog("ops")}
        >
          Send back to Ops
        </Button>
        <SendBackToOpsDialog open={dialog === "ops"} onClose={close} onDone={done} />
      </>
    );
  }

  // Ops: only offered once the work order itself is completed.
  if (details.status !== OPS_DONE) return null;

  const stillOpen = linked.isParent ? openChildren(linked.family) : [];
  const blocked = stillOpen.length > 0;

  return (
    <>
      <Tooltip
        arrow
        title={
          blocked
            ? `Still open: ${stillOpen
                .map((c) => `${c.work_order_number} (${c.status ?? "no status"})`)
                .join(", ")}. Every child has to be completed or cancelled first.`
            : ""
        }
      >
        <span>
          <Button
            size="small"
            variant="contained"
            startIcon={<AccountBalanceOutlinedIcon />}
            onClick={() => setDialog("finance")}
            disabled={blocked}
          >
            Send to Finance
          </Button>
        </span>
      </Tooltip>
      <SendToFinanceDialog
        open={dialog === "finance"}
        onClose={close}
        onDone={done}
      />
    </>
  );
}
