import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LinkIcon from "@mui/icons-material/Link";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LinkOffIcon from "@mui/icons-material/LinkOff";

import {
  useLinkedWorkOrders,
  useWorkOrderActions,
} from "../../WorkOrderDetailProvider";
import AddChildWorkOrderPanel from "./AddChildWorkOrderPanel";

/**
 * LinkedWorkOrders
 *
 * One card for both directions of the parent/child relationship, because from
 * a user's point of view it's one thing: the other work orders on this job.
 *
 *   Viewing a parent → its children, with the cost roll-up.
 *   Viewing a child  → the parent (badged) and every sibling, with the one
 *                      you're looking at marked so you know where you are.
 *
 * Everything but the create action comes from the provider, so this can be
 * dropped anywhere inside WorkOrderDetailProvider with no wiring.
 *
 * Props:
 *   onAddChild   {fn?}  opens the create form with this work order as parent
 *   defaultOpen  {bool}
 */

const fmtMoney = (n) =>
  n == null
    ? null
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

function StatusChip({ name, color }) {
  if (!name) return null;
  const c = color || "#6b7280";
  return (
    <Chip
      label={name}
      size="small"
      sx={{
        backgroundColor: `${c}22`,
        color: c,
        border: `1px solid ${c}55`,
        height: 20,
        fontSize: "0.62rem",
      }}
    />
  );
}

