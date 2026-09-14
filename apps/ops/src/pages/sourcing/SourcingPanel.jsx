import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  Stack,
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

  const [mode, setMode] = useState("assign"); // assign | create
  const [selected, setSelected] = useState([]); // contract_site_ids, unassigned lines only
  const [replacing, setReplacing] = useState(null); // the assignment row being replaced
  const [confirm, setConfirm] = useState(null); // { vendor, targets, replacingRow }
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState(20);
  const [services, setServices] = useState({});
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset everything when the panel opens on a different site.
  useEffect(() => {
    if (!row) return;
    setMode("assign");
    setSelected(row.vendor_id ? [] : [row.contract_site_id]);
    setReplacing(null);
    setConfirm(null);
    setSearch("");
    setRadius(20);
  }, [row?.contract_site_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Service catalogue + existing rates, per line that has an assignment.
  useEffect(() => {
    siteRows
      .filter((r) => r.assignment_id)
      .forEach((r) => {
        if (services[r.contract_site_id]) return;
        axios
          .get(`/api/sourcing/contract-sites/${r.contract_site_id}/services`)
          .then(({ data }) =>
            setServices((s) => ({ ...s, [r.contract_site_id]: data })),
          )
          .catch((e) =>
            console.error("Error fetching contract site services:", e),
          );
      });
  }, [siteRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const assignedRows = siteRows.filter((r) => r.vendor_id);
  const unassignedRows = siteRows.filter((r) => !r.vendor_id);

  // What the next Assign click will act on. Replacing always wins and is
  // always exactly one line, so the two modes can't blur together.
  const targets = useMemo(() => {
    if (replacing) return [replacing];
    return unassignedRows.filter((r) => selected.includes(r.contract_site_id));
  }, [replacing, unassignedRows, selected]);

  const targetLabel = targets.map((t) => t.service_line).join(" + ");

  const canMatchLines = useMemo(
    () => Boolean(vendors?.some((v) => v.service_line_ids?.length)),
    [vendors],
  );

  const searching = search.trim().length > 0;

  const candidates = useMemo(() => {
    if (!vendors || !row || !targets.length) return [];
    const term = search.trim().toLowerCase();
    const wanted = targets.map((t) => t.service_line_id);

    return vendors
      .map((v) => {
        const covered = canMatchLines
          ? targets
              .filter((t) => v.service_line_ids.includes(t.service_line_id))
              .map((t) => t.service_line)
          : [];
        return {
          v,
          mi: milesBetween({ lat: row.site_lat, lng: row.site_lng }, v),
          covered,
          all:
            canMatchLines &&
            covered.length === wanted.length &&
            wanted.length > 0,
        };
      })
      .filter((c) => {
        if (term) {
          const hay =
            `${c.v.company} ${c.v.contact_name ?? ""} ${c.v.city ?? ""} ${c.v.state ?? ""}`.toLowerCase();
          return hay.includes(term);
        }
        // A search deliberately ignores the radius — that's how you reach a
        // national provider headquartered three states away.
        if (canMatchLines && c.covered.length === 0) return false;
        if (radius == null) return true;
        return c.mi == null || c.mi <= radius;
      })
      .sort(
        (a, b) =>
          Number(b.all) - Number(a.all) || (a.mi ?? 1e9) - (b.mi ?? 1e9),
      )
      .slice(0, searching ? 40 : 200);
  }, [vendors, row, targets, canMatchLines, radius, search, searching]);

  const toggleLine = (csId) =>
    setSelected((s) =>
      s.includes(csId) ? s.filter((x) => x !== csId) : [...s, csId],
    );

  const startReplace = (assignedRow) => {
    setReplacing(assignedRow);
    setSelected([]);
    setSearch("");
  };

  const cancelReplace = () => setReplacing(null);

  const doAssign = async (vendor) => {
    setBusy(true);
    try {
      let data;
      if (replacing) {
        ({ data } = await axios.post(
          `/api/sourcing/assignments/${replacing.assignment_id}/replace`,
          {
            vendor_id: vendor.id,
            user_id: userId,
          },
        ));
      } else {
        ({ data } = await axios.post("/api/sourcing/assignments", {
          vendor_id: vendor.id,
          contract_site_ids: targets.map((t) => t.contract_site_id),
          user_id: userId,
        }));
      }
      onRowsChanged(data.rows);
      invalidateAssignableVendors();
      // Assigned lines drop out of the selection, so the next vendor you pick
      // can't silently land on a line you already finished.
      setSelected([]);
      setReplacing(null);
      setConfirm(null);
      setSearch("");
      // Rates for the affected lines need re-reading.
      setServices((s) => {
        const next = { ...s };
        targets.forEach((t) => delete next[t.contract_site_id]);
        return next;
      });
    } catch (e) {
      console.error("Error assigning vendor:", e);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAssignClick = (vendor) => {
    // Replacing always confirms. A plain assign onto an empty line doesn't
    // need a dialog — the button already names every line it will touch.
    if (replacing) setConfirm({ vendor, targets, replacingRow: replacing });
    else doAssign(vendor);
  };

  const handleCreateVendor = async (payload) => {
    setCreating(true);
    try {
      const { data } = await axios.post("/api/vendors", payload);
      refreshVendors();
      setMode("assign");
      // Drop the new vendor at the top of the list regardless of distance.
      setSearch(data?.company ?? payload.company ?? "");
    } catch (e) {
      console.error("Error creating vendor:", e);
    } finally {
      setCreating(false);
    }
  };

  const saveRate = async (csId, service, value) => {
    const r = siteRows.find((x) => x.contract_site_id === csId);
    if (!r?.assignment_id) return;
    const vendor_price = value === "" ? null : Number(value);
    try {
      const { data } = await axios.put(
        `/api/sourcing/assignments/${r.assignment_id}/pricing`,
        {
          prices: [{ contract_site_service_id: service.id, vendor_price }],
          user_id: userId,
        },
      );
      if (data?.rows) onRowsChanged(data.rows);
    } catch (e) {
      console.error("Error saving rate:", e);
    }
  };

  const setLocalRate = (csId, serviceId, value) =>
    setServices((s) => ({
      ...s,
      [csId]: s[csId].map((x) =>
        x.id === serviceId ? { ...x, vendor_price: value } : x,
      ),
    }));

  if (!row) return null;

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
          onClick={() => setMode("assign")}
          sx={{ mb: 1 }}
        >
          Back to sourcing
        </Button>
        <Box sx={{ mx: -3 }}>
          <VendorForm
            onSubmit={handleCreateVendor}
            onClose={() => setMode("assign")}
            submitting={creating}
          />
        </Box>
      </SlideOutPanel>
    );
  }

  /* ── Assign mode ────────────────────────────────────────────────────── */
  return (
    <>
      <SlideOutPanel
        open={open}
        onClose={onClose}
        width={PANEL_WIDTH}
        title={row.site}
        subtitle={[row.client, row.city].filter(Boolean).join(" · ")}
      >
        {/* Service lines — assigned ones show their vendor and a Replace
            button; only unassigned ones can be checked for a new assignment. */}
        <Box>
          <Eyebrow sx={{ mb: 1 }}>Service lines at this site</Eyebrow>

          {siteRows.map((r) => {
            const isAssigned = Boolean(r.vendor_id);
            const isReplacing =
              replacing?.contract_site_id === r.contract_site_id;
            const isChecked = selected.includes(r.contract_site_id);

            return (
              <Stack
                key={r.contract_site_id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={(t) => ({
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: isReplacing
                    ? alpha(
                        t.palette.warning.main,
                        t.palette.mode === "dark" ? 0.16 : 0.09,
                      )
                    : "transparent",
                })}
              >
                {!isAssigned ? (
                  <Checkbox
                    size="small"
                    checked={isChecked}
                    onChange={() => toggleLine(r.contract_site_id)}
                    disabled={Boolean(replacing)}
                    sx={{ p: 0.5 }}
                  />
                ) : (
                  <Box sx={{ width: 30 }} />
                )}

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {r.service_line}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: isAssigned ? "text.secondary" : "error.main",
                      fontStyle: isAssigned ? "normal" : "italic",
                    }}
                  >
                    {isAssigned ? r.vendor : "not assigned"}
                  </Typography>
                </Box>

                {isAssigned &&
                  (isReplacing ? (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={cancelReplace}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SwapHorizIcon sx={{ fontSize: 15 }} />}
                      onClick={() => startReplace(r)}
                      disabled={Boolean(replacing)}
                    >
                      Replace
                    </Button>
                  ))}
              </Stack>
            );
          })}
        </Box>

        {/* What the next assign will do — stated in words, every time. */}
        {replacing ? (
          <Alert
            severity="warning"
            icon={<SwapHorizIcon fontSize="small" />}
            sx={{ mt: 2 }}
          >
            Replacing <strong>{replacing.vendor}</strong> on{" "}
            <strong>{replacing.service_line}</strong>. Pick the new vendor
            below.
          </Alert>
        ) : targets.length > 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Assigning to <strong>{targetLabel}</strong>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            Tick a service line above, or hit Replace on one that already has a
            vendor.
          </Alert>
        )}

        {/* Vendor picker */}
        {targets.length > 0 && (
          <Box sx={{ pt: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Eyebrow>Choose a vendor</Eyebrow>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={() => setMode("create")}
              >
                New vendor
              </Button>
            </Stack>

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
              sx={{ mb: 1 }}
            />

            {searching ? (
              <Typography
                sx={{ mb: 1.5, fontSize: "0.72rem", color: "text.secondary" }}
              >
                Searching every vendor — distance filter off.
              </Typography>
            ) : (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mb: 1.5 }}
                useFlexGap
                flexWrap="wrap"
              >
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={radius}
                  onChange={(_, v) =>
                    v !== null && setRadius(v === "any" ? null : v)
                  }
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
              </Stack>
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

            {candidates.map(({ v, mi, covered, all }) => (
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
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {v.company}
                    </Typography>
                    {canMatchLines && all && targets.length > 1 && (
                      <Chip
                        label={`Covers all ${targets.length}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    {canMatchLines && !all && (
                      <Chip
                        label={`${covered.join(", ")} only`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>

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
                  color={replacing ? "warning" : "primary"}
                  size="small"
                  disabled={busy}
                  onClick={() => handleAssignClick(v)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {replacing
                    ? "Replace"
                    : targets.length > 1
                      ? `Assign to ${targets.length}`
                      : "Assign"}
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {/* Rates, per assigned line */}
        {assignedRows.length > 0 && (
          <Box sx={{ pt: 3 }}>
            <Eyebrow sx={{ mb: 1 }}>Scope &amp; rates</Eyebrow>

            {assignedRows.map((r) => (
              <Box key={r.contract_site_id} sx={{ pt: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    {r.service_line}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                  >
                    {r.vendor}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />

                {(services[r.contract_site_id] ?? []).map((svc) => {
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
                          setLocalRate(
                            r.contract_site_id,
                            svc.id,
                            e.target.value,
                          )
                        }
                        onBlur={(e) =>
                          saveRate(r.contract_site_id, svc, e.target.value)
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
            ))}
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
            On <strong>{confirm?.replacingRow?.service_line}</strong> at{" "}
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
              {confirm?.replacingRow?.vendor}
            </Typography>
            <Typography sx={{ fontSize: "0.95rem", fontWeight: 700 }}>
              {confirm?.vendor?.company}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            The previous assignment is marked terminated, not deleted — its
            rates and exhibits stay on the record. The new vendor starts with no
            rates entered.
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
            onClick={() => doAssign(confirm.vendor)}
          >
            Replace vendor
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
