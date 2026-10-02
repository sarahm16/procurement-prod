// pages/Sites/ServiceLineSourcingCard.jsx
//
// The right-hand side of the site's Sourcing tab: everything about ONE
// service line at this site. Vendor changes (assign, add backup, make primary,
// replace) all go through the sourcing panel via `onManage`.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
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
import StarIcon from "@mui/icons-material/Star";

import { useContractSiteServices } from "./useSiteSourcing";
// Adjust this path to wherever constants/ lives relative to pages/Sites.
import { getServiceLineConfig } from "../../../../*/constants/serviceLineConfig";

const DAY = 86400000;

const money = (n) =>
  n == null || n === ""
    ? "—"
    : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

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

/* ── Shared bits (also used by SiteSourcingTab) ──────────────────────────── */

/** The service line's icon on a tint of its own colour. */
export function LineIcon({ name, size = 36 }) {
  const { color, icon: Icon } = getServiceLineConfig(name);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        bgcolor: alpha(color, 0.14),
        color,
      }}
    >
      <Icon sx={{ fontSize: size * 0.58 }} />
    </Box>
  );
}

/**
 * One status per line, in priority order. Used for the list on the left and
 * the header on the right so the two always agree.
 */
export function lineStatus(row) {
  if (!row.vendor_id)
    return { key: "none", label: "No vendor", color: "error" };
  if (!row.is_primary)
    return { key: "primary", label: "Needs primary", color: "warning" };
  if (row.is_sourced)
    return { key: "done", label: "Sourced", color: "success" };
  return {
    key: "progress",
    label: `${row.completed_steps ?? 0} of 7`,
    color: "default",
  };
}

export function StatusChip({ row, size = "small" }) {
  const s = lineStatus(row);
  return (
    <Chip
      size={size}
      label={s.label}
      color={s.color}
      variant={s.key === "progress" ? "outlined" : "filled"}
      icon={s.key === "done" ? <CheckIcon /> : undefined}
      sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
    />
  );
}

/* ── Layout helpers ──────────────────────────────────────────────────────── */

