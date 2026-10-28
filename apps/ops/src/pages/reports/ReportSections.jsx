// pages/Reports/ReportSections.jsx
//
// One component per tab of the Reports page. Each takes the summary from
// GET /api/reports/summary (Workload loads its own data).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TableCell,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import {
  ColumnChart,
  DataTable,
  FONT,
  InlineBar,
  Kpi,
  Legend,
  LineChart,
  MARGIN_FLOOR,
  MARGIN_TARGET,
  MarginValue,
  Panel,
  STATUS,
  StackedBar,
  count,
  fmtDay,
  fmtMonth,
  money,
  percent,
} from "./reportUi";
import { TypeScorecard } from "./TypeSections";

const Grid = ({ children, cols = { xs: "1fr", lg: "1fr 1fr" } }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: cols, gap: 2, alignItems: "start" }}>{children}</Box>
);
const KpiRow = ({ children }) => <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>{children}</Box>;
const Stack = ({ children }) => <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</Box>;
const Muted = ({ children }) => (
  <Typography sx={{ fontFamily: FONT, fontSize: "0.8rem", color: "text.secondary", p: 2 }}>{children}</Typography>
);
const Sub = ({ children }) => (
  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
    {children}
  </Box>
);

/* ═══ Sourcing ═══════════════════════════════════════════════════════ */

const SOURCING_SEGMENTS = (c) => [
  { label: "Sourced", value: c.sourced, color: STATUS.good },
  { label: "In progress", value: c.in_progress, color: STATUS.warning },
  { label: "No vendor", value: c.no_vendor, color: STATUS.critical },
];
const SOURCING_LEGEND = [
  { label: "Sourced", color: STATUS.good },
  { label: "Vendor assigned, steps left", color: STATUS.warning },
  { label: "No vendor yet", color: STATUS.critical },
];

function SourcingLine({ label, c }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "72px 1fr 210px", gap: 1.5, alignItems: "center", py: 0.6 }}>
      <Typography sx={{ fontFamily: FONT, fontSize: "0.74rem", color: "text.secondary" }}>{label}</Typography>
      <StackedBar segments={SOURCING_SEGMENTS(c)} total={c.total} />
      <Typography sx={{ fontFamily: FONT, fontSize: "0.76rem", fontVariantNumeric: "tabular-nums" }}>
        {c.total ? (
          <>
            <b>{count(c.sourced)}</b> of {count(c.total)} sourced <Sub>· {percent(c.sourced_pct)}</Sub>
          </>
        ) : (
          <Sub>No lines</Sub>
        )}
      </Typography>
    </Box>
  );
}

export function SourcingByServiceLine({ sourcing, compact }) {
  const theme = useTheme();
  return (
    <Panel
      title="Sourcing by service line"
      subtitle="Active lines are running now; upcoming lines start later. Counts are contract site lines."
      action={!compact && <Legend items={SOURCING_LEGEND} />}
    >
      <Box sx={{ px: 2, pb: 1.5 }}>
        {compact && (
          <Box sx={{ mb: 1 }}>
            <Legend items={SOURCING_LEGEND} />
          </Box>
        )}
        {sourcing.service_lines.length === 0 && <Muted>No active or upcoming lines.</Muted>}
        {sourcing.service_lines.map((sl) => (
          <Box key={sl.service_line} sx={{ py: 1, borderTop: `1px solid ${theme.palette.divider}`, "&:first-of-type": { borderTop: 0 } }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.25 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.86rem" }}>{sl.service_line}</Typography>
              {sl.upcoming.starting_soon_unsourced > 0 && (
                <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "error.main", fontWeight: 600 }}>
                  {sl.upcoming.starting_soon_unsourced} start within 30 days without a sourced vendor
                </Typography>
              )}
            </Box>
            <SourcingLine label="Upcoming" c={sl.upcoming} />
            <SourcingLine label="Active" c={sl.active} />
          </Box>
        ))}
      </Box>
    </Panel>
  );
}

