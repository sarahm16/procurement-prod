// client-detail/tabs/ClientContractsTab/ClientContractsTab.jsx
//
// The client's contracts as a grid. Click one to open its own page
// (/contracts/:id), where all of its fields, sites, attachments and activity
// live. This tab only lists and filters.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Box, Chip, Stack, Typography } from "@mui/material";

import ListDataGrid from "../../../../components/ListPageLayout/ListDataGrid";
import {
  ServiceLineChip,
  StatusCell,
} from "../../../../components/ServiceLineChips";
import {
  useClientActions,
  useClientContracts,
  useClientDetails,
} from "../../ClientDetailProvider";

/** "2026-11-01" → "Nov 1, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

const fmtMoney = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

/** "Nov 1, 2025 – Mar 31, 2027", or "… – auto-renews" / "… – no end date". */
const termText = (c) =>
  `${fmtDay(c.start_date) || "—"} – ${
    c.auto_renew ? "auto-renews" : fmtDay(c.end_date) || "no end date"
  }`;

/** Hover text on the status. */
const statusHint = (c) => {
  if (c.status_key === "upcoming") return `Starts ${fmtDay(c.starts_on)}`;
  if (c.status_key === "ended") return `Ended ${fmtDay(c.ends_on)}`;
  if (c.auto_renew) return "Auto-renews — no end date";
  return c.ends_on ? `Last day ${fmtDay(c.ends_on)}` : null;
};

const STATUS_RANK = { active: 0, upcoming: 1, ended: 2 };

// Which contracts the chips show.
const VIEWS = [
  { key: "current", label: "Current", test: (c) => c.status_key !== "ended" },
  { key: "ended", label: "Ended", test: (c) => c.status_key === "ended" },
  { key: "all", label: "All", test: () => true },
];

const columns = [
  {
    field: "project_name",
    headerName: "Contract",
    flex: 1.4,
    minWidth: 180,
    renderCell: ({ value }) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }} noWrap>
          {value || "Untitled contract"}
        </Typography>
      </Box>
    ),
  },
  {
    field: "service_line",
    headerName: "Service Line",
    width: 160,
    renderCell: ({ value }) =>
      value ? (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <ServiceLineChip line={{ name: value }} />
        </Box>
      ) : (
        "—"
      ),
  },
  {
    field: "status_key",
    headerName: "Status",
    width: 120,
    // Sort and export by the label, not the key.
    valueGetter: (value, row) => row.status_name ?? "—",
    sortComparator: (a, b, pa, pb) =>
      (STATUS_RANK[pa.api.getRow(pa.id)?.status_key] ?? 9) -
      (STATUS_RANK[pb.api.getRow(pb.id)?.status_key] ?? 9),
    renderCell: (params) => (
      <StatusCell
        name={params.value}
        color={params.row.status_color}
        hint={statusHint(params.row)}
      />
    ),
  },
  {
    field: "start_date",
    headerName: "Term",
    flex: 1.2,
    minWidth: 210,
    // Sorts by start date (the raw "YYYY-MM-DD"), shows the whole term.
    renderCell: ({ row }) => termText(row),
  },
  {
    field: "active_sites",
    headerName: "Sites",
    width: 150,
    type: "number",
    align: "left",
    headerAlign: "left",
    renderCell: ({ row }) =>
      row.upcoming_sites
        ? `${row.active_sites} (+${row.upcoming_sites} upcoming)`
        : row.active_sites,
  },
  {
    field: "value",
    headerName: "Value",
    width: 120,
    type: "number",
    valueFormatter: (value) => fmtMoney(value),
  },
  {
    field: "annual_increase_percent",
    headerName: "Increase",
    description: "Annual increase",
    width: 100,
    type: "number",
    valueFormatter: (value) => (value == null ? "—" : `${value}%`),
  },
  {
    field: "service_type",
    headerName: "Service Type",
    width: 140,
    valueGetter: (value) => value ?? "—",
  },
];

export default function ClientContractsTab() {
  const navigate = useNavigate();
  const details = useClientDetails();
  const contracts = useClientContracts();
  const { loadContracts } = useClientActions();
  const [view, setView] = useState("current");

  useEffect(() => {
    if (contracts === null) loadContracts();
  }, [contracts, loadContracts]);

  const all = useMemo(() => contracts ?? [], [contracts]);

  const counts = useMemo(
    () =>
      Object.fromEntries(VIEWS.map((v) => [v.key, all.filter(v.test).length])),
    [all],
  );

  // Current first, then the newest start date.
  const rows = useMemo(() => {
    const test = VIEWS.find((v) => v.key === view)?.test ?? (() => true);
    return all
      .filter(test)
      .sort(
        (a, b) =>
          (STATUS_RANK[a.status_key] ?? 9) - (STATUS_RANK[b.status_key] ?? 9) ||
          String(b.start_date ?? "").localeCompare(String(a.start_date ?? "")),
      );
  }, [all, view]);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 3 } }}>
      {/* View chips — each shows how many contracts it holds */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {VIEWS.map((v) => (
          <Chip
            key={v.key}
            label={`${v.label} ${counts[v.key] ?? 0}`}
            onClick={() => setView(v.key)}
            color={view === v.key ? "primary" : "default"}
            variant={view === v.key ? "filled" : "outlined"}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      {/* ListDataGrid fills its parent's height, so give it one. */}
      <Box sx={{ height: "calc(100vh - 330px)", minHeight: 360 }}>
        <ListDataGrid
          rows={rows}
          columns={columns}
          loading={contracts === null}
          onRowClick={(row) => navigate(`/contracts/${row.id}`)}
          exportFileName={`${details?.client ?? "client"}-contracts`}
          noRowsMessage={
            all.length
              ? "No contracts in this view"
              : "No contracts for this client yet"
          }
          initialState={{
            columns: {
              columnVisibilityModel: { service_type: false },
            },
          }}
        />
      </Box>
    </Box>
  );
}
