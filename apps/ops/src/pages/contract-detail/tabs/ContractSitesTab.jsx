// contract-detail/tabs/ContractSitesTab.jsx
//
// Every site on the contract, with its status on it. Sites taken off the
// contract (or on an ended contract) are hidden behind a chip.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Chip, Stack } from "@mui/material";

import ListDataGrid from "../../../components/ListPageLayout/ListDataGrid";
import { StatusCell } from "../../../components/ServiceLineChips";
import {
  useContractActions,
  useContractDetails,
  useContractSites,
} from "../ContractDetailProvider";

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

const clean = (v) => (typeof v === "string" ? v.trim() || null : (v ?? null));

const statusHint = (s) => {
  if (s.status_key === "upcoming") return `Starts ${fmtDay(s.starts_on)}`;
  if (s.status_key === "removed") return `Last day ${fmtDay(s.ends_on)}`;
  if (s.status_key === "contract_ended")
    return `Contract ended ${fmtDay(s.ends_on)}`;
  return s.ends_on ? `Last day ${fmtDay(s.ends_on)}` : null;
};

const STATUS_RANK = { active: 0, upcoming: 1, removed: 2, contract_ended: 3 };

const columns = [
  {
    field: "store",
    headerName: "Site",
    flex: 1,
    minWidth: 150,
    valueGetter: (value) => value || "Unnamed site",
  },
  {
    field: "mailing_address",
    headerName: "Address",
    flex: 1.3,
    minWidth: 170,
    valueGetter: (value, row) =>
      [clean(value), clean(row.mailing_address2)].filter(Boolean).join(", ") ||
      "—",
  },
  {
    field: "mailing_city",
    headerName: "City",
    flex: 0.8,
    minWidth: 110,
    valueGetter: (value) => clean(value) ?? "—",
  },
  {
    field: "mailing_state",
    headerName: "State",
    width: 80,
    valueGetter: (value) => clean(value) ?? "—",
  },
  {
    field: "mailing_zipcode",
    headerName: "Zip",
    width: 90,
    valueGetter: (value) => clean(value) ?? "—",
  },
  {
    field: "status_key",
    headerName: "Status",
    width: 140,
    valueGetter: (value, row) => row.status_name ?? "—",
    renderCell: (params) => (
      <StatusCell
        name={params.value}
        color={params.row.status_color}
        hint={statusHint(params.row)}
      />
    ),
  },
  {
    field: "starts_on",
    headerName: "On Contract",
    flex: 1,
    minWidth: 200,
    renderCell: ({ row }) =>
      row.ends_on
        ? `${fmtDay(row.starts_on)} – ${fmtDay(row.ends_on)}`
        : `Since ${fmtDay(row.starts_on)}`,
  },
  {
    field: "high_risk",
    headerName: "High Risk",
    width: 100,
    type: "boolean",
  },
];

export default function ContractSitesTab() {
  const navigate = useNavigate();
  const contract = useContractDetails();
  const sites = useContractSites();
  const { loadSites } = useContractActions();
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    if (sites === null)
      loadSites().catch((e) => console.error("Error fetching sites:", e));
  }, [sites, loadSites]);

  const all = useMemo(() => sites ?? [], [sites]);
  const pastCount = all.filter((s) => !s.is_current).length;

  const rows = useMemo(
    () =>
      all
        .filter((s) => showPast || s.is_current)
        .sort(
          (a, b) =>
            (STATUS_RANK[a.status_key] ?? 9) -
              (STATUS_RANK[b.status_key] ?? 9) ||
            String(a.store ?? "").localeCompare(String(b.store ?? "")),
        ),
    [all, showPast],
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <Chip
          label={`On contract ${all.length - pastCount}`}
          size="small"
          color={!showPast ? "primary" : "default"}
          variant={!showPast ? "filled" : "outlined"}
          onClick={() => setShowPast(false)}
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`Include removed ${all.length}`}
          size="small"
          color={showPast ? "primary" : "default"}
          variant={showPast ? "filled" : "outlined"}
          onClick={() => setShowPast(true)}
          disabled={!pastCount}
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      <Box sx={{ height: "calc(100vh - 330px)", minHeight: 360 }}>
        <ListDataGrid
          rows={rows}
          columns={columns}
          loading={sites === null}
          onRowClick={(row) => navigate(`/sites/${row.site_id}`)}
          exportFileName={`${contract?.project_name ?? "contract"}-sites`}
          noRowsMessage="No sites on this contract"
        />
      </Box>
    </Box>
  );
}
