import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockIcon from "@mui/icons-material/Block";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import {
  useMobilizationFees,
  useWorkOrderActions,
  useWorkOrderDetails,
  useLinkedWorkOrders,
} from "../../WorkOrderDetailProvider";

const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Date-only formatting — see utils/dates.js for why this doesn't use new Date(iso). */
const fmtDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y) return null;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const STATUS_COLOR = {
  Draft: "default",
  Sent: "warning",
  Viewed: "warning",
  "Completed - Pending Payment": "info",
  Paid: "success",
  Declined: "error",
  Voided: "error",
};

function StatusChip({ status }) {
  if (!status) return null;
  return (
    <Chip
      label={status}
      size="small"
      color={STATUS_COLOR[status] ?? "default"}
      variant={status === "Paid" ? "filled" : "outlined"}
      sx={{ height: 20, fontSize: "0.62rem" }}
    />
  );
}

/** Sent Sep 12 · Signed Sep 14 · Paid Sep 16 — only the steps that happened. */
function Timeline({ fee }) {
  const steps = [
    ["Sent", fee.date_sent],
    ["Viewed", fee.date_viewed],
    ["Signed", fee.date_completed],
    ["Paid", fee.date_paid],
    ["Declined", fee.date_declined],
    ["Voided", fee.date_voided],
  ].filter(([, value]) => value);

  if (!steps.length) return null;

  return (
    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
      {steps.map(([label, value]) => `${label} ${fmtDate(value)}`).join(" · ")}
    </Typography>
  );
}