export function SourcingSection({ data }) {
  const navigate = useNavigate();
  const s = data.sourcing;
  const up = s.totals.upcoming;
  return (
    <>
      <KpiRow>
        <Kpi label="Upcoming lines sourced" value={percent(up.sourced_pct)} hint={`${count(up.sourced)} of ${count(up.total)} lines`} />
        <Kpi
          label="Starting in 30 days"
          value={count(up.starting_soon_unsourced)}
          accent={up.starting_soon_unsourced ? STATUS.critical : undefined}
          hint="Upcoming lines not yet sourced"
        />
        <Kpi label="No vendor yet" value={count(up.no_vendor)} hint="Upcoming lines with no one assigned" />
        <Kpi label="In progress" value={count(up.in_progress)} hint="Vendor assigned, steps still open" />
        <Kpi
          label="Need resourcing"
          value={count(s.totals.active.needs_resourcing + up.needs_resourcing)}
          hint="Lost their primary vendor"
        />
      </KpiRow>
      <Stack>
        <SourcingByServiceLine sourcing={s} />
        <Grid cols={{ xs: "1fr", lg: "1fr 2fr" }}>
          <Panel title="Unsourced upcoming lines by client">
            <DataTable
              rowKey={(r) => r.client}
              initialSort={{ key: "unsourced", dir: "desc" }}
              columns={[
                { key: "client", label: "Client" },
                { key: "unsourced", label: "Unsourced", align: "right" },
                { key: "no_vendor", label: "No vendor", align: "right" },
              ]}
              rows={s.unsourced_by_client}
            />
            {s.unsourced_by_client.length === 0 && <Muted>Every upcoming line is sourced.</Muted>}
          </Panel>
          <Panel title="Starting soonest, not sourced" subtitle="The 40 nearest start dates. Open a row to go to the site.">
            <DataTable
              rowKey={(r) => r.contract_site_id}
              onRowClick={(r) => navigate(r.path)}
              maxHeight={460}
              columns={[
                { key: "starts_on", label: "Starts", render: (r) => fmtDay(r.starts_on) },
                {
                  key: "site",
                  label: "Site",
                  wrap: true,
                  render: (r) => (
                    <>
                      {r.site} <Sub>{r.place}</Sub>
                    </>
                  ),
                },
                { key: "service_line", label: "Service line" },
                {
                  key: "vendor",
                  label: "Vendor",
                  render: (r) =>
                    r.vendor ? (
                      r.vendor
                    ) : (
                      <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}>
                        {r.needs_resourcing ? "Needs resourcing" : "None yet"}
                      </Box>
                    ),
                },
                { key: "steps", label: "Steps", align: "right", render: (r) => `${r.steps} / 7` },
              ]}
              rows={s.next_unsourced}
            />
            {s.next_unsourced.length === 0 && <Muted>Nothing waiting.</Muted>}
          </Panel>
        </Grid>
      </Stack>
    </>
  );
}

/* ═══ Margin ═════════════════════════════════════════════════════════ */

const MARGIN_REFS = [
  { value: MARGIN_TARGET, label: `Target ${MARGIN_TARGET}%`, color: STATUS.good },
  { value: MARGIN_FLOOR, label: `Floor ${MARGIN_FLOOR}%`, color: STATUS.critical },
];

const monthTip = (m) => (
  <>
    <Box sx={{ fontWeight: 700, mb: 0.25 }}>{fmtMonth(m.key, true)}</Box>
    <Box>Revenue {money(m.revenue)}</Box>
    <Box>Cost {money(m.cost)}</Box>
    <Box>Margin {percent(m.margin_pct)}</Box>
    <Box sx={{ color: "text.secondary" }}>{count(m.priced)} priced work orders</Box>
  </>
);

