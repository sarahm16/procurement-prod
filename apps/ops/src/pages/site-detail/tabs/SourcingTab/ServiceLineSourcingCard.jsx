// pages/Sites/ServiceLineSourcingCard.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import HistoryIcon from "@mui/icons-material/History";

import { useContractSiteServices } from "./useSiteSourcing";

const money = (n) =>
  n == null || n === ""
    ? "—"
    : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * The seven checks, split the way the sourcing team actually thinks about
 * them. The first four are properties of the VENDOR — identical on every site
 * they work — and the last three are properties of THIS line at THIS site.
 * Mixing them into one undifferentiated row is what made the old screen hard
 * to read: someone would chase a missing W-9 site by site not realising it was
 * one document covering all forty of them.
 */
const VENDOR_CHECKS = [
  { key: "w9", label: "W-9" },
  { key: "coi", label: "COI" },
  { key: "msa", label: "MSA" },
  { key: "ach", label: "ACH" },
];

const SITE_CHECKS = [
  { key: "rates", label: "Rates" },
  { key: "sent", label: "Exhibit" },
  { key: "signed", label: "Signed" },
];

function CheckDot({ value }) {
  const common = {
    width: 16,
    height: 16,
    borderRadius: "50%",
    display: "inline-grid",
    placeItems: "center",
    flexShrink: 0,
  };
  if (value === true)
    return (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "success.main", color: "common.white" }}
      >
        <CheckIcon sx={{ fontSize: 11 }} />
      </Box>
    );
  if (value === "warn")
    return (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "warning.main", color: "common.white" }}
      >
        <PriorityHighIcon sx={{ fontSize: 11 }} />
      </Box>
    );
  return (
    <Box
      component="span"
      sx={{
        ...common,
        border: 1.5,
        borderStyle: "solid",
        borderColor: "divider",
      }}
    />
  );
}

/** COI is the only three-state check, so it's the only one that needs a story. */
const checkTitle = (key, row) => {
  if (key !== "coi") return null;
  const v = row.checks?.coi;
  if (v === true)
    return row.coi_expiration
      ? `Current through ${fmtDate(row.coi_expiration)}`
      : "On file";
  if (v === "warn")
    return row.coi_expiration
      ? `Expires ${fmtDate(row.coi_expiration)} — verify additional insured`
      : "On file but not verified";
  return "No certificate on file";
};

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