function Row({ wo, isParent, isCurrent, onOpen, onUnlink }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        px: 1.25,
        py: 0.85,
        borderRadius: 1,
        // The parent gets a real outline — it's the job, not a peer.
        ...(isParent && {
          border: 1,
          borderColor: "primary.main",
          bgcolor: alpha(theme.palette.primary.main, isDark ? 0.1 : 0.04),
          mb: 0.75,
        }),
        ...(isCurrent && {
          bgcolor: alpha(theme.palette.text.primary, isDark ? 0.07 : 0.045),
        }),
        ...(!isParent && {
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: 0,
        }),
      }}
    >
      {isParent && (
        <Typography
          sx={{
            fontFamily: '"Barlow Condensed", sans-serif',
            fontWeight: 700,
            fontSize: "0.6rem",
            letterSpacing: "0.1em",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          PARENT
        </Typography>
      )}

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="baseline"
          useFlexGap
          flexWrap="wrap"
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.82rem",
              fontFamily: '"Barlow", sans-serif',
              color: isCurrent ? "text.primary" : "inherit",
            }}
          >
            {wo.work_order_number}
          </Typography>

          {isCurrent && (
            <Typography
              sx={{
                fontFamily: '"Barlow Condensed", sans-serif',
                fontWeight: 700,
                fontSize: "0.58rem",
                letterSpacing: "0.1em",
                color: "text.disabled",
              }}
            >
              YOU ARE HERE
            </Typography>
          )}

          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {wo.type || wo.scope_of_work?.slice(0, 40) || "—"}
          </Typography>
        </Stack>

        {!isParent && (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            {wo.vendor ? (
              wo.vendor
            ) : (
              <Box
                component="span"
                sx={{ color: "error.main", fontStyle: "italic" }}
              >
                no vendor assigned
              </Box>
            )}
            {wo.vendor_total != null && ` · ${fmtMoney(wo.vendor_total)}`}
          </Typography>
        )}
      </Box>

      <StatusChip name={wo.status} color={wo.status_color} />

      <Tooltip title="Open in a new tab">
        <IconButton
          size="small"
          onClick={() => onOpen(wo.id)}
          sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      {/* Unlinking is not deleting — the work order survives, it just stops
          being part of this job. Deleting one shouldn't be a small icon in a
          list. */}
      {!isParent && !isCurrent && onUnlink && (
        <Tooltip title="Remove from this job">
          <IconButton
            size="small"
            onClick={() => onUnlink(wo)}
            sx={{
              color: "text.disabled",
              "&:hover": { color: "warning.main" },
            }}
          >
            <LinkOffIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

export default function LinkedWorkOrders({ onAddChild, defaultOpen = true }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { workOrderId, parent, family, isChild, clientTotal, loading } =
    useLinkedWorkOrders();
  const { unlinkWorkOrder } = useWorkOrderActions();

  const [open, setOpen] = useState(defaultOpen);
  const [adding, setAdding] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const [busy, setBusy] = useState(false);

  const children = useMemo(
    () => family.filter((w) => w.id !== parent?.id),
    [family, parent],
  );

  const vendorTotal = useMemo(
    () =>
      children.reduce((t, w) => t + (Number(w.vendor_total) || 0), 0) || null,
    [children],
  );

  const margin =
    clientTotal != null && vendorTotal != null
      ? clientTotal - vendorTotal
      : null;
  const marginPct =
    margin != null && clientTotal
      ? Math.round((margin / clientTotal) * 100)
      : null;

  const unassigned = children.filter((w) => !w.vendor).length;

  // Rendered even with nothing linked. A standalone work order needing a
  // second vendor is exactly when someone has to find this, and an empty
  // state that explains the idea is how they do.
  if (loading) return null;

  const openWorkOrder = (id) => window.open(`/workorders/${id}`, "_blank");

  const confirmUnlink = async () => {
    setBusy(true);
    try {
      await unlinkWorkOrder(unlinking.id);
      setUnlinking(null);
    } catch (e) {
      console.error("Error unlinking work order:", e);
    } finally {
      setBusy(false);
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
            <Box sx={{ display: "flex", color: "secondary.main" }}>
              <LinkIcon sx={{ fontSize: 16 }} />
            </Box>
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
              Linked Work Orders
            </Typography>
            {children.length > 0 && (
              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
                {children.length}
              </Typography>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Available from either end — needing a third vendor occurs to
                you just as easily while looking at a child. */}
            <Tooltip title="Add another vendor's work order to this job">
              <IconButton
                size="small"
                onClick={onAddChild ?? (() => setAdding(true))}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <AddIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
            <Box sx={{ color: "text.disabled", display: "flex" }}>
              {open ? (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              )}
            </Box>
          </Stack>
        </Box>

        <Collapse in={open}>
          <Box sx={{ px: 1.5, py: 1.25 }}>
            {isChild && <Row wo={parent} isParent onOpen={openWorkOrder} />}

            {children.length === 0 ? (
              <Typography
                sx={{
                  px: 1.25,
                  py: 1.5,
                  fontSize: "0.78rem",
                  color: "text.secondary",
                }}
              >
                No linked work orders yet. Add one when a second vendor is
                needed for a different scope at this site — they'll be invoiced
                together on this work order.
              </Typography>
            ) : (
              children.map((wo) => (
                <Row
                  key={wo.id}
                  wo={wo}
                  isCurrent={wo.id === workOrderId}
                  onOpen={openWorkOrder}
                  onUnlink={setUnlinking}
                />
              ))
            )}

            {/* Roll-up. The client price sits on the parent; the vendor costs
                sit on the children — so this line is the job's margin. */}
            {children.length > 0 &&
              (vendorTotal != null || clientTotal != null) && (
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="baseline"
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ px: 1.25, pt: 1.25 }}
                >
                  {clientTotal != null && (
                    <Typography
                      sx={{ fontSize: "0.74rem", color: "text.secondary" }}
                    >
                      Client{" "}
                      <strong style={{ color: theme.palette.text.primary }}>
                        {fmtMoney(clientTotal)}
                      </strong>
                    </Typography>
                  )}
                  {vendorTotal != null && (
                    <Typography
                      sx={{ fontSize: "0.74rem", color: "text.secondary" }}
                    >
                      Vendor cost{" "}
                      <strong style={{ color: theme.palette.text.primary }}>
                        {fmtMoney(vendorTotal)}
                      </strong>
                    </Typography>
                  )}
                  {margin != null && (
                    <Typography
                      sx={{
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        color:
                          margin < 0
                            ? "error.main"
                            : marginPct < 20
                              ? "warning.main"
                              : "success.main",
                      }}
                    >
                      Margin {fmtMoney(margin)} · {marginPct}%
                    </Typography>
                  )}
                  {unassigned > 0 && (
                    <Typography
                      sx={{
                        fontSize: "0.74rem",
                        color: "warning.main",
                        ml: "auto",
                      }}
                    >
                      {unassigned} without a vendor
                    </Typography>
                  )}
                </Stack>
              )}
          </Box>
        </Collapse>
      </Box>

      <AddChildWorkOrderPanel open={adding} onClose={() => setAdding(false)} />

      <Dialog
        open={Boolean(unlinking)}
        onClose={() => setUnlinking(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
        >
          Remove from this job?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem" }}>
            <strong>{unlinking?.work_order_number}</strong> will become a
            standalone work order. It isn't deleted — its vendor, scope, pricing
            and history all stay with it, and it will be invoiced on its own
            rather than as part of this job.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setUnlinking(null)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={confirmUnlink}
            disabled={busy}
          >
            Remove from job
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