export default function MobilizationFeeCard({ defaultOpen = true }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const details = useWorkOrderDetails();
  const { isParent } = useLinkedWorkOrders();
  const { current, history, vendorTotal, balanceDue, loading } =
    useMobilizationFees();
  const {
    createMobilizationFee,
    updateMobilizationFee,
    sendMobilizationFee,
    markMobilizationFeePaid,
    voidMobilizationFee,
  } = useWorkOrderActions();

  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [qbId, setQbId] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // A parent work order has no vendor, so it can't pre-pay one. The create
  // endpoint refuses it too — this just stops the card from being misleading.
  if (isParent || loading) return null;

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      console.error("Mobilization fee action failed:", e);
      setError(
        e.response?.data?.error ?? "That didn't work. Try again in a moment.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    setAmount(current ? String(current.amount ?? "") : "");
    setNotes(current?.notes ?? "");
    setEditing(true);
    setError(null);
  };

  const saveAmount = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const ok = await run(() =>
      current
        ? updateMobilizationFee(current.id, { amount: value, notes })
        : createMobilizationFee({ amount: value, notes }),
    );
    if (ok) setEditing(false);
  };

  const confirmPaid = async () => {
    const ok = await run(() =>
      markMobilizationFeePaid(current.id, qbId.trim() || null),
    );
    if (ok) {
      setPaying(false);
      setQbId("");
    }
  };

  const confirmVoid = async () => {
    const ok = await run(() =>
      voidMobilizationFee(current.id, reason.trim() || null),
    );
    if (ok) {
      setVoiding(false);
      setReason("");
    }
  };

  return (
    <>
      <Box
        sx={{
          backgroundColor: "background.paper",
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          onClick={() => setOpen((o) => !o)}
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
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <PaymentsOutlinedIcon
              sx={{ fontSize: 16, color: "secondary.main" }}
            />
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
              Mobilization Fee
            </Typography>
            {current && <StatusChip status={current.status} />}
          </Stack>

          <Box sx={{ color: "text.disabled", display: "flex" }}>
            {open ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </Box>
        </Box>

        <Collapse in={open}>
          <Box sx={{ px: 2, py: 1.75 }}>
            {error && (
              <Alert
                severity="error"
                sx={{ mb: 1.5 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            {!details?.vendor_id && !current && (
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                Assign a vendor before adding a mobilization fee.
              </Typography>
            )}

            {/* Empty state */}
            {details?.vendor_id && !current && !editing && (
              <Stack spacing={1.25} alignItems="flex-start">
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: "text.secondary",
                    maxWidth: "62ch",
                  }}
                >
                  Money paid to {details.vendor?.company ?? "the vendor"} before
                  work starts — materials, permits, mobilizing a crew. It's
                  contracted through PandaDoc and deducted from what we owe at
                  close-out.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  onClick={startEdit}
                >
                  Add mobilization fee
                </Button>
              </Stack>
            )}

            {/* Amount entry — create or edit a draft */}
            {editing && (
              <Stack spacing={1.5}>
                <TextField
                  size="small"
                  type="number"
                  label="Amount"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">$</InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 220 }}
                />
                <TextField
                  size="small"
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What the fee covers"
                  fullWidth
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy}
                    onClick={saveAmount}
                  >
                    {current ? "Save" : "Add fee"}
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={busy}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* The fee itself */}
            {current && !editing && (
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="baseline"
                  useFlexGap
                  flexWrap="wrap"
                >
                  <Typography
                    sx={{
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      lineHeight: 1.1,
                    }}
                  >
                    {money(current.amount)}
                  </Typography>
                  {current.can_edit_amount && (
                    <Tooltip title="Edit amount">
                      <IconButton
                        size="small"
                        onClick={startEdit}
                        sx={{ color: "text.disabled" }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Box sx={{ flex: 1 }} />
                  {current.pandadoc_id && (
                    <Link
                      href={`https://app.pandadoc.com/a/#/documents/${current.pandadoc_id}`}
                      target="_blank"
                      rel="noopener"
                      sx={{
                        fontSize: "0.74rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                      }}
                    >
                      Contract <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Link>
                  )}
                </Stack>

                <Timeline fee={current} />

                {current.notes && (
                  <Typography
                    sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                  >
                    {current.notes}
                  </Typography>
                )}

                {/* The state that costs money if it's missed. Accounting is
                    waiting on a human here, so it gets a callout rather than
                    a chip you have to go looking for. */}
                {current.can_mark_paid && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Signed
                    {current.date_completed
                      ? ` ${fmtDate(current.date_completed)}`
                      : ""}{" "}
                    — waiting on accounting to release funds.
                  </Alert>
                )}

                {current.status === "Declined" && (
                  <Alert severity="error" sx={{ py: 0.5 }}>
                    {details.vendor?.company ?? "The vendor"} declined the
                    agreement. Add a new fee to try again with different terms.
                  </Alert>
                )}

                {/* Where this lands on the vendor's balance. Only a paid fee
                    reduces it — a signed contract is a commitment, not a
                    disbursement. */}
                {current.status === "Paid" && vendorTotal != null && (
                  <Typography
                    sx={{ fontSize: "0.76rem", color: "text.secondary" }}
                  >
                    {money(vendorTotal)} vendor total − {money(current.amount)}{" "}
                    paid ={" "}
                    <strong style={{ color: theme.palette.text.primary }}>
                      {money(balanceDue)}
                    </strong>{" "}
                    still owed
                    {current.quickbooks_bill_id
                      ? ` · QB ${current.quickbooks_bill_id}`
                      : ""}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {current.can_send && (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      startIcon={<SendOutlinedIcon sx={{ fontSize: 15 }} />}
                      onClick={() => run(() => sendMobilizationFee(current.id))}
                    >
                      Send contract
                    </Button>
                  )}
                  {current.can_mark_paid && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={busy}
                      onClick={() => setPaying(true)}
                    >
                      Mark paid
                    </Button>
                  )}
                  {current.can_void && (
                    <Button
                      size="small"
                      color="inherit"
                      disabled={busy}
                      startIcon={<BlockIcon sx={{ fontSize: 15 }} />}
                      onClick={() => setVoiding(true)}
                    >
                      Void
                    </Button>
                  )}
                  {!current.is_open && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy}
                      onClick={startEdit}
                    >
                      Add a new fee
                    </Button>
                  )}
                </Stack>
              </Stack>
            )}

            {/* Everything that came before — kept, never overwritten. */}
            {history.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  pt: 1.5,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setShowHistory((s) => !s)}
                  sx={{ fontSize: "0.72rem", p: 0, minWidth: 0 }}
                >
                  {showHistory ? "Hide" : "Show"} {history.length} earlier fee
                  {history.length === 1 ? "" : "s"}
                </Button>

                <Collapse in={showHistory}>
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    {history.map((fee) => (
                      <Stack
                        key={fee.id}
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          py: 0.5,
                          borderBottom: `1px dotted ${theme.palette.divider}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            width: 90,
                          }}
                        >
                          {money(fee.amount)}
                        </Typography>
                        <StatusChip status={fee.status} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Timeline fee={fee} />
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Mark paid */}
      <Dialog
        open={paying}
        onClose={() => setPaying(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
        >
          Mark as paid?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
            Confirms that <strong>{money(current?.amount)}</strong> has left
            QuickBooks to {details.vendor?.company ?? "the vendor"}. This is the
            last step — a paid fee can't be voided from here.
          </Typography>
          <TextField
            size="small"
            fullWidth
            autoFocus
            label="QuickBooks bill ID (optional)"
            value={qbId}
            onChange={(e) => setQbId(e.target.value)}
            helperText="Lets the payment be traced back out of this system later"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setPaying(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={confirmPaid}
            disabled={busy}
          >
            Mark paid
          </Button>
        </DialogActions>
      </Dialog>

      {/* Void */}
      <Dialog
        open={voiding}
        onClose={() => setVoiding(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
        >
          Void this fee?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
            The {money(current?.amount)} fee stops counting toward this work
            order. The record stays on the file — you can add a new fee
            afterwards.
          </Typography>
          <TextField
            size="small"
            fullWidth
            autoFocus
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setVoiding(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmVoid}
            disabled={busy}
          >
            Void fee
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