function CheckGroup({ title, checks, row }) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="overline"
        sx={{ fontSize: "0.55rem", lineHeight: 1.4, color: "text.disabled" }}
      >
        {title}
      </Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        {checks.map(({ key, label }) => {
          const dot = (
            <Stack direction="row" spacing={0.625} alignItems="center">
              <CheckDot value={row.checks?.[key]} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem",
                  color:
                    row.checks?.[key] === true
                      ? "text.secondary"
                      : "text.primary",
                }}
              >
                {label}
              </Typography>
            </Stack>
          );
          const title = checkTitle(key, row);
          return title ? (
            <Tooltip key={key} title={title} arrow>
              <span>{dot}</span>
            </Tooltip>
          ) : (
            <Box key={key}>{dot}</Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

/* ── Pricing ─────────────────────────────────────────────────────────────── */

/**
 * Rates are edited as a batch and saved once.
 *
 * Per-field save-on-blur was tempting, but the PUT writes one activity log
 * entry per call — saving six services one at a time would bury the site's
 * history under six near-identical rows for what a person experienced as a
 * single edit.
 */
function PricingTable({ row, onRowsChanged, userId }) {
  const { services, loading, error, refresh } = useContractSiteServices(
    row.contract_site_id,
    {
      assignmentId: row.assignment_id ?? undefined,
    },
  );

  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // A new vendor on this line means different rates — drop anything half-typed
  // rather than saving the old vendor's numbers onto the new one.
  useEffect(() => {
    setDraft({});
    setSaveError(null);
  }, [row.assignment_id]);

  const valueFor = (s) =>
    s.id in draft ? draft[s.id] : (s.vendor_price ?? "");

  const changed = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => {
      if (!(s.id in draft)) return false;
      const next = draft[s.id] === "" ? null : Number(draft[s.id]);
      const prev = s.vendor_price ?? null;
      if (next === null && prev === null) return false;
      return next !== prev;
    });
  }, [services, draft]);

  const totals = useMemo(() => {
    if (!services) return { client: 0, vendor: 0 };
    return services.reduce(
      (acc, s) => {
        const v = valueFor(s);
        return {
          client: acc.client + (s.client_price ?? 0),
          vendor: acc.vendor + (v === "" || v == null ? 0 : Number(v) || 0),
        };
      },
      { client: 0, vendor: 0 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, draft]);

  const save = async () => {
    if (!row.assignment_id || !changed.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await axios.put(
        `/api/sourcing/assignments/${row.assignment_id}/pricing`,
        {
          prices: changed.map((s) => ({
            contract_site_service_id: s.id,
            vendor_price: draft[s.id] === "" ? null : Number(draft[s.id]),
          })),
          user_id: userId,
        },
      );
      if (data?.rows) onRowsChanged?.(data.rows);
      setDraft({});
      refresh();
    } catch (e) {
      console.error("Error saving rates:", e);
      setSaveError(e?.response?.data?.error ?? "Couldn't save those rates");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !services) {
    return (
      <Stack spacing={0.75} sx={{ px: 2, py: 1.5 }}>
        <Skeleton height={20} />
        <Skeleton height={20} width="80%" />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        sx={{ m: 2 }}
        action={
          <Button size="small" onClick={refresh}>
            Retry
          </Button>
        }
      >
        Couldn't load the services for this line.
      </Alert>
    );
  }

  if (!services?.length) {
    return (
      <Typography
        variant="caption"
        sx={{ display: "block", px: 2, py: 1.5, color: "text.secondary" }}
      >
        No services on this contract site yet.
      </Typography>
    );
  }

  const editable = Boolean(row.assignment_id);
  const margin = totals.client - totals.vendor;
  const marginPct = totals.client > 0 ? (margin / totals.client) * 100 : null;

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 132px 110px",
          alignItems: "center",
          columnGap: 1,
          rowGap: 0.25,
        }}
      >
        <HeadCell>Service</HeadCell>
        <HeadCell align="right">Client</HeadCell>
        <HeadCell align="right">Vendor</HeadCell>
        <HeadCell align="right">Margin</HeadCell>

        {services.map((s) => {
          const v = valueFor(s);
          const vendorNum = v === "" || v == null ? null : Number(v);
          const m =
            s.client_price != null && vendorNum != null
              ? s.client_price - vendorNum
              : null;
          const isDirty = s.id in draft;
          return (
            <Box key={s.id} sx={{ display: "contents" }}>
              <Typography variant="body2" sx={{ py: 0.5, fontSize: "0.8rem" }}>
                {s.name}
              </Typography>

              <Typography
                variant="body2"
                align="right"
                sx={{
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {money(s.client_price)}
              </Typography>

              <TextField
                value={v ?? ""}
                onChange={(e) => {
                  const next = e.target.value;
                  // Digits and one decimal point. Blocking the keystroke beats
                  // accepting "12..5" and failing on save.
                  if (next !== "" && !/^\d*\.?\d{0,2}$/.test(next)) return;
                  setDraft((d) => ({ ...d, [s.id]: next }));
                }}
                disabled={!editable || saving}
                size="small"
                placeholder="—"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: 0.25 }}>
                      $
                    </InputAdornment>
                  ),
                  sx: {
                    fontSize: "0.8rem",
                    height: 30,
                    "& input": {
                      textAlign: "right",
                      py: 0,
                      fontVariantNumeric: "tabular-nums",
                    },
                    ...(isDirty && {
                      bgcolor: (t) => alpha(t.palette.secondary.main, 0.08),
                    }),
                  },
                }}
              />

              <Typography
                variant="body2"
                align="right"
                sx={{
                  fontSize: "0.8rem",
                  fontVariantNumeric: "tabular-nums",
                  color:
                    m == null
                      ? "text.disabled"
                      : m < 0
                        ? "error.main"
                        : "text.primary",
                }}
              >
                {m == null ? "—" : money(m)}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {money(totals.client)} client · {money(totals.vendor)} vendor
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: margin < 0 ? "error.main" : "success.dark",
          }}
        >
          {money(margin)}
          {marginPct != null ? ` (${marginPct.toFixed(0)}%)` : ""}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {!editable && (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            Assign a vendor to enter rates
          </Typography>
        )}

        {editable && changed.length > 0 && (
          <>
            <Button size="small" onClick={() => setDraft({})} disabled={saving}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : `Save ${changed.length} rate${changed.length > 1 ? "s" : ""}`}
            </Button>
          </>
        )}
      </Stack>

      {saveError && (
        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
          {saveError}
        </Alert>
      )}
    </Box>
  );
}

