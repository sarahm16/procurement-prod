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
  Divider,
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
import { alpha } from "@mui/material/styles";

import {
  useAssignableVendors,
  milesBetween,
  invalidateAssignableVendors,
} from "./useSourcing";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";
import VendorForm from "../vendors/CreateVendorForm";

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

const Eyebrow = ({ children, sx }) => (
  <Typography
    variant="overline"
    sx={{
      display: "block",
      color: "text.secondary",
      fontSize: "0.62rem",
      ...sx,
    }}
  >
    {children}
  </Typography>
);

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

/** W-9 · COI · MSA · ACH with labels, for a vendor row from the vendors view. */
function DocsStrip({ v }) {
  const docs = [
    ["W-9", v.has_w9],
    ["COI", coiOf(v)],
    ["MSA", v.has_msa],
    ["ACH", v.has_ach],
  ];
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {docs.map(([label, value]) => (
        <Stack key={label} direction="row" spacing={0.4} alignItems="center">
          <DocDot value={value} />
          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
            {label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function Progress({ v }) {
  return v.is_sourced ? (
    <Chip
      label="Sourced"
      size="small"
      color="success"
      variant="outlined"
      sx={{ height: 20, fontSize: "0.68rem" }}
    />
  ) : (
    <Tooltip title="Steps done out of 7" arrow>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {v.completed_steps ?? 0}/7
      </Typography>
    </Tooltip>
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
                sx={{ textTransform: "none", minHeight: 44 }}
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
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

            <Typography sx={{ fontSize: "1rem", fontWeight: 700 }}>
              {pickerHeading.title}
            </Typography>
            <Typography
              sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 2 }}
            >
              {pickerHeading.detail}
            </Typography>

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
          <Box>
            <Eyebrow sx={{ mb: 0.75 }}>Primary vendor</Eyebrow>
            {primary ? (
              <Paper
                variant="outlined"
                sx={(t) => ({
                  p: 1.75,
                  mb: 3,
                  transition: "background-color .6s ease",
                  bgcolor:
                    justChanged === primary.assignment_id
                      ? alpha(
                          t.palette.success.main,
                          t.palette.mode === "dark" ? 0.2 : 0.12,
                        )
                      : "background.paper",
                })}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <StarIcon sx={{ fontSize: 16, color: "warning.main" }} />
                  <Typography
                    sx={{ fontWeight: 700, fontSize: "0.95rem", flex: 1 }}
                  >
                    {primary.company}
                  </Typography>
                  <Progress v={primary} />
                </Stack>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 1.25, pl: 3 }}
                >
                  <DocsStrip v={primary} />
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<SwapHorizIcon sx={{ fontSize: 15 }} />}
                    onClick={() =>
                      startPicking({ kind: "replace", vendor: primary })
                    }
                  >
                    Replace
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No primary vendor on {line.service_line}. Choose{" "}
                <strong>Make primary</strong> on one of the backups below.
              </Alert>
            )}

            <Eyebrow sx={{ mb: 0.25 }}>
              Backup vendors{backups.length ? ` (${backups.length})` : ""}
            </Eyebrow>
            {backups.length === 0 && (
              <Typography
                sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1 }}
              >
                None yet. A backup can step in if the primary can't do the work.
              </Typography>
            )}
            {backups.map((v) => (
              <Box
                key={v.assignment_id}
                sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography
                    sx={{ fontSize: "0.85rem", fontWeight: 600, flex: 1 }}
                  >
                    {v.company}
                  </Typography>
                  <Progress v={v} />
                </Stack>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mt: 0.75 }}
                >
                  <DocsStrip v={v} />
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<StarIcon sx={{ fontSize: 14 }} />}
                      onClick={() => makePrimary(v)}
                      disabled={promoting != null}
                    >
                      {promoting === v.assignment_id
                        ? "Saving…"
                        : "Make primary"}
                    </Button>
                    <Tooltip title={`Replace ${v.company}`} arrow>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() =>
                          startPicking({ kind: "replace", vendor: v })
                        }
                        sx={{ minWidth: 0, px: 1 }}
                      >
                        <SwapHorizIcon sx={{ fontSize: 16 }} />
                      </Button>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => startPicking({ kind: "backup" })}
              sx={{ mt: 1, ml: -0.5 }}
            >
              Add a backup vendor
            </Button>

            {/* ── Rates ─────────────────────────────────────────────── */}
            <Divider sx={{ my: 3 }} />
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Eyebrow>
                Rates{rateVendor ? ` · ${rateVendor.company}` : ""}
              </Eyebrow>
              {live.length > 1 && (
                <TextField
                  select
                  size="small"
                  label="Show rates for"
                  value={rateAssignment ?? ""}
                  onChange={(e) =>
                    setRateFor((s) => ({
                      ...s,
                      [csId]: Number(e.target.value),
                    }))
                  }
                  sx={{ minWidth: 200 }}
                >
                  {live.map((v) => (
                    <MenuItem key={v.assignment_id} value={v.assignment_id}>
                      {v.company}
                      {v.is_primary ? " (primary)" : ""}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>

            {rateServices == null && <CircularProgress size={18} />}
            {rateServices?.length === 0 && (
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                No services are set up on {line.service_line} for this site, so
                there's nothing to price yet.
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
                  "& > *": { fontSize: "0.65rem", color: "text.secondary" },
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
            {(rateServices ?? []).map((svc) => {
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
                  sx={{ py: 0.75, borderBottom: 1, borderColor: "divider" }}
                >
                  <Typography sx={{ flex: 1, fontSize: "0.8rem" }}>
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
          </Box>
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
