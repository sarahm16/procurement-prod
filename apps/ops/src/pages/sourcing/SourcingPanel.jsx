/**
 * Site panel — one service line at a time.
 *
 * Opens on the line whose grid row was clicked; tabs across the top switch to
 * the site's other lines. Everything below the tabs is about that one line:
 *
 *   no vendor yet  → the vendor picker, ready to assign a primary
 *   has vendors    → Primary vendor card, Backup vendors, Rates
 *   picking        → the picker takes over, headed with what it will do
 *                    ("Pick a backup vendor for Snow") and a Back button
 *
 * Assigning one vendor to several lines at once lives in the grid's bulk bar
 * (tick rows → pick a vendor), not here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { alpha } from "@mui/material/styles";

import {
  useAssignableVendors,
  milesBetween,
  invalidateAssignableVendors,
} from "./useSourcing";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";
import VendorForm from "../vendors/CreateVendorForm";
// Adjust this path to wherever constants/ lives relative to sourcing/.
import { getServiceLineConfig } from "../../*/constants/serviceLineConfig";

const PANEL_WIDTH = 560;
const RADII = [20, 50, 100, null]; // null = any distance
const DAY = 86400000;

const money = (n) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      });

function DocDot({ value }) {
  const common = {
    width: 15,
    height: 15,
    borderRadius: "50%",
    display: "inline-grid",
    placeItems: "center",
  };
  if (value === true)
    return (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "success.main", color: "common.white" }}
      >
        <CheckIcon sx={{ fontSize: 10 }} />
      </Box>
    );
  if (value === "warn")
    return (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "warning.main", color: "common.white" }}
      >
        <PriorityHighIcon sx={{ fontSize: 10 }} />
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

/** Same three-state COI rule as the grid: current / expiring-or-unverified / none. */
const coiOf = (v) => {
  if (!v.coi_expiration) return false;
  const exp = new Date(v.coi_expiration).getTime();
  if (exp <= Date.now() || !v.has_coi) return "warn";
  return exp - Date.now() <= 30 * DAY ? "warn" : true;
};

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