export function MarginTrend({ margin, height = 200 }) {
  const lows = margin.by_month.map((m) => m.margin_pct).filter((v) => v != null);
  const max = Math.min(100, Math.ceil((Math.max(MARGIN_TARGET, ...lows) + 5) / 5) * 5);
  let min = Math.max(0, Math.floor((Math.min(MARGIN_FLOOR, ...lows) - 5) / 5) * 5);
  if ((max - min) % 10) min = Math.max(0, min - 5); // keeps the middle gridline on a whole 5%
  return (
    <LineChart
      ariaLabel="Work order margin by month"
      height={height}
      min={min}
      max={max}
      format={(v) => `${Math.round(v)}%`}
      refs={MARGIN_REFS}
      data={margin.by_month.map((m) => ({ key: m.key, label: fmtMonth(m.key), value: m.margin_pct, tip: monthTip(m) }))}
    />
  );
}

const moneyColumns = (first, { bar, max } = {}) => [
  first,
  { key: "work_orders", label: "Work orders", align: "right", render: (r) => count(r.work_orders) },
  {
    key: "revenue",
    label: "Revenue",
    align: "right",
    render: (r) => (
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        {bar && <InlineBar value={r.revenue} max={max} width={70} />}
        {money(r.revenue)}
      </Box>
    ),
  },
  { key: "profit", label: "Profit", align: "right", render: (r) => money(r.profit) },
  { key: "margin_pct", label: "Margin", align: "right", render: (r) => <MarginValue value={r.margin_pct} /> },
];

export function MarginSection({ data }) {
  const m = data.margin;
  const t = m.totals;
  const clientMax = Math.max(0, ...m.by_client.map((c) => c.revenue));
  return (
    <>
      <KpiRow>
        <Kpi label="Margin" value={<MarginValue value={t.margin_pct} size="2rem" />} hint={`Target ${MARGIN_TARGET}%, floor ${MARGIN_FLOOR}%`} />
        <Kpi label="Revenue" value={money(t.revenue, { compact: true })} hint={`${count(t.priced)} priced work orders`} />
        <Kpi label="Vendor cost" value={money(t.cost, { compact: true })} />
        <Kpi label="Profit" value={money(t.profit, { compact: true })} />
        <Kpi label="Unpriced" value={count(t.unpriced)} hint="Work orders with no client price, left out" />
      </KpiRow>
      <Stack>
        <Grid>
          <Panel title="Margin by month" subtitle="By due date. Months with no priced work orders are left blank.">
            <Box sx={{ px: 1, pb: 1 }}>
              <MarginTrend margin={m} />
            </Box>
          </Panel>
          <Panel title="Revenue by month" subtitle="Client price on work orders due that month, cancelled left out.">
            <Box sx={{ px: 1, pb: 1 }}>
              <ColumnChart
                ariaLabel="Revenue by month"
                format={(v) => money(v, { compact: true })}
                data={m.by_month.map((x) => ({ key: x.key, label: fmtMonth(x.key), value: x.revenue, tip: monthTip(x) }))}
              />
            </Box>
          </Panel>
        </Grid>
        <Grid>
          <Panel title="By work order type">
            <DataTable
              rowKey={(r) => r.key}
              initialSort={{ key: "revenue", dir: "desc" }}
              columns={moneyColumns({ key: "key", label: "Type" })}
              rows={m.by_type}
            />
          </Panel>
          <Panel title="By client" subtitle="Top 12 by revenue">
            <DataTable
              rowKey={(r) => r.key}
              initialSort={{ key: "revenue", dir: "desc" }}
              columns={moneyColumns({ key: "key", label: "Client" }, { bar: true, max: clientMax })}
              rows={m.by_client.map((r) => ({ ...r, pinned: r.other }))}
            />
            {m.by_client.length === 0 && <Muted>No priced work orders in this range.</Muted>}
          </Panel>
        </Grid>
        <Panel
          title="Projected margin on contract lines"
          subtitle="From client and vendor pricing on contract site lines that have both. Doesn't follow the date range."
        >
          <DataTable
            rowKey={(r) => r.service_line}
            columns={[
              { key: "service_line", label: "Service line" },
              { key: "active_lines", label: "Active lines priced", align: "right", sort: (r) => r.active.lines, render: (r) => count(r.active.lines) },
              { key: "active_margin", label: "Active margin", align: "right", sort: (r) => r.active.margin_pct, render: (r) => <MarginValue value={r.active.margin_pct} /> },
              { key: "upcoming_lines", label: "Upcoming lines priced", align: "right", sort: (r) => r.upcoming.lines, render: (r) => count(r.upcoming.lines) },
              { key: "upcoming_margin", label: "Upcoming margin", align: "right", sort: (r) => r.upcoming.margin_pct, render: (r) => <MarginValue value={r.upcoming.margin_pct} /> },
            ]}
            rows={m.contract_lines}
          />
          {m.contract_lines.length === 0 && <Muted>No contract lines have both prices yet.</Muted>}
        </Panel>
      </Stack>
    </>
  );
}

