import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import { alpha } from "@mui/material/styles";

import {
  useAssignableVendors,
  milesBetween,
  invalidateAssignableVendors,
} from "./useSourcing";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";

// VendorContractSites.status_id is required. Replace with the real "Sourcing"
// status id once VendorSiteStatuses is settled.
const DEFAULT_ASSIGNMENT_STATUS_ID = 1;

// Wider than the 480 default — the rates rows need client price, an input,
// and margin side by side without wrapping.
const PANEL_WIDTH = 560;

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
  const vendors = useAssignableVendors();

  const [selected, setSelected] = useState([]);
  const [radius, setRadius] = useState(20);
  const [coversAll, setCoversAll] = useState(false);
  const [services, setServices] = useState({}); // contract_site_id -> [{ id, name, client_price, vendor_price }]
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) setSelected([row.contract_site_id]);
  }, [row?.contract_site_id]);

  // Load the service catalogue + any rates already entered, per selected line.
  useEffect(() => {
    selected.forEach((csId) => {
      if (services[csId]) return;
      axios
        .get(`/api/sourcing/contract-sites/${csId}/services`)
        .then(({ data }) => setServices((s) => ({ ...s, [csId]: data })))
        .catch((e) =>
          console.error("Error fetching contract site services:", e),
        );
    });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRows = useMemo(
    () => siteRows.filter((r) => selected.includes(r.contract_site_id)),
    [siteRows, selected],
  );

  const selectedLineNames = selectedRows.map((r) => r.service_line);
  const selectedLineIds = selectedRows.map((r) => r.service_line_id);

  // Trades and service lines don't share a vocabulary yet, so we can't tell
  // which vendors cover which line. Until Trades carry service_line_ids, the
  // picker shows every eligible vendor sorted by distance and displays trades
  // for the human to judge. Return `service_line_ids` from
  // /api/vendors/assignable and the coverage filter turns itself back on.
  const canMatchLines = useMemo(
    () => Boolean(vendors?.some((v) => v.service_line_ids?.length)),
    [vendors],
  );

  // One vendor across every selected line, or none — anything else means the
  // panel can't speak about "the" assignment.
  const assignedVendor = useMemo(() => {
    if (!selectedRows.length) return null;
    const names = selectedRows.map((r) => r.vendor);
    return names.every((n) => n && n === names[0]) ? names[0] : null;
  }, [selectedRows]);

  const candidates = useMemo(() => {
    if (!vendors || !row) return [];
    return vendors
      .map((v) => {
        const covered = canMatchLines
          ? selectedRows
              .filter((r) => v.service_line_ids.includes(r.service_line_id))
              .map((r) => r.service_line)
          : [];
        return {
          v,
          mi: milesBetween({ lat: row.site_lat, lng: row.site_lng }, v),
          covered,
          all:
            canMatchLines &&
            covered.length === selectedLineIds.length &&
            selectedLineIds.length > 0,
        };
      })
      .filter((c) => !canMatchLines || c.covered.length > 0)
      .filter((c) => c.mi == null || c.mi <= radius)
      .filter((c) => !coversAll || c.all)
      .sort(
        (a, b) =>
          Number(b.all) - Number(a.all) || (a.mi ?? 1e9) - (b.mi ?? 1e9),
      );
  }, [
    vendors,
    row,
    selectedRows,
    selectedLineIds,
    canMatchLines,
    radius,
    coversAll,
  ]);

  const toggleLine = (csId) =>
    setSelected((s) =>
      s.includes(csId) ? s.filter((x) => x !== csId) : [...s, csId],
    );

  const assign = async (vendorId) => {
    setBusy(true);
    try {
      const { data } = await axios.post("/api/sourcing/assignments", {
        vendor_id: vendorId,
        contract_site_ids: selected,
        status_id: DEFAULT_ASSIGNMENT_STATUS_ID,
        user_id: userId,
      });
      onRowsChanged(data.rows);
      invalidateAssignableVendors(); // assignment counts changed
    } catch (e) {
      console.error("Error assigning vendor:", e);
    } finally {
      setBusy(false);
    }
  };

  const saveRate = async (csId, service, value) => {
    const r = selectedRows.find((x) => x.contract_site_id === csId);
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

  return (
    <SlideOutPanel
      open={open}
      onClose={onClose}
      width={PANEL_WIDTH}
      title={row.site}
      subtitle={[row.client, row.city].filter(Boolean).join(" · ")}
    >
      {/* Which service lines this conversation covers */}
      <Box>
        <Eyebrow sx={{ mb: 1 }}>Sourcing for</Eyebrow>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {siteRows.map((r) => {
            const on = selected.includes(r.contract_site_id);
            return (
              <Chip
                key={r.contract_site_id}
                label={r.service_line}
                size="small"
                icon={on ? <CheckIcon sx={{ fontSize: 13 }} /> : undefined}
                variant={on ? "filled" : "outlined"}
                color={on ? "primary" : "default"}
                onClick={() => toggleLine(r.contract_site_id)}
              />
            );
          })}
        </Stack>
        {siteRows.length > 1 && (
          <Typography
            sx={{ mt: 1, fontSize: "0.75rem", color: "text.secondary" }}
          >
            Select more than one to source them in a single conversation.
          </Typography>
        )}
      </Box>

      {/* Assigned vendor, or the candidate list */}
      {assignedVendor ? (
        <Box sx={{ pt: 3 }}>
          <Eyebrow sx={{ mb: 1 }}>Assigned</Eyebrow>
          <Box
            sx={(t) => ({
              p: 1.5,
              borderLeft: 3,
              borderColor: "primary.main",
              bgcolor: alpha(
                t.palette.primary.main,
                t.palette.mode === "dark" ? 0.14 : 0.05,
              ),
            })}
          >
            <Typography sx={{ fontWeight: 600 }}>{assignedVendor}</Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              {selected.length} service line{selected.length === 1 ? "" : "s"}{" "}
              at this site
            </Typography>
          </Box>
          <Typography
            sx={{ mt: 1, fontSize: "0.72rem", color: "text.secondary" }}
          >
            Compliance is vendor-level — clearing a document here clears it on
            every site this vendor works.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ pt: 3 }}>
          <Eyebrow sx={{ mb: 1 }}>Eligible vendors</Eyebrow>

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
              onChange={(_, v) => v && setRadius(v)}
            >
              {[20, 50, 100].map((r) => (
                <ToggleButton key={r} value={r} sx={{ px: 1.25 }}>
                  {r} mi
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {canMatchLines && selected.length > 1 && (
              <Chip
                label={`Covers all ${selected.length}`}
                size="small"
                variant={coversAll ? "filled" : "outlined"}
                color={coversAll ? "primary" : "default"}
                onClick={() => setCoversAll((c) => !c)}
              />
            )}
          </Stack>

          {!canMatchLines && vendors !== null && (
            <Typography
              sx={{ mb: 1.5, fontSize: "0.72rem", color: "text.secondary" }}
            >
              Showing every eligible vendor by distance. Trades are listed for
              reference — they aren't linked to service lines yet.
            </Typography>
          )}

          {vendors === null && <CircularProgress size={20} />}

          {vendors !== null && candidates.length === 0 && (
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
                Nothing eligible within {radius} miles.
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                {canMatchLines
                  ? `No vendor covers ${selectedLineNames.join(" or ")} near ${row.city}.`
                  : `No vendor in the network is within ${radius} miles of ${row.city}.`}{" "}
                Widen the radius, or recruit — this market has no bench.
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
                  {canMatchLines && all && selected.length > 1 && (
                    <Chip
                      label={`Covers all ${selected.length}`}
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
                  {mi != null && (
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {mi.toFixed(1)} mi
                    </Typography>
                  )}
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
                size="small"
                disabled={busy}
                onClick={() => assign(v.id)}
              >
                Assign
              </Button>
            </Box>
          ))}
        </Box>
      )}

      {/* Rates — client price beside the input so margin is visible while negotiating */}
      <Box sx={{ pt: 3 }}>
        <Eyebrow sx={{ mb: 1 }}>Scope &amp; rates</Eyebrow>

        {!selected.length && (
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            Pick at least one service line above.
          </Typography>
        )}

        {selectedRows.map((r) => (
          <Box key={r.contract_site_id} sx={{ pt: 1.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
              {r.service_line}
            </Typography>
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
                    disabled={!r.assignment_id}
                    value={svc.vendor_price ?? ""}
                    onChange={(e) =>
                      setLocalRate(r.contract_site_id, svc.id, e.target.value)
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

        {selected.length > 0 && !assignedVendor && (
          <Typography
            sx={{ mt: 1.5, fontSize: "0.75rem", color: "text.secondary" }}
          >
            Assign a vendor to enter their rates.
          </Typography>
        )}
      </Box>
    </SlideOutPanel>
  );
}