/** The line's icon on a tint of its own colour (constants/serviceLineConfig). */
function LineIcon({ name, size = 36 }) {
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

function StateIcon({ state, size = 18 }) {
  const common = {
    width: size,
    height: size,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  };
  if (state === "done")
    return (
      <Box sx={{ ...common, bgcolor: "success.main", color: "common.white" }}>
        <CheckIcon sx={{ fontSize: size * 0.65 }} />
      </Box>
    );
  if (state === "warn")
    return (
      <Box sx={{ ...common, bgcolor: "warning.main", color: "common.white" }}>
        <PriorityHighIcon sx={{ fontSize: size * 0.65 }} />
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
 * A vendor's four documents as one sentence instead of four dots:
 * "All documents on file" / "Missing W-9, ACH" / "COI expires Oct 12".
 */
function docSummary(v) {
  const missing = [
    !v.has_w9 && "W-9",
    coiOf(v) === false && "COI",
    !v.has_msa && "MSA",
    !v.has_ach && "ACH",
  ].filter(Boolean);
  const coiWarn =
    coiOf(v) === "warn"
      ? v.coi_expiration && new Date(v.coi_expiration) <= new Date()
        ? `COI expired ${fmtDate(v.coi_expiration)}`
        : v.coi_expiration &&
            new Date(v.coi_expiration) - Date.now() <= 30 * DAY
          ? `COI expires ${fmtDate(v.coi_expiration)}`
          : "COI not verified"
      : null;
  if (!missing.length && !coiWarn)
    return { state: "done", text: "All documents on file" };
  const parts = [];
  if (missing.length) parts.push(`Missing ${missing.join(", ")}`);
  if (coiWarn) parts.push(coiWarn);
  return { state: missing.length ? "todo" : "warn", text: parts.join(" · ") };
}

function DocLine({ v }) {
  const d = docSummary(v);
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <StateIcon state={d.state} size={16} />
      <Typography
        sx={{
          fontSize: "0.78rem",
          color:
            d.state === "done"
              ? "text.secondary"
              : d.state === "warn"
                ? "warning.dark"
                : "text.primary",
        }}
      >
        {d.text}
      </Typography>
    </Stack>
  );
}

/**
 * The one thing to do next on this line, in checklist order. This is where
 * the eye should land when the panel opens.
 */
function nextStep(line, primary, backups) {
  if (!primary)
    return {
      tone: "warning",
      title: "Pick a primary vendor",
      body: backups.length
        ? "Choose Set primary on one of the vendors below."
        : "Add a vendor to this line.",
    };
  if (primary.is_sourced)
    return {
      tone: "success",
      title: "This line is sourced",
      body: `All 7 steps are done for ${primary.company}.`,
    };
  const d = docSummary(primary);
  if (d.state !== "done")
    return {
      tone: "info",
      title: `Collect documents from ${primary.company}`,
      body: `${d.text}. These cover every site they work.`,
    };
  if (primary.service_count > 0 && !primary.has_rates)
    return {
      tone: "info",
      title: "Enter rates",
      body: `${primary.priced_count ?? 0} of ${primary.service_count} services priced for ${primary.company}.`,
      action: "rates",
    };
  if (!primary.service_count)
    return {
      tone: "info",
      title: "No services to price yet",
      body: `Services need to be set up on ${line.service_line} for this site before rates can be entered.`,
    };
  if (!primary.exhibit_sent)
    return {
      tone: "info",
      title: `Send the exhibit to ${primary.company}`,
      body: "Rates are in — the exhibit is the next step.",
    };
  return {
    tone: "info",
    title: `Waiting on ${primary.company} to sign`,
    body: `Exhibit sent ${fmtDate(primary.exhibit_sent_at)}.`,
  };
}

const SectionTitle = ({ children, action }) => (
  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
    <Typography
      sx={{
        fontWeight: 700,
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "text.secondary",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
    {action}
  </Stack>
);

/**
 * Where a vendor's profile lives. Opened in a new tab so the panel (and
 * anything half-typed in it) stays put. Change this if your route differs.
 */
const vendorProfileUrl = (vendorId) => `/vendors/${vendorId}`;

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ""))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

/**
 * One vendor on the line — the layout from the old app: avatar, name with a
 * link to their profile, documents underneath, and the role control on the
 * same row (blue ★ Primary chip, or an outlined ☆ Set primary button).
 */
/** The old app's primary blue — distinct from the theme's navy buttons. */
const PRIMARY_BLUE = "#2563EB";

function VendorRow({
  v,
  loaded,
  flash,
  noPrimary,
  promoting,
  onMakePrimary,
  onReplace,
}) {
  return (
    <Box
      sx={(t) => {
        const blue = PRIMARY_BLUE;
        return {
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          border: 1,
          transition: "background-color .6s ease, border-color .6s ease",
          borderColor: flash
            ? t.palette.success.main
            : v.is_primary
              ? alpha(blue, 0.35)
              : t.palette.divider,
          bgcolor: flash
            ? alpha(
                t.palette.success.main,
                t.palette.mode === "dark" ? 0.2 : 0.1,
              )
            : v.is_primary
              ? alpha(blue, t.palette.mode === "dark" ? 0.16 : 0.06)
              : alpha(
                  t.palette.text.primary,
                  t.palette.mode === "dark" ? 0.04 : 0.02,
                ),
        };
      }}
    >
      <Box
        sx={(t) => ({
          width: 34,
          height: 34,
          borderRadius: 1.5,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          fontWeight: 700,
          fontSize: "0.8rem",
          bgcolor: v.is_primary
            ? alpha(PRIMARY_BLUE, 0.14)
            : t.palette.action.hover,
          color: v.is_primary ? PRIMARY_BLUE : "text.secondary",
        })}
      >
        {initials(v.company)}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            noWrap
            sx={{ fontWeight: 700, fontSize: "0.92rem", minWidth: 0 }}
          >
            {v.company}
          </Typography>
          {v.vendor_id && (
            <Tooltip title="Open vendor profile in a new tab" arrow>
              <IconButton
                size="small"
                component="a"
                href={vendorProfileUrl(v.vendor_id)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ p: 0.25, color: "text.secondary" }}
              >
                <OpenInNewIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {loaded && (
          <Box sx={{ mt: 0.5 }}>
            <DocLine v={v} />
          </Box>
        )}
      </Box>

      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        sx={{ pt: 0.25 }}
      >
        {v.is_primary ? (
          <Chip
            icon={<StarIcon sx={{ fontSize: "14px !important" }} />}
            label="Primary"
            size="small"
            variant="outlined"
            sx={{
              height: 24,
              fontWeight: 600,
              fontSize: "0.72rem",
              borderRadius: 1,
              color: PRIMARY_BLUE,
              borderColor: alpha(PRIMARY_BLUE, 0.5),
              bgcolor: alpha(PRIMARY_BLUE, 0.08),
              "& .MuiChip-icon": { color: PRIMARY_BLUE },
            }}
          />
        ) : (
          <Button
            size="small"
            variant={noPrimary ? "contained" : "outlined"}
            color={noPrimary ? "primary" : "inherit"}
            startIcon={
              noPrimary ? (
                <StarIcon sx={{ fontSize: 14 }} />
              ) : (
                <StarBorderIcon sx={{ fontSize: 14 }} />
              )
            }
            onClick={onMakePrimary}
            disabled={promoting != null}
            sx={{
              height: 24,
              px: 1,
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: 1,
              whiteSpace: "nowrap",
              ...(!noPrimary && {
                color: "text.secondary",
                borderColor: "divider",
                bgcolor: "background.paper",
              }),
            }}
          >
            {promoting === v.assignment_id ? "Saving…" : "Set primary"}
          </Button>
        )}
        <Tooltip title={`Replace ${v.company}`} arrow>
          <IconButton
            size="small"
            onClick={onReplace}
            sx={{ color: "text.secondary" }}
          >
            <SwapHorizIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

/** Changes whenever a line's vendors change, so the vendor list refetches. */
const lineSig = (r) => `${r.assignment_id}|${r.vendor_count}|${r.is_primary}`;
const svcKey = (csId, assignmentId) => `${csId}:${assignmentId}`;
const errMsg = (e, fallback) =>
  e.response?.data?.message ?? e.response?.data?.error ?? fallback;

export default function SourcingPanel({
  open,
  onClose,
  row,
  siteRows,
  userId,
  onRowsChanged,
}) {
  const {
    vendors,
    error: vendorsError,
    refresh: refreshVendors,
  } = useAssignableVendors();

  const [mode, setMode] = useState("lines"); // lines | create
  const [activeId, setActiveId] = useState(null); // contract_site_id on screen
  // What the picker is for: { kind: "assign" } on an empty line,
  // { kind: "backup" }, or { kind: "replace", vendor } — null when not picking.
  const [picking, setPicking] = useState(null);
  const [confirm, setConfirm] = useState(null); // { newVendor, oldVendor } for replace
  const [lineVendors, setLineVendors] = useState({}); // csId -> { sig, list }
  const [rateFor, setRateFor] = useState({}); // csId -> assignment_id shown in rates
  const [services, setServices] = useState({}); // "csId:assignmentId" -> services
  const [justChanged, setJustChanged] = useState(null); // assignment_id to flash
  const [promoting, setPromoting] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(20);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const ratesRef = useRef(null);

  // Opening on a grid row lands on that row's line.
  useEffect(() => {
    if (!row) return;
    setActiveId(row.contract_site_id);
    setMode("lines");
    setPicking(null);
    setConfirm(null);
    setRateFor({});
    setActionError(null);
    setSearch("");
    setRadius(20);
  }, [row?.contract_site_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const line =
    siteRows.find((r) => r.contract_site_id === activeId) ??
    siteRows.find((r) => r.contract_site_id === row?.contract_site_id) ??
    siteRows[0] ??
    null;
  const csId = line?.contract_site_id;
  const hasVendor = Boolean(line?.vendor_id);

  // An empty line goes straight to the picker — that's the only thing to do.
  const pickerFor = picking ?? (line && !hasVendor ? { kind: "assign" } : null);

  const switchLine = (id) => {
    setActiveId(id);
    setPicking(null);
    setActionError(null);
    setSearch("");
  };

  /* ── This line's vendors ──────────────────────────────────────────────
   * Latest request wins: a reload that started before a change finished
   * can't overwrite the change with older data. */
  const lineRequest = useRef({});
  const nextLineRequest = (id) => {
    lineRequest.current[id] = (lineRequest.current[id] ?? 0) + 1;
    return lineRequest.current[id];
  };
  const loadLineVendors = useCallback((r) => {
    const id = r.contract_site_id;
    const sig = lineSig(r);
    const seq = nextLineRequest(id);
    axios
      .get(`/api/sourcing/contract-sites/${id}/vendors`)
      .then(({ data }) => {
        if (lineRequest.current[id] !== seq) return;
        setLineVendors((s) => ({ ...s, [id]: { sig, list: data } }));
      })
      .catch((e) => console.error("Error fetching line vendors:", e));
  }, []);

  useEffect(() => {
    if (line?.vendor_id && lineVendors[csId]?.sig !== lineSig(line))
      loadLineVendors(line);
  }, [line]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = useMemo(() => {
    if (!line?.vendor_id) return [];
    const cached = lineVendors[csId]?.list;
    // Until the list loads, show the one vendor the grid row knows.
    const list = cached ?? [
      {
        assignment_id: line.assignment_id,
        vendor_id: line.vendor_id,
        company: line.vendor,
        is_primary: line.is_primary,
        completed_steps: line.completed_steps,
        is_sourced: line.is_sourced,
      },
    ];
    return list
      .filter((v) => v.assignment_status_category !== "closed")
      .sort((a, b) => a.assignment_id - b.assignment_id);
  }, [line, lineVendors, csId]);

  const primary = live.find((v) => v.is_primary) ?? null;
  const backups = live.filter((v) => !v.is_primary);

  /* ── Rates ────────────────────────────────────────────────────────── */
  const rateAssignment = (() => {
    const pick = rateFor[csId];
    if (pick && live.some((v) => v.assignment_id === pick)) return pick;
    return primary?.assignment_id ?? line?.assignment_id ?? null;
  })();
  const rateKey = rateAssignment ? svcKey(csId, rateAssignment) : null;

  useEffect(() => {
    if (!rateKey || services[rateKey]) return;
    axios
      .get(`/api/sourcing/contract-sites/${csId}/services`, {
        params: { assignment_id: rateAssignment },
      })
      .then(({ data }) => setServices((s) => ({ ...s, [rateKey]: data })))
      .catch((e) => console.error("Error fetching contract site services:", e));
  }, [rateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRate = async (assignmentId, service, value) => {
    if (!assignmentId) return;
    const vendor_price = value === "" ? null : Number(value);
    try {
      const { data } = await axios.put(
        `/api/sourcing/assignments/${assignmentId}/pricing`,
        {
          prices: [{ contract_site_service_id: service.id, vendor_price }],
          user_id: userId,
        },
      );
      if (data?.rows) onRowsChanged(data.rows);
      if (line) loadLineVendors(line); // each vendor's x/7 depends on rates
    } catch (e) {
      console.error("Error saving rate:", e);
      setActionError(errMsg(e, "Couldn't save that rate."));
    }
  };

  const setLocalRate = (key, serviceId, value) =>
    setServices((s) => ({
      ...s,
      [key]: s[key].map((x) =>
        x.id === serviceId ? { ...x, vendor_price: value } : x,
      ),
    }));

  /* ── Vendor picker ────────────────────────────────────────────────── */
  const canMatchLines = useMemo(
    () => Boolean(vendors?.some((v) => v.service_line_ids?.length)),
    [vendors],
  );
  const searching = search.trim().length > 0;

  const candidates = useMemo(() => {
    if (!vendors || !line || !pickerFor) return [];
    const term = search.trim().toLowerCase();
    // Vendors already live on this line can't be added again.
    const onLine = new Set(live.map((v) => v.vendor_id));

    return vendors
      .filter((v) => !onLine.has(v.id))
      .map((v) => ({
        v,
        mi: milesBetween({ lat: line.site_lat, lng: line.site_lng }, v),
        covers:
          !canMatchLines || v.service_line_ids.includes(line.service_line_id),
      }))
      .filter((c) => {
        if (term) {
          const hay =
            `${c.v.company} ${c.v.contact_name ?? ""} ${c.v.city ?? ""} ${c.v.state ?? ""}`.toLowerCase();
          return hay.includes(term);
        }
        // A search deliberately ignores the radius — that's how you reach a
        // national provider headquartered three states away.
        if (!c.covers) return false;
        if (radius == null) return true;
        return c.mi == null || c.mi <= radius;
      })
      .sort((a, b) => (a.mi ?? 1e9) - (b.mi ?? 1e9))
      .slice(0, searching ? 40 : 200);
  }, [
    vendors,
    line,
    pickerFor,
    live,
    canMatchLines,
    radius,
    search,
    searching,
  ]);

  const startPicking = (p) => {
    setPicking(p);
    setSearch("");
    setActionError(null);
  };

  const afterWrite = (data) => {
    onRowsChanged(data.rows);
    invalidateAssignableVendors();
    setPicking(null);
    setConfirm(null);
    setSearch("");
    // Rates for this line need re-reading.
    setServices((s) => {
      const next = { ...s };
      Object.keys(next)
        .filter((k) => k.startsWith(`${csId}:`))
        .forEach((k) => delete next[k]);
      return next;
    });
  };

  const doPick = async (vendor) => {
    if (!line || !pickerFor) return;
    setBusy(true);
    setActionError(null);
    try {
      let data;
      if (pickerFor.kind === "replace") {
        ({ data } = await axios.post(
          `/api/sourcing/assignments/${pickerFor.vendor.assignment_id}/replace`,
          { vendor_id: vendor.id, user_id: userId },
        ));
      } else {
        ({ data } = await axios.post("/api/sourcing/assignments", {
          vendor_id: vendor.id,
          contract_site_ids: [csId],
          mode: pickerFor.kind === "backup" ? "add" : "skip",
          user_id: userId,
        }));
        const skipped = data.summary?.skipped ?? [];
        if (skipped.length) setActionError(`Not added: ${skipped[0].reason}.`);
      }
      afterWrite(data);
    } catch (e) {
      console.error("Error assigning vendor:", e);
      setActionError(errMsg(e, "Couldn't save that change."));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (vendor) => {
    // Replacing confirms; adding never removes anyone, so it doesn't need to.
    if (pickerFor?.kind === "replace")
      setConfirm({ newVendor: vendor, oldVendor: pickerFor.vendor });
    else doPick(vendor);
  };

  const makePrimary = async (v) => {
    setPromoting(v.assignment_id);
    setActionError(null);
    try {
      const { data } = await axios.put(
        `/api/sourcing/assignments/${v.assignment_id}/primary`,
        { user_id: userId },
      );
      // Reloads that started while this was saving may hold older data.
      nextLineRequest(csId);
      onRowsChanged(data.rows);
      const updated = data.rows?.find((x) => x.contract_site_id === csId);
      if (updated && data.vendors)
        setLineVendors((s) => ({
          ...s,
          [csId]: { sig: lineSig(updated), list: data.vendors },
        }));
      else if (updated) loadLineVendors(updated);
      setRateFor((s) => {
        const next = { ...s };
        delete next[csId]; // rates follow the new primary
        return next;
      });
      setJustChanged(v.assignment_id);
      setTimeout(
        () => setJustChanged((id) => (id === v.assignment_id ? null : id)),
        1800,
      );
    } catch (e) {
      console.error("Error setting primary vendor:", e);
      setActionError(errMsg(e, "Couldn't change the primary vendor."));
    } finally {
      setPromoting(null);
    }
  };

  const handleCreateVendor = async (payload) => {
    setCreating(true);
    try {
      const { data } = await axios.post("/api/vendors", payload);
      refreshVendors();
      setMode("lines");
      // Drop the new vendor at the top of the list regardless of distance.
      setSearch(data?.company ?? payload.company ?? "");
    } catch (e) {
      console.error("Error creating vendor:", e);
    } finally {
      setCreating(false);
    }
  };

  if (!row || !line) return null;

  /* ── Create-vendor mode ─────────────────────────────────────────────── */
  if (mode === "create") {
    return (
      <SlideOutPanel
        open={open}
        onClose={onClose}
        width={PANEL_WIDTH}
        title="New Vendor"
        subtitle={`They'll be available to assign at ${row.site} straight away`}
      >
        <Button
          size="small"
          startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
          onClick={() => setMode("lines")}
          sx={{ mb: 1 }}
        >
          Back to {line.service_line}
        </Button>
        <Box sx={{ mx: -3 }}>
          <VendorForm
            onSubmit={handleCreateVendor}
            onClose={() => setMode("lines")}
            submitting={creating}
          />
        </Box>
      </SlideOutPanel>
    );
  }

  /* ── Picker heading: says exactly what clicking a vendor will do ───── */
  const pickerHeading =
    pickerFor?.kind === "replace"
      ? {
          title: `Pick a replacement for ${pickerFor.vendor.company}`,
          detail: pickerFor.vendor.is_primary
            ? "They'll become the primary vendor."
            : "They'll become a backup vendor.",
          button: "Replace",
        }
      : pickerFor?.kind === "backup"
        ? {
            title: `Pick a backup vendor for ${line.service_line}`,
            detail: primary
              ? `${primary.company} stays primary.`
              : "They'll be added as a backup.",
            button: "Add as backup",
          }
        : {
            title: `No vendor on ${line.service_line} yet`,
            detail: "Pick one to assign them as the primary vendor.",
            button: "Assign",
          };

  const rateServices = rateKey ? services[rateKey] : null;
  const rateVendor = live.find((v) => v.assignment_id === rateAssignment);
  // Document and progress details come from the vendors view; until it
  // loads, don't guess (an empty row would read as "missing everything").
  const listLoaded = Boolean(lineVendors[csId]?.list);
  const step = nextStep(line, primary, backups);

  return (
    <>
      <SlideOutPanel
        open={open}
        onClose={onClose}
        width={PANEL_WIDTH}
        title={row.site}
        subtitle={[row.client, row.city].filter(Boolean).join(" · ")}
      >
        {/* ── One tab per service line ─────────────────────────────── */}
        <Tabs
          value={csId}
          onChange={(_, id) => switchLine(id)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2.5, borderBottom: 1, borderColor: "divider" }}
        >
          {siteRows.map((r) => {
            const flag = !r.vendor_id
              ? { color: "error.main", tip: "No vendor yet" }
              : !r.is_primary
                ? { color: "warning.main", tip: "No primary vendor" }
                : null;
            return (
              <Tab
                key={r.contract_site_id}
                value={r.contract_site_id}
                sx={{ textTransform: "none", minHeight: 48, px: 1.5 }}
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <LineIcon name={r.service_line} size={22} />
                    <span>{r.service_line}</span>
                    {flag && (
                      <Tooltip title={flag.tip} arrow>
                        <Box
                          component="span"
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            bgcolor: flag.color,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {actionError && (
          <Alert
            severity="error"
            onClose={() => setActionError(null)}
            sx={{ mb: 2 }}
          >
            {actionError}
          </Alert>
        )}

        {pickerFor ? (
          /* ── Picking a vendor ─────────────────────────────────────── */
          <Box>
            {picking && (
              <Button
                size="small"
                color="inherit"
                startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                onClick={() => setPicking(null)}
                sx={{ mb: 1, ml: -0.5 }}
              >
                Back to {line.service_line}
              </Button>
            )}

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <LineIcon name={line.service_line} size={40} />
              <Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>
                  {pickerHeading.title}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  {pickerHeading.detail}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all vendors by name, contact, or city…"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => setMode("create")}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                New vendor
              </Button>
            </Stack>

            {searching ? (
              <Typography
                sx={{ mb: 1.5, fontSize: "0.72rem", color: "text.secondary" }}
              >
                Searching every vendor — distance filter off.
              </Typography>
            ) : (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={radius ?? "any"}
                onChange={(_, v) =>
                  v !== null && setRadius(v === "any" ? null : v)
                }
                sx={{ mb: 1.5 }}
              >
                {RADII.map((r) => (
                  <ToggleButton
                    key={String(r)}
                    value={r ?? "any"}
                    sx={{ px: 1.25 }}
                  >
                    {r ? `${r} mi` : "Any"}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}

            {vendorsError && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                {vendorsError} This isn't a coverage problem — the vendor list
                didn't load.
              </Alert>
            )}

            {vendors === null && <CircularProgress size={20} />}

            {vendors !== null && !vendorsError && candidates.length === 0 && (
              <Box
                sx={(t) => ({
                  p: 1.5,
                  borderLeft: 3,
                  borderColor: "warning.main",
                  bgcolor: alpha(
                    t.palette.warning.main,
                    t.palette.mode === "dark" ? 0.14 : 0.08,
                  ),
                })}
              >
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "warning.main",
                  }}
                >
                  {searching
                    ? `No vendor matches "${search.trim()}".`
                    : `Nothing within ${radius} miles.`}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                >
                  {searching
                    ? "Check the spelling, or add them as a new vendor."
                    : "Widen the radius, search by name to reach a vendor further out, or add a new one."}
                </Typography>
              </Box>
            )}

            {candidates.map(({ v, mi }) => (
              <Box
                key={v.id}
                sx={{
                  py: 1.25,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    {v.company}
                  </Typography>
                  {!canMatchLines && v.trades?.length > 0 && (
                    <Typography
                      sx={{
                        mt: 0.25,
                        fontSize: "0.72rem",
                        color: "text.secondary",
                      }}
                    >
                      {v.trades.join(" · ")}
                    </Typography>
                  )}
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mt: 0.5 }}
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        fontVariantNumeric: "tabular-nums",
                        color:
                          mi != null && mi > 100
                            ? "warning.main"
                            : "text.secondary",
                        fontWeight: mi != null && mi > 100 ? 600 : 400,
                      }}
                    >
                      {mi == null ? "no coordinates" : `${mi.toFixed(1)} mi`}
                    </Typography>
                    <Tooltip title="W-9 · COI · MSA · ACH" arrow>
                      <Stack direction="row" spacing={0.4}>
                        <DocDot value={v.compliance?.w9} />
                        <DocDot value={v.compliance?.coi} />
                        <DocDot value={v.compliance?.msa} />
                        <DocDot value={v.compliance?.ach} />
                      </Stack>
                    </Tooltip>
                    <Typography
                      sx={{ fontSize: "0.72rem", color: "text.secondary" }}
                    >
                      {v.contact_name}
                    </Typography>
                    {v.assignment_count > 0 && (
                      <Typography
                        sx={{ fontSize: "0.72rem", color: "text.secondary" }}
                      >
                        on {v.assignment_count} site
                        {v.assignment_count === 1 ? "" : "s"}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Button
                  variant="contained"
                  color={pickerFor.kind === "replace" ? "warning" : "primary"}
                  size="small"
                  disabled={busy}
                  onClick={() => handlePick(v)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {pickerHeading.button}
                </Button>
              </Box>
            ))}
          </Box>
        ) : (
          /* ── The line's vendors and rates ─────────────────────────── */
          <Stack spacing={2.5}>
            {/* Line header */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LineIcon name={line.service_line} size={40} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {line.service_line}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {live.length} vendor{live.length === 1 ? "" : "s"}
                </Typography>
              </Box>
            </Stack>
            {/* Next step — where the eye lands */}
            {listLoaded && (
              <Alert
                severity={step.tone}
                icon={step.tone === "success" ? <CheckIcon /> : undefined}
                action={
                  step.action === "rates" ? (
                    <Button
                      color="inherit"
                      size="small"
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                      onClick={() =>
                        ratesRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                      }
                    >
                      Rates
                    </Button>
                  ) : undefined
                }
              >
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  Next: {step.title}
                </Typography>
                <Typography sx={{ fontSize: "0.8rem" }}>{step.body}</Typography>
              </Alert>
            )}

            {/* Vendors — one row each; the primary's row is tinted blue */}
            <Box>
              <SectionTitle
                action={
                  <Button
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                    onClick={() => startPicking({ kind: "backup" })}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Add backup
                  </Button>
                }
              >
                Vendors
              </SectionTitle>
              <Stack spacing={1}>
                {[...(primary ? [primary] : []), ...backups].map((v) => (
                  <VendorRow
                    key={v.assignment_id}
                    v={v}
                    loaded={listLoaded}
                    flash={justChanged === v.assignment_id}
                    noPrimary={!primary}
                    promoting={promoting}
                    onMakePrimary={() => makePrimary(v)}
                    onReplace={() =>
                      startPicking({ kind: "replace", vendor: v })
                    }
                  />
                ))}
              </Stack>
              {!backups.length && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", color: "text.secondary", mt: 0.75 }}
                >
                  No backups yet. A backup can step in if the primary can't do
                  the work.
                </Typography>
              )}
            </Box>
            {/* Rates */}
            <Box ref={ratesRef} sx={{ scrollMarginTop: 16 }}>
              <SectionTitle>Rates</SectionTitle>
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ mt: -0.5, mb: 1 }}
              >
                <Typography
                  sx={{ fontSize: "0.8rem", color: "text.secondary" }}
                >
                  for
                </Typography>
                {live.length > 1 ? (
                  <TextField
                    select
                    size="small"
                    variant="standard"
                    value={rateAssignment ?? ""}
                    onChange={(e) =>
                      setRateFor((s) => ({
                        ...s,
                        [csId]: Number(e.target.value),
                      }))
                    }
                    InputProps={{ disableUnderline: true }}
                    sx={{
                      "& .MuiSelect-select": {
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        py: 0,
                      },
                    }}
                  >
                    {live.map((v) => (
                      <MenuItem key={v.assignment_id} value={v.assignment_id}>
                        {v.company}
                        {v.is_primary ? " (primary)" : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    {rateVendor?.company ?? line.vendor}
                  </Typography>
                )}
              </Stack>

              <Paper variant="outlined" sx={{ px: 1.75, py: 1 }}>
                {rateServices == null && <CircularProgress size={18} />}
                {rateServices?.length === 0 && (
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "text.secondary",
                      py: 0.5,
                    }}
                  >
                    No services are set up on {line.service_line} for this site,
                    so there's nothing to price yet.
                  </Typography>
                )}
                {rateServices?.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      pb: 0.5,
                      borderBottom: 1,
                      borderColor: "divider",
                      "& > *": {
                        fontSize: "0.68rem !important",
                        color: "text.secondary",
                        fontWeight: 600,
                      },
                    }}
                  >
                    <Typography sx={{ flex: 1 }}>Service</Typography>
                    <Typography sx={{ width: 76, textAlign: "right" }}>
                      Client
                    </Typography>
                    <Typography sx={{ width: 96, textAlign: "right" }}>
                      Vendor
                    </Typography>
                    <Typography sx={{ width: 104, textAlign: "right" }}>
                      Margin
                    </Typography>
                  </Stack>
                )}
                {(rateServices ?? []).map((svc, i) => {
                  const vp =
                    svc.vendor_price === "" || svc.vendor_price == null
                      ? null
                      : Number(svc.vendor_price);
                  const margin = vp == null ? null : svc.client_price - vp;
                  const pct =
                    margin == null || !svc.client_price
                      ? null
                      : Math.round((margin / svc.client_price) * 100);
                  const marginColor =
                    margin == null
                      ? "text.secondary"
                      : margin < 0
                        ? "error.main"
                        : pct < 20
                          ? "warning.main"
                          : "success.main";

                  return (
                    <Stack
                      key={svc.id}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        py: 0.75,
                        borderTop: i ? 1 : 0,
                        borderColor: "divider",
                      }}
                    >
                      <Typography sx={{ flex: 1, fontSize: "0.82rem" }}>
                        {svc.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: "text.secondary",
                          width: 76,
                          textAlign: "right",
                        }}
                      >
                        {money(svc.client_price)}
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="—"
                        value={svc.vendor_price ?? ""}
                        onChange={(e) =>
                          setLocalRate(rateKey, svc.id, e.target.value)
                        }
                        onBlur={(e) =>
                          saveRate(rateAssignment, svc, e.target.value)
                        }
                        inputProps={{
                          style: {
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          },
                        }}
                        sx={{ width: 96 }}
                      />
                      <Typography
                        sx={{
                          width: 104,
                          textAlign: "right",
                          fontSize: "0.78rem",
                          color: marginColor,
                          fontWeight: margin == null ? 400 : 600,
                        }}
                      >
                        {margin == null ? "—" : `${money(margin)} · ${pct}%`}
                      </Typography>
                    </Stack>
                  );
                })}
              </Paper>
            </Box>
          </Stack>
        )}
      </SlideOutPanel>

      {/* Replace confirmation */}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
        >
          Replace vendor?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", mb: 2 }}>
            On <strong>{line.service_line}</strong> at{" "}
            <strong>{row.site}</strong>:
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontSize: "0.85rem",
                textDecoration: "line-through",
                color: "text.secondary",
              }}
            >
              {confirm?.oldVendor?.company}
            </Typography>
            <Typography sx={{ fontSize: "0.95rem", fontWeight: 700 }}>
              {confirm?.newVendor?.company}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {confirm?.newVendor?.company} becomes{" "}
            {confirm?.oldVendor?.is_primary
              ? "the primary vendor"
              : "a backup vendor"}
            . {confirm?.oldVendor?.company}'s assignment is marked terminated,
            not deleted — their rates and exhibits stay on the record.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setConfirm(null)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={busy}
            onClick={() => doPick(confirm.newVendor)}
          >
            Replace vendor
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