/* ═══ Fulfillment ════════════════════════════════════════════════════ */

const onTimeCell = (r) => (
  <>
    {percent(r.on_time_pct)} <Sub>of {count(r.with_checkout)}</Sub>
  </>
);

export function FulfillmentSection({ data }) {
  const navigate = useNavigate();
  const f = data.fulfillment;
  const t = f.totals;
  return (
    <>
      <KpiRow>
        <Kpi label="On time" value={percent(t.on_time_pct)} hint={`${count(t.on_time)} of ${count(t.with_checkout)} completed with a check-out`} />
        <Kpi label="Completed" value={count(t.done)} hint={`of ${count(t.total)} work orders due in range`} />
        <Kpi label="Avg days late" value={t.avg_days_late ?? "–"} hint="When completed late" />
        <Kpi label="Open and late" value={count(t.late_open)} accent={t.late_open ? STATUS.critical : undefined} hint="Past due, not completed" />
        <Kpi label="Cancelled" value={percent(t.cancelled_pct)} hint={`${count(t.cancelled)} work orders`} />
        <Kpi label="Reopened" value={count(t.reopened)} hint="Sent back from finance" />
      </KpiRow>
      <Stack>
        <Panel
          title="By work order type"
          subtitle="On time = the vendor's last check-out is on or before the due date. Completed work orders without a check-out aren't counted either way."
        >
          <DataTable
            rowKey={(r) => r.key}
            initialSort={{ key: "total", dir: "desc" }}
            columns={[
              { key: "key", label: "Type" },
              { key: "total", label: "Work orders", align: "right", render: (r) => count(r.total) },
              { key: "done", label: "Completed", align: "right", render: (r) => count(r.done) },
              { key: "on_time_pct", label: "On time", align: "right", render: onTimeCell },
              { key: "avg_days_late", label: "Avg days late", align: "right", render: (r) => r.avg_days_late ?? "–" },
              { key: "late_open", label: "Open & late", align: "right", render: (r) => count(r.late_open) },
              { key: "cancelled_pct", label: "Cancelled", align: "right", render: (r) => percent(r.cancelled_pct) },
              { key: "reopened", label: "Reopened", align: "right", render: (r) => count(r.reopened) },
              { key: "no_checkout", label: "No check-out", align: "right", render: (r) => count(r.no_checkout) },
            ]}
            rows={f.by_type}
          />
          {f.by_type.length === 0 && <Muted>No work orders due in this range.</Muted>}
        </Panel>
        <Panel title="Open and late" subtitle="Most overdue first. Open a row to go to the work order.">
          <DataTable
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(r.path)}
            initialSort={{ key: "days_overdue", dir: "desc" }}
            columns={[
              { key: "label", label: "Work order" },
              { key: "type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "site", label: "Site", wrap: true },
              { key: "vendor", label: "Vendor", render: (r) => r.vendor ?? <Sub>None</Sub> },
              { key: "due", label: "Due", render: (r) => fmtDay(r.due) },
              {
                key: "days_overdue",
                label: "Days late",
                align: "right",
                render: (r) => (
                  <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
                    {r.days_overdue}
                  </Box>
                ),
              },
            ]}
            rows={f.late_open}
          />
          {f.late_open.length === 0 && <Muted>Nothing open and late.</Muted>}
        </Panel>
      </Stack>
    </>
  );
}