const HeadCell = ({ children, align = "left" }) => (
  <Typography
    variant="overline"
    align={align}
    sx={{ fontSize: "0.55rem", lineHeight: 2, color: "text.disabled" }}
  >
    {children}
  </Typography>
);

/* ── Prior vendors ───────────────────────────────────────────────────────── */

function PriorVendors({ rows }) {
  const [open, setOpen] = useState(false);
  if (!rows?.length) return null;

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Button
        size="small"
        onClick={() => setOpen((o) => !o)}
        startIcon={<HistoryIcon sx={{ fontSize: 15 }} />}
        endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ fontSize: "0.68rem", color: "text.secondary", px: 0.5 }}
      >
        {rows.length} previous vendor{rows.length > 1 ? "s" : ""}
      </Button>
      <Collapse in={open}>
        <Stack spacing={0.5} sx={{ mt: 0.5, pl: 0.5 }}>
          {rows.map((a) => (
            <Stack
              key={a.assignment_id}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Typography
                variant="caption"
                sx={{ minWidth: 160, color: "text.secondary" }}
              >
                {a.vendor ?? "Unknown vendor"}
              </Typography>
              {a.status && (
                <Chip
                  label={a.status}
                  size="small"
                  variant="outlined"
                  sx={{ height: 17, fontSize: "0.58rem" }}
                />
              )}
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                added {fmtDate(a.created_at)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

/* ── Card ────────────────────────────────────────────────────────────────── */

export default function ServiceLineSourcingCard({
  row,
  userId,
  onAssign,
  onReplace,
  onRowsChanged,
}) {
  const assigned = Boolean(row.vendor_id);
  const steps = row.completed_steps ?? 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        borderColor: (t) =>
          row.is_sourced
            ? alpha(t.palette.success.main, 0.4)
            : t.palette.divider,
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        spacing={2}
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: (t) =>
            row.is_sourced
              ? alpha(t.palette.success.main, 0.05)
              : alpha(t.palette.primary.main, 0.03),
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="overline"
            sx={{
              display: "block",
              fontSize: "0.6rem",
              lineHeight: 1.6,
              color: "text.secondary",
            }}
          >
            {row.service_line}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Typography
              variant="subtitle1"
              noWrap
              sx={{
                fontWeight: 600,
                color: assigned ? "text.primary" : "text.disabled",
              }}
            >
              {assigned ? row.vendor : "No vendor assigned"}
            </Typography>
            {row.is_primary && assigned && (
              <Chip
                label="Primary"
                size="small"
                sx={{ height: 18, fontSize: "0.58rem" }}
              />
            )}
          </Stack>
        </Box>

        <Stack alignItems="flex-end" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant={assigned ? "outlined" : "contained"}
            startIcon={
              assigned ? (
                <SwapHorizIcon sx={{ fontSize: 16 }} />
              ) : (
                <PersonAddAltIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={() => (assigned ? onReplace?.(row) : onAssign?.(row))}
            sx={{ fontSize: "0.7rem", py: 0.25 }}
          >
            {assigned ? "Replace" : "Assign"}
          </Button>
          <Box sx={{ width: 120 }}>
            <LinearProgress
              variant="determinate"
              value={(steps / 7) * 100}
              color={row.is_sourced ? "success" : "secondary"}
              sx={{ height: 4, borderRadius: 2 }}
            />
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: "right",
                fontSize: "0.6rem",
                color: "text.secondary",
              }}
            >
              {steps} of 7
            </Typography>
          </Box>
        </Stack>
      </Stack>

      <Divider />

      {/* Compliance */}
      <Stack
        direction="row"
        spacing={3}
        sx={{ px: 2, py: 1.25 }}
        flexWrap="wrap"
        useFlexGap
      >
        <CheckGroup title="Vendor" checks={VENDOR_CHECKS} row={row} />
        <CheckGroup title="This site" checks={SITE_CHECKS} row={row} />
      </Stack>

      <Divider />

      <PricingTable row={row} userId={userId} onRowsChanged={onRowsChanged} />

      <PriorVendors rows={row.prior_assignments} />
    </Paper>
  );
}
