// pages/Reports/TypeSections.jsx
//
// Reporting by work order type. The scorecard puts every type side by side;
// clicking a row filters the whole report to that type. Who's responsible
// for what lives on the records themselves (Account Manager on the work
// order, client or site), not here.
import { useMemo } from "react";
import { Box, Typography } from "@mui/material";

import {
  DataTable,
  FONT,
  Kpi,
  MARGIN_TARGET,
  MarginValue,
  Panel,
  STATUS,
  Sparkline,
  count,
  fmtMonth,
  money,
  percent,
} from "./reportUi";

const Sub = ({ children }) => (
  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
    {children}
  </Box>
);

/** One row per work order type. compact: fewer columns, for the Overview. */
export function TypeScorecard({ data, compact, selected, onSelect }) {
  const rows = data.type_scorecard;
  const monthLabels = useMemo(() => {
    const out = [];
    let [y, m] = data.from.slice(0, 7).split("-").map(Number);
    for (let i = 0; i < (rows[0]?.margin_by_month.length ?? 0); i++) {
      out.push(fmtMonth(`${y}-${String(m).padStart(2, "0")}`));
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return out;
  }, [data.from, rows]);

  const columns = [
    {
      key: "type",
      label: "Work order type",
      render: (d) => (
        <Box component="span" sx={{ fontWeight: 700 }}>
          {d.type}
        </Box>
      ),
    },
    { key: "work_orders", label: "Work orders", align: "right", render: (d) => count(d.work_orders) },
    { key: "revenue", label: "Revenue", align: "right", render: (d) => money(d.revenue, { compact }) },
    { key: "margin_pct", label: "Margin", align: "right", render: (d) => <MarginValue value={d.margin_pct} /> },
    ...(compact
      ? []
      : [
          {
            key: "trend",
            label: "Margin by month",
            nosort: true,
            render: (d) => (
              <Sparkline values={d.margin_by_month} labels={monthLabels} refValue={MARGIN_TARGET} format={(v) => `${v.toFixed(1)}%`} />
            ),
          },
        ]),
    {
      key: "on_time_pct",
      label: "On time",
      align: "right",
      render: (d) => (
        <>
          {percent(d.on_time_pct)} {!compact && <Sub>of {count(d.with_checkout)}</Sub>}
        </>
      ),
    },
    { key: "open_now", label: "Open now", align: "right", render: (d) => count(d.open_now) },
    {
      key: "late_now",
      label: "Late now",
      align: "right",
      render: (d) =>
        d.late_now ? (
          <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
            {d.late_now}
          </Box>
        ) : (
          <Sub>0</Sub>
        ),
    },
    ...(compact
      ? []
      : [
          {
            key: "finance_revenue",
            label: "In finance",
            align: "right",
            render: (d) => (
              <>
                {money(d.finance_revenue)} <Sub>· {count(d.finance_count)}</Sub>
              </>
            ),
          },
          { key: "finance_avg_days", label: "Days in finance", align: "right", render: (d) => d.finance_avg_days ?? "–" },
        ]),
  ];

  return (
    <DataTable
      rowKey={(d) => d.type}
      selectedKey={selected}
      onRowClick={onSelect ? (d) => onSelect(d.type) : undefined}
      columns={columns}
      rows={rows}
    />
  );
}

/** The "By type" tab. */
export function TypesSection({ data, onSelect }) {
  const rows = data.type_scorecard;
  const withMargin = rows.filter((d) => d.margin_pct != null);
  const best = withMargin.length ? withMargin.reduce((a, b) => (b.margin_pct > a.margin_pct ? b : a)) : null;
  const worst = withMargin.length ? withMargin.reduce((a, b) => (b.margin_pct < a.margin_pct ? b : a)) : null;
  const mostLate = rows.reduce((a, b) => (b.late_now > (a?.late_now ?? -1) ? b : a), null);
  const tiedLate = mostLate?.late_now ? rows.filter((d) => d.late_now === mostLate.late_now) : [];
  const lateHint = !mostLate?.late_now
    ? "Nothing late"
    : tiedLate.length > 1
      ? `Tied: ${tiedLate.map((d) => d.type).join(", ")}`
      : mostLate.type;
  const biggest = rows.reduce((a, b) => (b.revenue > (a?.revenue ?? -1) ? b : a), null);

  return (
    <>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
        <Kpi
          label="Most revenue"
          value={biggest?.revenue ? money(biggest.revenue, { compact: true }) : "–"}
          hint={biggest?.revenue ? biggest.type : "No priced work orders"}
        />
        <Kpi
          label="Best margin"
          value={best ? <MarginValue value={best.margin_pct} size="2rem" /> : "–"}
          hint={best ? best.type : "No priced work orders"}
        />
        <Kpi
          label="Lowest margin"
          value={worst ? <MarginValue value={worst.margin_pct} size="2rem" /> : "–"}
          hint={worst ? worst.type : "No priced work orders"}
        />
        <Kpi
          label="Most late right now"
          value={count(mostLate?.late_now ?? 0)}
          accent={mostLate?.late_now ? STATUS.critical : undefined}
          hint={lateHint}
        />
      </Box>
      <Panel
        title="By work order type"
        subtitle="Work orders, revenue, margin and on time are for work orders due in the date range. Open, late and finance are right now. Click a type to filter the whole report to it."
      >
        <TypeScorecard data={data} selected={data.type} onSelect={onSelect} />
        {rows.length === 0 && (
          <Typography sx={{ fontFamily: FONT, fontSize: "0.8rem", color: "text.secondary", p: 2 }}>
            No work orders yet.
          </Typography>
        )}
      </Panel>
    </>
  );
}