/* ═══ Vendors ════════════════════════════════════════════════════════ */

export function VendorsSection({ data }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => data.vendors.filter((v) => !q.trim() || (v.vendor ?? "").toLowerCase().includes(q.trim().toLowerCase())),
    [data.vendors, q],
  );
  return (
    <Panel
      title="Vendor performance"
      subtitle="Work orders due in the range, and notices sent in the range. Live lines are current assignments."
      action={
        <TextField
          size="small"
          placeholder="Search vendors"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: 220, "& .MuiInputBase-root": { fontSize: "0.8rem", height: 32 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
        />
      }
    >
      <DataTable
        rowKey={(r) => r.vendor_id}
        onRowClick={(r) => navigate(r.path)}
        initialSort={{ key: "work_orders", dir: "desc" }}
        maxHeight={640}
        columns={[
          { key: "vendor", label: "Vendor" },
          { key: "live_lines", label: "Live lines", align: "right", render: (r) => count(r.live_lines) },
          { key: "work_orders", label: "Work orders", align: "right", render: (r) => count(r.work_orders) },
          { key: "on_time_pct", label: "On time", align: "right", render: onTimeCell },
          { key: "late_open", label: "Open & late", align: "right", render: (r) => count(r.late_open) },
          { key: "cancelled", label: "Cancelled", align: "right", render: (r) => count(r.cancelled) },
          { key: "revenue", label: "Revenue", align: "right", render: (r) => money(r.revenue) },
          { key: "margin_pct", label: "Margin", align: "right", render: (r) => <MarginValue value={r.margin_pct} /> },
          {
            key: "notices",
            label: "Notices",
            align: "right",
            sort: (r) => r.warnings + r.compliance + r.terminations * 10,
            render: (r) => {
              const bits = [
                r.terminations && `${r.terminations} termination`,
                r.warnings && `${r.warnings} warning${r.warnings === 1 ? "" : "s"}`,
                r.compliance && `${r.compliance} compliance`,
              ].filter(Boolean);
              return bits.length ? (
                <Box component="span" sx={{ color: r.terminations ? "error.main" : "text.primary" }}>
                  {bits.join(", ")}
                </Box>
              ) : (
                <Sub>None</Sub>
              );
            },
          },
        ]}
        rows={rows}
      />
      {rows.length === 0 && <Muted>{q ? "No vendors match." : "No vendor activity in this range."}</Muted>}
    </Panel>
  );
}

/* ═══ Finance ════════════════════════════════════════════════════════ */

export function FinanceSection({ data }) {
  const navigate = useNavigate();
  const fin = data.finance;
  const stageMax = Math.max(0, ...fin.stages.map((s) => s.revenue));
  const oldest = fin.oldest[0]?.days_in_finance;
  return (
    <>
      <KpiRow>
        <Kpi label="In the pipeline" value={money(fin.totals.revenue, { compact: true })} hint={`${count(fin.totals.count)} work orders not yet Closed`} />
        {fin.stages.map((s) =>
          s.count ? (
            <Kpi key={s.status} label={s.status} value={count(s.count)} hint={money(s.revenue, { compact: true })} />
          ) : null,
        )}
      </KpiRow>
      <Stack>
        <Panel
          title="By finance status"
          subtitle="Days in finance count from when the work order was sent to finance. This is now, not the date range."
        >
          <DataTable
            rowKey={(r) => r.status}
            columns={[
              {
                key: "status",
                label: "Status",
                sort: () => 0,
                render: (r) => (
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: r.color ?? "text.disabled" }} />
                    {r.status}
                  </Box>
                ),
              },
              { key: "count", label: "Work orders", align: "right", render: (r) => count(r.count) },
              {
                key: "revenue",
                label: "Client total",
                align: "right",
                render: (r) => (
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                    <InlineBar value={r.revenue} max={stageMax} width={80} />
                    {money(r.revenue)}
                  </Box>
                ),
              },
              { key: "avg_days", label: "Avg days in finance", align: "right", render: (r) => r.avg_days ?? "–" },
              { key: "max_days", label: "Oldest", align: "right", render: (r) => (r.max_days != null ? `${r.max_days} days` : "–") },
            ]}
            rows={fin.stages}
          />
        </Panel>
        <Panel title="Longest in finance" subtitle={oldest != null ? `Oldest has been in finance ${oldest} days` : undefined}>
          <DataTable
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(r.path)}
            initialSort={{ key: "days_in_finance", dir: "desc" }}
            columns={[
              { key: "label", label: "Work order" },
              { key: "status", label: "Status" },
              { key: "site", label: "Site", wrap: true },
              { key: "revenue", label: "Client total", align: "right", render: (r) => money(r.revenue) },
              { key: "days_in_finance", label: "Days in finance", align: "right" },
            ]}
            rows={fin.oldest}
          />
          {fin.oldest.length === 0 && <Muted>Nothing in finance right now.</Muted>}
        </Panel>
      </Stack>
    </>
  );
}

