// pages/Vendors/VendorSitesTab.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import SearchIcon from "@mui/icons-material/Search";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import ListDataGrid from "../../../../components/ListPageLayout/ListDataGrid";
import { useVendorSites } from "./useVendorSites";

const money = (n, opts = {}) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
        ...opts,
      });

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

/**
 * Same dot as the site tab's card. Worth hoisting into components/ the next
 * time a third screen needs it — two copies is a coincidence, three is a
 * component.
 */
function CheckDot({ value }) {
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
  // A past assignment has no site-level status of its own — an empty circle
  // would read as "not done" when the truth is "not theirs any more".
  if (value == null)
    return (
      <Typography variant="caption" sx={{ color: "text.disabled" }}>
        —
      </Typography>
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

/* ── Vendor-level compliance, shown once ─────────────────────────────────── */

function ComplianceStrip({ compliance }) {
  if (!compliance) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Compliance shows here once this vendor holds an active line — see the
        Compliance tab in the meantime.
      </Typography>
    );
  }

  const items = [
    { key: "w9", label: "W-9" },
    { key: "coi", label: "COI" },
    { key: "msa", label: "MSA" },
    { key: "ach", label: "ACH" },
  ];

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography
        variant="overline"
        sx={{ fontSize: "0.58rem", color: "text.disabled" }}
      >
        Vendor documents
      </Typography>
      {items.map(({ key, label }) => {
        const dot = (
          <Stack direction="row" spacing={0.625} alignItems="center">
            <CheckDot value={compliance[key]} />
            <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
              {label}
            </Typography>
          </Stack>
        );
        return key === "coi" && compliance.coi_expiration ? (
          <Tooltip
            key={key}
            title={`Expires ${fmtDate(compliance.coi_expiration)}`}
            arrow
          >
            <span>{dot}</span>
          </Tooltip>
        ) : (
          <Box key={key}>{dot}</Box>
        );
      })}
    </Stack>
  );
}

/* ── Header ──────────────────────────────────────────────────────────────── */

function SummaryBar({ summary, compliance }) {
  if (!summary) return null;
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        mb: 1.5,
        bgcolor: (t) => alpha(t.palette.primary.main, 0.03),
      }}
    >
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Stat label="Sites" value={summary.sites} />
        <Stat label="Service lines" value={summary.current} />
        <Stat label="Clients" value={summary.clients} />
        <Stat
          label="Annual vendor cost"
          value={money(summary.vendor_price_total)}
        />
        <Box sx={{ flex: 1 }} />
        <ComplianceStrip compliance={compliance} />
      </Stack>
    </Paper>
  );
}

const Stat = ({ label, value }) => (
  <Box>
    <Typography
      variant="overline"
      sx={{ display: "block", fontSize: "0.58rem", color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
      {value}
    </Typography>
  </Box>
);

/* ── Tab ─────────────────────────────────────────────────────────────────── */

export default function SitesTab({ vendorId }) {
  const navigate = useNavigate();
  const [includePast, setIncludePast] = useState(false);
  const [search, setSearch] = useState("");

  const { rows, compliance, summary, loading, error, refresh } = useVendorSites(
    vendorId,
    {
      includePast,
    },
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.site, r.client, r.city, r.service_line].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [rows, search]);

  const columns = useMemo(
    () => [
      {
        field: "site",
        headerName: "Site",
        flex: 1.1,
        minWidth: 170,
        renderCell: ({ row }) => (
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Typography
              variant="body2"
              noWrap
              sx={{
                fontSize: "0.82rem",
                color: row.is_current ? "text.primary" : "text.disabled",
              }}
            >
              {row.site}
            </Typography>
            {!row.is_current && (
              <Chip
                label="Past"
                size="small"
                sx={{ height: 16, fontSize: "0.55rem" }}
              />
            )}
          </Stack>
        ),
      },
      { field: "client", headerName: "Client", flex: 1, minWidth: 140 },
      { field: "city", headerName: "City", flex: 0.8, minWidth: 120 },
      {
        field: "service_line",
        headerName: "Service Line",
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: ({ row }) =>
          row.is_current ? (
            row.status ? (
              <Chip
                label={row.status}
                size="small"
                variant="outlined"
                sx={{ height: 19, fontSize: "0.6rem" }}
              />
            ) : (
              "—"
            )
          ) : (
            <Tooltip
              title={
                row.current_vendor
                  ? `Now: ${row.current_vendor}`
                  : "No current vendor"
              }
            >
              <Typography
                variant="caption"
                sx={{ color: "text.disabled" }}
                noWrap
              >
                {row.current_vendor ? `→ ${row.current_vendor}` : "Replaced"}
              </Typography>
            </Tooltip>
          ),
      },
      ...["rates", "sent", "signed"].map((key, i) => ({
        field: key,
        headerName: ["Rates", "Exhibit", "Signed"][i],
        width: 82,
        align: "center",
        headerAlign: "center",
        sortable: true,
        // Sort by the flag itself so "show me what's missing" is one click.
        valueGetter: (_v, row) => (row.checks?.[key] === true ? 1 : 0),
        renderCell: ({ row }) => <CheckDot value={row.checks?.[key]} />,
      })),
      {
        field: "priced",
        headerName: "Priced",
        width: 90,
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row) => row.priced_count ?? -1,
        renderCell: ({ row }) =>
          row.is_current ? (
            <Typography
              variant="caption"
              sx={{
                fontVariantNumeric: "tabular-nums",
                color:
                  row.priced_count === row.service_count
                    ? "text.secondary"
                    : "warning.dark",
              }}
            >
              {row.priced_count ?? 0} / {row.service_count ?? 0}
            </Typography>
          ) : (
            "—"
          ),
      },
      {
        field: "vendor_price_total",
        headerName: "Vendor $",
        width: 110,
        align: "right",
        headerAlign: "right",
        // Client price and margin deliberately aren't here — add them the same
        // way if the team wants them, but a vendor profile is the screen most
        // likely to be turned toward a vendor in a meeting.
        renderCell: ({ value }) => (
          <Typography
            variant="body2"
            sx={{ fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}
          >
            {money(value)}
          </Typography>
        ),
      },
      {
        field: "open",
        headerName: "",
        width: 44,
        sortable: false,
        filterable: false,
        align: "center",
        renderCell: () => (
          <OpenInNewIcon sx={{ fontSize: 15, color: "text.disabled" }} />
        ),
      },
    ],
    [],
  );

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
        Couldn't load this vendor's sites.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <SummaryBar summary={summary} compliance={compliance} />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          placeholder="Search sites, clients, cities…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={includePast}
              onChange={(e) => setIncludePast(e.target.checked)}
            />
          }
          label={
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Include past assignments
            </Typography>
          }
        />
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {filtered.length} of {rows.length}
        </Typography>
      </Stack>

      <ListDataGrid
        rows={filtered}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.assignment_id}
        noRowsMessage={
          includePast
            ? "This vendor isn't assigned to any sites yet"
            : "No active assignments — try including past ones"
        }
        // Rates are edited on the site, so a row click goes there rather than
        // opening a second editing surface for the same numbers.
        onRowClick={(row) => navigate(`/sites/${row.site_id}?tab=sourcing`)}
        initialState={{ pinnedColumns: { left: ["site"] } }}
      />
    </Box>
  );
}
