// vendor-detail/tabs/DetailsTab/VendorQuickBooksCard.jsx
//
// The vendor's QuickBooks side, under Contacts on the Details tab:
//   ─ the link (search / create / change / unlink)
//   ─ every bill QuickBooks has for the vendor: totals, a filter
//     (open / overdue / paid), and a sortable list. Bills are matched to
//     work orders where possible (a mobilization fee recorded against the
//     bill, or a work order number written on it).
//
// Bills are read live from QuickBooks each time the card loads; nothing
// about them is stored here.
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import SectionCard from "../../../../components/SectionCard";
import QuickBooksIcon from "../../../../components/QuickBooks/QuickBooksIcon";
import QuickBooksLink from "../../../../components/QuickBooks/QuickBooksLink";

const billUrl = (id) =>
  `https://qbo.intuit.com/app/bill?txnId=${encodeURIComponent(id)}`;

const money = (n) =>
  Number(n ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** QuickBooks dates are plain YYYY-MM-DD; read them as local dates. */
const parseDay = (s) => {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return y ? new Date(y, m - 1, d) : null;
};
const fmtDay = (s) =>
  parseDay(s)?.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) ?? "—";

const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const statusOf = (b) => {
  if (b.balance <= 0) return "paid";
  const due = parseDay(b.due_date);
  return due && due < today() ? "overdue" : "open";
};

const STATUS = {
  paid: { label: "Paid", color: "success" },
  open: { label: "Open", color: "warning" },
  overdue: { label: "Overdue", color: "error" },
};

const COLUMNS = [
  { key: "doc_number", label: "Bill" },
  { key: "work_order", label: "Work order" },
  { key: "txn_date", label: "Date" },
  { key: "due_date", label: "Due" },
  { key: "total", label: "Amount", align: "right" },
  { key: "balance", label: "Balance", align: "right" },
  { key: "status", label: "Status" },
];

const sortValue = (b, key) => {
  switch (key) {
    case "doc_number":
      return b.doc_number ?? b.id;
    case "work_order":
      return b.work_order?.work_order_number ?? null;
    case "txn_date":
    case "due_date":
      return parseDay(b[key])?.getTime() ?? null;
    case "status":
      return { overdue: 0, open: 1, paid: 2 }[b.status];
    default:
      return b[key];
  }
};

/* ── Pieces ───────────────────────────────────────────────────────────── */