/* ═══ Workload (loads its own data) ══════════════════════════════════ */

export function WorkloadSection({ type }) {
  const [roleId, setRoleId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setError("");
    axios
      .get("/api/reports/workload", { params: { ...(roleId && { role_id: roleId }), ...(type && { type }) } })
      .then(({ data: d }) => live && setData(d))
      .catch((e) => {
        console.error("Error loading workload:", e);
        if (live) setError("Couldn't load the workload report.");
      });
    return () => {
      live = false;
    };
  }, [roleId, type]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={24} color="secondary" />
      </Box>
    );
  }

  const max = Math.max(1, ...data.people.map((p) => p.open_work_orders), data.unassigned.open_work_orders);
  const statusCols = data.columns.map((name) => ({
    key: `s_${name}`,
    label: name,
    align: "right",
    sort: (r) => r.by_status[name] ?? 0,
    render: (r) => (r.by_status[name] ? count(r.by_status[name]) : <Sub>·</Sub>),
  }));
  const columns = [
    { key: "name", label: "Person" },
    {
      key: "open_work_orders",
      label: "Open work orders",
      align: "right",
      render: (r) => (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <InlineBar value={r.open_work_orders} max={max} width={70} />
          {count(r.open_work_orders)}
        </Box>
      ),
    },
    ...statusCols,
    {
      key: "late_work_orders",
      label: "Late",
      align: "right",
      render: (r) =>
        r.late_work_orders ? (
          <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
            {r.late_work_orders}
          </Box>
        ) : (
          <Sub>0</Sub>
        ),
    },
    { key: "open_tasks", label: "Open tasks", align: "right", render: (r) => count(r.open_tasks) },
    {
      key: "overdue_tasks",
      label: "Overdue tasks",
      align: "right",
      render: (r) =>
        r.overdue_tasks ? (
          <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
            {r.overdue_tasks}
          </Box>
        ) : (
          <Sub>{r.overdue_tasks == null ? "–" : 0}</Sub>
        ),
    },
  ];
  const u = data.unassigned;

  return (
    <>
      <KpiRow>
        <Kpi label="Open work orders" value={count(data.totals.open)} hint="In the ops phase, not completed" />
        <Kpi label="Late" value={count(data.totals.late)} accent={data.totals.late ? STATUS.critical : undefined} hint="Past their due date" />
        <Kpi
          label={data.role_id ? "No one in this role" : "No one assigned"}
          value={count(data.totals.unassigned)}
          accent={data.totals.unassigned ? STATUS.critical : undefined}
          hint="Open work orders with nobody on the team"
        />
      </KpiRow>
      <Panel
        title="Workload by person"
        subtitle={
          type
            ? `Open ${type} work orders each person is on the team for. Task counts are all of a person's tasks. This is now, not the date range.`
            : "Open ops work orders each person is on the team for, and the tasks assigned to them. This is now, not the date range."
        }
        action={
          <TextField
            select
            size="small"
            label="Role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 200, "& .MuiInputBase-root": { fontSize: "0.8rem" } }}
          >
            <MenuItem value="">Any role</MenuItem>
            {data.roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
        }
      >
        <DataTable
          rowKey={(r) => r.employee_id}
          initialSort={{ key: "open_work_orders", dir: "desc" }}
          columns={columns}
          rows={data.people}
          footer={
            u.open_work_orders > 0 && (
              <TableRow>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    align={c.align}
                    sx={{ fontFamily: FONT, fontSize: "0.8rem", fontStyle: c.key === "name" ? "italic" : "normal", color: "text.secondary", borderTop: 2, borderColor: "divider" }}
                  >
                    {c.render ? c.render(u) : u[c.key]}
                  </TableCell>
                ))}
              </TableRow>
            )
          }
        />
        {data.people.length === 0 && <Muted>No one has open work orders or tasks.</Muted>}
      </Panel>
    </>
  );
}

