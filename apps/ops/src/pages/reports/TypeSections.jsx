// pages/Reports/TypeSections.jsx
//
// The work order type scorecard: one row per type. The Pillars tab shows it
// once for On Demand's types and once for Projects'; clicking a row filters
// the whole report to that type.
import { useMemo } from "react";
import { Box } from "@mui/material";

import {
  DataTable,
  FONT,
  MARGIN_TARGET,
  MarginValue,
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
export function TypeScorecard({ data, rows: only, compact, selected, onSelect }) {
  const rows = only ?? data.type_scorecard;
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
