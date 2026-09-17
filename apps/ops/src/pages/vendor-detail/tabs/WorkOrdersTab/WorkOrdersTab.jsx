// pages/Vendors/VendorWorkOrdersTab.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";

import { workOrderTypes } from "../../../../*/constants/workorderTypes";
import { workOrderPriorityConfig } from "../../../../*/constants/workOrderPriorityConfig";
import { useWorkOrderStatuses } from "../../../../*/hooks/useWorkOrderStatuses";
import ListDataGrid from "../../../../components/ListPageLayout/ListDataGrid";

import { useVendorWorkOrders } from "./useVendorWorkOrders";

/* ── Formatting ──────────────────────────────────────────────────────────── */

const fmtMoney = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });

/**
 * Date-only parsing.
 *
 * due_date is stored at UTC midnight, so `new Date(iso)` renders as the
 * previous day anywhere west of Greenwich — the 9/30-shows-as-9/29 bug. The
 * parts are split explicitly instead. Workorders.jsx still has the naive
 * version; worth sweeping when you next touch it.
 */
const parseDateOnly = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

const fmtDate = (value) => {
  const d = parseDateOnly(value);
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
};

const ageInDays = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

const typeColor = (name) =>
  workOrderTypes.find((t) => t.name === name)?.color ?? "#6b7280";

const ColorChip = ({ label, color }) => (
  <Chip
    label={label}
    size="small"
    sx={{
      backgroundColor: `${color}22`,
      color,
      border: `1px solid ${color}55`,
      height: 20,
      fontSize: "0.65rem",
    }}
  />
);

/* ── Header ──────────────────────────────────────────────────────────────── */

function SummaryBar({ summary }) {
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
        spacing={4}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Stat label="Open" value={summary.open} />
        <Stat label="Completed YTD" value={summary.completed_ytd} />
        <Tooltip
          title={`${fmtMoney(summary.vendor_value_ytd)} year to date`}
          arrow
        >
          <span>
            <Stat label="Vendor value" value={fmtMoney(summary.vendor_value)} />
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {summary.total} work order{summary.total === 1 ? "" : "s"} across{" "}
          {summary.sites} site
          {summary.sites === 1 ? "" : "s"}
        </Typography>
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

export default function WorkOrdersTab({ vendorId }) {
  const navigate = useNavigate();
  const { data: workOrderStatuses = [] } = useWorkOrderStatuses();
  console.log("workOrderStatuses", workOrderStatuses);
  const { rows, summary, loading, error, refresh } =
    useVendorWorkOrders(vendorId);

  const [view, setView] = useState("open"); // open | all | completed
  const [search, setSearch] = useState("");

  const statusColor = (status) =>
    workOrderStatuses.find((s) => s.name === status)?.color;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (view === "open" && !r.is_open) return false;
      if (view === "completed" && r.is_open) return false;
      if (!q) return true;
      return [
        r.work_order_number,
        r.parent_work_order_number,
        r.client,
        r.site,
        r.city,
        r.type,
        r.external_id,
      ].some((v) => v?.toLowerCase?.().includes(q));
    });
  }, [rows, view, search]);

  const columns = useMemo(
    () => [
      { field: "work_order_number", headerName: "WO #", width: 150 },
      {
        field: "parent_work_order_number",
        headerName: "Parent",
        width: 140,
        // The parent is a different record, so it gets its own link. Without
        // stopPropagation the row click wins and you land on the child you
        // were already looking at.
        renderCell: ({ row }) =>
          row.parent_work_order_id ? (
            <Link
              component="button"
              underline="hover"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/workorders/${row.parent_work_order_id}`);
              }}
              sx={{ fontSize: "0.8rem" }}
            >
              {row.parent_work_order_number ?? `#${row.parent_work_order_id}`}
            </Link>
          ) : (
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              —
            </Typography>
          ),
      },
      { field: "client", headerName: "Client", width: 150 },
      { field: "site", headerName: "Site", width: 170 },
      { field: "city", headerName: "City", width: 130 },
      {
        field: "type",
        headerName: "Type",
        width: 120,
        renderCell: ({ row }) =>
          row.type ? (
            <ColorChip label={row.type} color={typeColor(row.type)} />
          ) : (
            "—"
          ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: ({ row }) =>
          row.status ? (
            <ColorChip label={row.status} color={statusColor(row.status)} />
          ) : (
            "—"
          ),
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 100,
        renderCell: ({ row }) => {
          const cfg = workOrderPriorityConfig[row.priority];
          if (!cfg) return "—";
          return (
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                backgroundColor: cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}55`,
                height: 20,
                fontSize: "0.65rem",
              }}
            />
          );
        },
      },
      {
        field: "vendor_total",
        headerName: "Vendor $",
        width: 110,
        type: "number",
        valueFormatter: (value) => fmtMoney(value),
      },
      {
        field: "due_date",
        headerName: "Due",
        width: 120,
        type: "date",
        valueGetter: (value, row) => parseDateOnly(row.due_date),
        renderCell: ({ row }) => fmtDate(row.due_date),
      },
      {
        field: "age",
        headerName: "Age",
        width: 80,
        type: "number",
        valueGetter: (value, row) => ageInDays(row.created_at) ?? -1,
        renderCell: ({ row }) => {
          const days = ageInDays(row.created_at);
          return days == null ? "—" : days === 0 ? "Today" : `${days}d`;
        },
      },
      { field: "external_id", headerName: "External ID", width: 120 },
    ],
    [navigate, statusColor],
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
        Couldn't load this vendor's work orders.
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
      <SummaryBar summary={summary} />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton
            value="open"
            sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
          >
            Open ({rows.filter((r) => r.is_open).length})
          </ToggleButton>
          <ToggleButton
            value="completed"
            sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
          >
            Closed ({rows.filter((r) => !r.is_open).length})
          </ToggleButton>
          <ToggleButton
            value="all"
            sx={{ px: 1.5, py: 0.25, fontSize: "0.7rem" }}
          >
            All ({rows.length})
          </ToggleButton>
        </ToggleButtonGroup>

        <TextField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          placeholder="Search WO #, site, client…"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280 }}
        />

        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {filtered.length} shown
        </Typography>
      </Stack>

      <ListDataGrid
        rows={filtered}
        columns={columns}
        loading={loading}
        noRowsMessage={
          view === "open"
            ? "No open work orders for this vendor"
            : "No work orders for this vendor yet"
        }
        onRowClick={(row) => navigate(`/workorders/${row.id}`)}
        initialState={{
          pinnedColumns: { left: ["work_order_number"] },
          sorting: { sortModel: [{ field: "due_date", sort: "desc" }] },
        }}
      />
    </Box>
  );
}