function Stat({ label, value, tone }) {
  const theme = useTheme();
  const c = tone ? theme.palette[tone].main : null;
  return (
    <Box
      sx={{
        flex: "1 1 130px",
        px: 1.75,
        py: 1.25,
        borderRadius: 1.5,
        border: 1,
        borderColor: c ? alpha(c, 0.35) : "divider",
        bgcolor: c ? alpha(c, 0.06) : "transparent",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.64rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "1rem",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: c ?? "text.primary",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function BillsTable({ bills }) {
  const [sort, setSort] = useState({ key: "txn_date", dir: "desc" });

  const sorted = useMemo(() => {
    const { key, dir } = sort;
    return [...bills].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // blanks last, either direction
      if (bv == null) return -1;
      const cmp =
        typeof av === "string" ? av.localeCompare(bv, undefined, { numeric: true }) : av - bv;
      return dir === "asc" ? cmp : -cmp;
    });
  }, [bills, sort]);

  const sortBy = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: ["txn_date", "due_date", "total", "balance"].includes(key) ? "desc" : "asc" },
    );

  return (
    <TableContainer
      sx={{ maxHeight: 420, border: 1, borderColor: "divider", borderRadius: 1.5 }}
    >
      <Table
        size="small"
        stickyHeader
        sx={{ "& th, & td": { px: 1.25 }, "& th:first-of-type, & td:first-of-type": { pl: 2 } }}
      >
        <TableHead>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableCell
                key={c.key}
                align={c.align}
                sortDirection={sort.key === c.key ? sort.dir : false}
                sx={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  bgcolor: "background.paper",
                }}
              >
                <TableSortLabel
                  active={sort.key === c.key}
                  direction={sort.key === c.key ? sort.dir : "asc"}
                  onClick={() => sortBy(c.key)}
                >
                  {c.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((b) => {
            const s = STATUS[b.status];
            return (
              <TableRow key={b.id} hover sx={{ "& td": { fontSize: "0.82rem" } }}>
                <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  <Tooltip title="Open in QuickBooks">
                    <Link
                      href={billUrl(b.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      color="inherit"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        "& svg": { opacity: 0.35 },
                        "&:hover svg": { opacity: 1, color: "#2CA01C" },
                      }}
                    >
                      {b.doc_number || (
                        <Box component="span" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                          #{b.id}
                        </Box>
                      )}
                      <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Link>
                  </Tooltip>
                  {b.memo && (
                    <Typography
                      sx={{ fontSize: "0.7rem", color: "text.secondary", maxWidth: 180 }}
                      noWrap
                      title={b.memo}
                    >
                      {b.memo}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {b.work_order ? (
                    <Tooltip
                      title={
                        b.work_order.via === "mobilization_fee"
                          ? "Mobilization fee paid on this bill"
                          : "Work order number written on the bill"
                      }
                    >
                      <Link
                        component={RouterLink}
                        to={`/workorders/${b.work_order.id}`}
                        sx={{ fontWeight: 600 }}
                      >
                        {b.work_order.work_order_number}
                      </Link>
                    </Tooltip>
                  ) : (
                    <Box component="span" sx={{ color: "text.disabled" }}>—</Box>
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                  {fmtDay(b.txn_date)}
                </TableCell>
                <TableCell
                  sx={{
                    whiteSpace: "nowrap",
                    color: b.status === "overdue" ? "error.main" : "text.secondary",
                    fontWeight: b.status === "overdue" ? 600 : 400,
                  }}
                >
                  {fmtDay(b.due_date)}
                </TableCell>
                <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {money(b.total)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: `${s.color}.main`,
                  }}
                >
                  {money(b.balance)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={s.label}
                    color={s.color}
                    variant={b.status === "paid" ? "outlined" : "filled"}
                    sx={{ height: 20, fontSize: "0.66rem", fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/* ── The card ─────────────────────────────────────────────────────────── */

export default function VendorQuickBooksCard({ vendorId, company, quickbooksId: initialQbId }) {
  // Kept here so linking updates the card straight away without reloading
  // the whole vendor.
  const [qbId, setQbId] = useState(initialQbId ?? null);
  useEffect(() => setQbId(initialQbId ?? null), [initialQbId]);

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    if (!vendorId || !qbId) {
      setBills([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`/api/quickbooks/vendors/${vendorId}/bills`);
      setBills((data.bills ?? []).map((b) => ({ ...b, status: statusOf(b) })));
    } catch (e) {
      setBills([]);
      setError(e.response?.data?.error ?? "Couldn't load bills from QuickBooks.");
    } finally {
      setLoading(false);
    }
  }, [vendorId, qbId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t = { billed: 0, outstanding: 0, overdue: 0, open: 0, paid: 0, overdueCount: 0 };
    for (const b of bills) {
      t.billed += b.total;
      t.outstanding += b.balance;
      if (b.status === "overdue") {
        t.overdue += b.balance;
        t.overdueCount += 1;
      }
      if (b.status === "paid") t.paid += 1;
      else t.open += 1;
    }
    return t;
  }, [bills]);

  const shown =
    filter === "all"
      ? bills
      : filter === "open"
        ? bills.filter((b) => b.status !== "paid")
        : bills.filter((b) => b.status === filter);

  return (
    <SectionCard
      title="QuickBooks"
      icon={<QuickBooksIcon />}
      count={bills.length || null}
      actions={
        qbId ? (
          <Tooltip title="Reload bills from QuickBooks">
            <span>
              <IconButton size="small" onClick={load} disabled={loading}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <QuickBooksLink
          kind="vendors"
          recordId={vendorId}
          name={company}
          quickbooksId={qbId}
          onChange={(id) => setQbId(id)}
        />

        {!qbId ? (
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            Link this vendor to QuickBooks to see its bills here. If it isn't in
            QuickBooks yet, you can create it from the search.
          </Typography>
        ) : loading && bills.length === 0 ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              Loading bills from QuickBooks…
            </Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={load}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : bills.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              No bills in QuickBooks for this vendor yet.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
              <Stat label="Total billed" value={money(totals.billed)} />
              <Stat
                label="Outstanding"
                value={money(totals.outstanding)}
                tone={totals.outstanding > 0 ? "warning" : undefined}
              />
              <Stat
                label="Overdue"
                value={money(totals.overdue)}
                tone={totals.overdue > 0 ? "error" : undefined}
              />
              <Stat label="Open bills" value={`${totals.open} of ${bills.length}`} />
            </Box>

            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, v) => v && setFilter(v)}
              sx={{
                "& .MuiToggleButton-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.76rem",
                  px: 1.5,
                  py: 0.4,
                },
              }}
            >
              <ToggleButton value="all">All {bills.length}</ToggleButton>
              <ToggleButton value="open">Open {totals.open}</ToggleButton>
              <ToggleButton value="overdue" disabled={!totals.overdueCount}>
                Overdue {totals.overdueCount}
              </ToggleButton>
              <ToggleButton value="paid">Paid {totals.paid}</ToggleButton>
            </ToggleButtonGroup>

            <BillsTable bills={shown} />
          </>
        )}
      </Box>
    </SectionCard>
  );
}