/* ═══ Overview ═══════════════════════════════════════════════════════ */

export function OverviewSection({ data, onOpen, onSelectType }) {
  const m = data.margin.totals;
  const f = data.fulfillment.totals;
  const up = data.sourcing.totals.upcoming;
  const link = (tab, text) => (
    <Typography
      component="button"
      onClick={() => onOpen(tab)}
      sx={{ all: "unset", cursor: "pointer", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "secondary.main", mt: 0.5, display: "inline-block", "&:hover": { textDecoration: "underline" } }}
    >
      {text} →
    </Typography>
  );
  return (
    <>
      <KpiRow>
        <Kpi label="Work order margin" value={<MarginValue value={m.margin_pct} size="2rem" />} hint={`${money(m.revenue, { compact: true })} revenue`}>
          {link("margin", "Margin")}
        </Kpi>
        <Kpi label="On time" value={percent(f.on_time_pct)} hint={`${count(f.done)} completed`}>
          {link("fulfillment", "Fulfillment")}
        </Kpi>
        <Kpi label="Open and late" value={count(f.late_open)} accent={f.late_open ? STATUS.critical : undefined} hint="Work orders past due">
          {link("fulfillment", "See them")}
        </Kpi>
        <Kpi
          label="Upcoming lines sourced"
          value={percent(up.sourced_pct)}
          hint={`${count(up.total - up.sourced)} still to source${data.type ? " · all types" : ""}`}
        >
          {link("sourcing", "Sourcing")}
        </Kpi>
        <Kpi label="In finance" value={money(data.finance.totals.revenue, { compact: true })} hint={`${count(data.finance.totals.count)} work orders`}>
          {link("finance", "Pipeline")}
        </Kpi>
      </KpiRow>
      <Grid>
        {data.type ? (
          <Panel title={`${data.type} revenue by month`} subtitle="Client price on work orders due that month, cancelled left out.">
            <Box sx={{ px: 1, pb: 1 }}>
              <ColumnChart
                ariaLabel={`${data.type} revenue by month`}
                height={220}
                format={(v) => money(v, { compact: true })}
                data={data.margin.by_month.map((x) => ({ key: x.key, label: fmtMonth(x.key), value: x.revenue, tip: monthTip(x) }))}
              />
            </Box>
          </Panel>
        ) : (
          <SourcingByServiceLine sourcing={data.sourcing} compact />
        )}
        <Panel title={data.type ? `${data.type} margin by month` : "Work order margin by month"} subtitle="By due date">
          <Box sx={{ px: 1, pb: 1 }}>
            <MarginTrend margin={data.margin} height={220} />
          </Box>
        </Panel>
      </Grid>
      {!data.type && data.type_scorecard.length > 0 && (
        <Panel
          title="By work order type"
          subtitle="Click a type to see the whole report for it."
          action={link("types", "More detail")}
          sx={{ mt: 2 }}
        >
          <TypeScorecard data={data} compact onSelect={onSelectType} />
        </Panel>
      )}
    </>
  );
}