function Section({ title, caption, action, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
          {title}
        </Typography>
        {caption && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {caption}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

/* ── Checklist ───────────────────────────────────────────────────────────── */

function StepIcon({ state }) {
  const common = {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  };
  if (state === "done")
    return (
      <Box sx={{ ...common, bgcolor: "success.main", color: "common.white" }}>
        <CheckIcon sx={{ fontSize: 14 }} />
      </Box>
    );
  if (state === "warn")
    return (
      <Box sx={{ ...common, bgcolor: "warning.main", color: "common.white" }}>
        <PriorityHighIcon sx={{ fontSize: 14 }} />
      </Box>
    );
  return (
    <Box
      sx={{
        ...common,
        border: 2,
        borderStyle: "dashed",
        borderColor: "text.disabled",
      }}
    />
  );
}

/**
 * Each check as words, not just a dot: "Expires Oct 12" tells you what to
 * do; an orange circle makes you hover to find out.
 */
function steps(row) {
  const c = row.checks ?? {};
  const doc = (v, done = "On file") =>
    v === true
      ? { state: "done", text: done }
      : { state: "todo", text: "Missing" };

  const coi = (() => {
    if (c.coi === true)
      return {
        state: "done",
        text: `Current through ${fmtDate(row.coi_expiration)}`,
      };
    if (c.coi === "warn") {
      const exp = row.coi_expiration
        ? new Date(row.coi_expiration).getTime()
        : null;
      if (exp && exp <= Date.now())
        return {
          state: "warn",
          text: `Expired ${fmtDate(row.coi_expiration)}`,
        };
      if (exp && exp - Date.now() <= 30 * DAY)
        return {
          state: "warn",
          text: `Expires ${fmtDate(row.coi_expiration)}`,
        };
      return { state: "warn", text: "Additional insured not verified" };
    }
    return { state: "todo", text: "Missing" };
  })();

  const rates = !row.service_count
    ? { state: "todo", text: "No services to price yet" }
    : c.rates
      ? { state: "done", text: `All ${row.service_count} priced` }
      : {
          state: "todo",
          text: `${row.priced_count ?? 0} of ${row.service_count} priced`,
        };

  const sent = row.exhibit_sent_at
    ? { state: "done", text: `Sent ${fmtDate(row.exhibit_sent_at)}` }
    : { state: "todo", text: "Not sent" };

  const signed = row.exhibit_signed_at
    ? { state: "done", text: `Signed ${fmtDate(row.exhibit_signed_at)}` }
    : row.exhibit_sent_at
      ? { state: "warn", text: "Waiting on the vendor" }
      : { state: "todo", text: "Send the exhibit first" };

  return {
    vendor: [
      { label: "W-9", ...doc(c.w9) },
      { label: "COI", ...coi },
      { label: "MSA", ...doc(c.msa, "Signed") },
      { label: "ACH", ...doc(c.ach) },
    ],
    site: [
      { label: "Rates", ...rates },
      { label: "Exhibit", ...sent },
      { label: "Exhibit signed", ...signed },
    ],
  };
}

function StepList({ title, hint, items }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary" }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: "block", color: "text.secondary", mb: 0.75 }}
      >
        {hint}
      </Typography>
      {items.map((s, i) => (
        <Stack
          key={s.label}
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{
            py: 0.9,
            borderTop: i ? 1 : 0,
            borderColor: "divider",
          }}
        >
          <StepIcon state={s.state} />
          <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", width: 112 }}>
            {s.label}
          </Typography>
          <Typography
            sx={{
              fontSize: "0.82rem",
              color:
                s.state === "done"
                  ? "text.secondary"
                  : s.state === "warn"
                    ? "warning.dark"
                    : "text.primary",
              fontWeight: s.state === "done" ? 400 : 500,
            }}
          >
            {s.text}
          </Typography>
        </Stack>
      ))}
    </Box>
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
  // Always the PRIMARY's rates (the view row's assignment). Backups' rates
  // are entered from the sourcing panel.
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
      <Stack spacing={0.75}>
        <Skeleton height={20} />
        <Skeleton height={20} width="80%" />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
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
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No services are set up on this line for this site yet, so there's
        nothing to price.
      </Typography>
    );
  }

  const editable = Boolean(row.assignment_id);
  const margin = totals.client - totals.vendor;
  const marginPct = totals.client > 0 ? (margin / totals.client) * 100 : null;

  return (
    <Box>
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
    sx={{ fontSize: "0.65rem", lineHeight: 2, color: "text.secondary" }}
  >
    {children}
  </Typography>
);

/* ── Prior vendors ───────────────────────────────────────────────────────── */

function PriorVendors({ rows }) {
  const [open, setOpen] = useState(false);
  if (!rows?.length) return null;

  return (
    <Box>
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

/* ── Detail ──────────────────────────────────────────────────────────────── */

export default function ServiceLineSourcingCard({
  row,
  userId,
  onManage,
  onRowsChanged,
}) {
  const { color } = getServiceLineConfig(row.service_line);
  const assigned = Boolean(row.vendor_id);
  const backups = row.backups ?? [];
  const needsPrimary = assigned && !row.is_primary;
  const done = row.completed_steps ?? 0;
  const list = assigned ? steps(row) : null;

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center">
        <LineIcon name={row.service_line} size={44} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {row.service_line}
          </Typography>
          {assigned && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 0.5, maxWidth: 260 }}
            >
              <LinearProgress
                variant="determinate"
                value={(done / 7) * 100}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(color, 0.15),
                  "& .MuiLinearProgress-bar": {
                    bgcolor: row.is_sourced ? "success.main" : color,
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", whiteSpace: "nowrap" }}
              >
                {done} of 7 steps
              </Typography>
            </Stack>
          )}
        </Box>
        <StatusChip row={row} size="medium" />
      </Stack>

      {/* No vendor: that's the only thing worth showing. */}
      {!assigned ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: "center",
            borderStyle: "dashed",
            borderWidth: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
            No vendor on {row.service_line} yet
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 0.5, mb: 2 }}
          >
            Assign one to start the checklist and enter rates.
          </Typography>
          <Button
            variant="contained"
            startIcon={<PersonAddAltIcon />}
            onClick={() => onManage?.(row)}
          >
            Assign a vendor
          </Button>
        </Paper>
      ) : (
        <>
          {/* Vendor */}
          <Section
            title="Vendor"
            action={
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
                onClick={() => onManage?.(row)}
              >
                Manage vendors
              </Button>
            }
          >
            {needsPrimary && (
              <Alert
                severity="warning"
                sx={{ mb: 1.5 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => onManage?.(row)}
                  >
                    Pick primary
                  </Button>
                }
              >
                No primary vendor is marked on this line.
              </Alert>
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              {row.is_primary && (
                <StarIcon sx={{ fontSize: 18, color: "warning.main" }} />
              )}
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                {row.vendor}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {row.is_primary ? "Primary" : "Backup"}
              </Typography>
            </Stack>
            {backups.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 1.25 }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Backup{backups.length > 1 ? "s" : ""}:
                </Typography>
                {backups.map((a) => (
                  <Tooltip
                    key={a.assignment_id}
                    title={`${a.status ?? "Backup"} · added ${fmtDate(a.created_at)}`}
                    arrow
                  >
                    <Chip
                      label={a.vendor ?? "Unknown vendor"}
                      size="small"
                      variant="outlined"
                    />
                  </Tooltip>
                ))}
              </Stack>
            )}
            {row.prior_assignments?.length > 0 && (
              <Box sx={{ mt: 1.5, ml: -0.5 }}>
                <PriorVendors rows={row.prior_assignments} />
              </Box>
            )}
          </Section>

          {/* Checklist */}
          <Section
            title="Checklist"
            caption={
              row.is_sourced
                ? "Everything's done."
                : `${7 - done} step${7 - done === 1 ? "" : "s"} left`
            }
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                columnGap: 4,
                rowGap: 2,
              }}
            >
              <StepList
                title="Vendor documents"
                hint={`Cover every site ${row.vendor} works`}
                items={list.vendor}
              />
              <StepList
                title="This site"
                hint={`Specific to ${row.service_line} here`}
                items={list.site}
              />
            </Box>
          </Section>

          {/* Rates */}
          <Section
            title="Rates"
            caption={
              backups.length
                ? `for ${row.vendor} · backups' rates are under Manage vendors`
                : `for ${row.vendor}`
            }
          >
            <PricingTable
              row={row}
              userId={userId}
              onRowsChanged={onRowsChanged}
            />
          </Section>
        </>
      )}
    </Stack>
  );
}
