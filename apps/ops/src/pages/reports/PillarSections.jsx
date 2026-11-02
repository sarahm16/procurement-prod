// pages/Reports/PillarSections.jsx
//
// Reporting by pillar:
//   Planned Maintenance  snow and landscaping contract lines, subcontracted or
//                        self-performed. Its work orders run in UtilizeCore,
//                        so here it's sourcing, vendors and pricing.
//   On Demand            every work order type except Project
//   Projects             Project work orders
// Which service lines and types belong where is decided on the server
// (services/reports/pillars.js); the summary's `pillars` carries the result.
import { Box, ButtonBase, TableCell, TableRow, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

import {
  DataTable,
  FONT,
  Legend,
  MarginValue,
  Panel,
  STATUS,
  StackedBar,
  count,
  money,
  percent,
  useSeriesColor,
} from "./reportUi";
import { TypeScorecard } from "./TypeSections";

/* ── Filter values ── */

export const PILLAR_OPTIONS = [
  { value: "", label: "All pillars" },
  { value: "planned_maintenance", label: "Planned Maintenance" },
  { value: "pm_subcontracted", label: "Subcontracted", indent: true, chip: "Planned Maintenance · Subcontracted" },
  { value: "pm_self", label: "Self-performed", indent: true, chip: "Planned Maintenance · Self-performed" },
  { value: "on_demand", label: "On Demand" },
  { value: "projects", label: "Projects" },
];
export const pillarLabel = (v) => {
  const o = PILLAR_OPTIONS.find((p) => p.value === v);
  return o?.chip ?? o?.label ?? "";
};
export const isPmPillar = (v) => v === "planned_maintenance" || v === "pm_subcontracted" || v === "pm_self";
export const isWoPillar = (v) => v === "on_demand" || v === "projects";

/** The pillar a work order type belongs to, from the summary. */
export const pillarOfType = (data, type) =>
  data?.pillars?.projects?.types?.some((t) => t.type === type) ? "projects" : "on_demand";

const SELF_COLOR = "#8a5cd1";
const Sub = ({ children }) => (
  <Box component="span" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
    {children}
  </Box>
);
const Muted = ({ children }) => (
  <Typography sx={{ fontFamily: FONT, fontSize: "0.8rem", color: "text.secondary", p: 2 }}>{children}</Typography>
);

/** Small label/value pairs in a row. */
function Stat({ label, value, hint, accent }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "0.64rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.45rem",
          lineHeight: 1.15,
          color: accent ?? "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Box>
      {hint && (
        <Typography sx={{ fontFamily: FONT, fontSize: "0.7rem", color: "text.secondary", whiteSpace: "nowrap" }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
const StatGrid = ({ children, min = 110 }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 1.5 }}>{children}</Box>
);

/* ── The three pillar cards ── */

function PillarCard({ title, caption, selected, onClick, children }) {
  const theme = useTheme();
  const series = useSeriesColor();
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        textAlign: "left",
        width: "100%",
        borderRadius: 2,
        border: `1px solid ${selected ? series : theme.palette.divider}`,
        boxShadow: selected ? `0 0 0 1px ${series}` : "none",
        bgcolor: selected ? alpha(series, 0.05) : "background.paper",
        px: 2,
        py: 1.5,
        transition: "border-color .15s, background-color .15s",
        "&:hover": { borderColor: series },
      }}
    >
      <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "1rem" }}>{title}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.secondary", mb: 1.25 }}>{caption}</Typography>
      {children}
    </ButtonBase>
  );
}

function WoStats({ p }) {
  return (
    <StatGrid min={92}>
      <Stat label="Work orders" value={count(p.work_orders)} hint="due in range" />
      <Stat label="Revenue" value={money(p.revenue, { compact: true })} />
      <Stat label="Margin" value={<MarginValue value={p.margin_pct} size="1.45rem" />} />
      <Stat label="On time" value={percent(p.on_time_pct)} hint={`of ${count(p.with_checkout)}`} />
      <Stat label="Open now" value={count(p.open_now)} />
      <Stat label="Late now" value={count(p.late_now)} accent={p.late_now ? STATUS.critical : undefined} />
    </StatGrid>
  );
}

function PmStats({ pm }) {
  const sub = pm.subcontracted;
  const self = pm.self_performed;
  return (
    <StatGrid min={118}>
      <Stat label="Lines" value={count(sub.lines + self.lines)} hint="active + upcoming" />
      <Stat label="Subcontracted" value={count(sub.lines)} hint={`${count(sub.vendors)} vendors`} />
      <Stat label="Self-performed" value={count(self.lines)} hint={`${count(self.sites)} sites`} />
      <Stat label="Sourced" value={percent(sub.sourced_pct)} hint="subcontracted lines" />
      <Stat
        label="Start in 30 days"
        value={count(sub.starting_soon_unsourced)}
        accent={sub.starting_soon_unsourced ? STATUS.critical : undefined}
        hint="not sourced"
      />
      <Stat label="Margin" value={<MarginValue value={sub.margin_pct} size="1.45rem" />} hint="projected, priced lines" />
    </StatGrid>
  );
}

/** Three cards side by side. Clicking one filters the report to that pillar. */
export function PillarCards({ data, onSelect }) {
  const p = data.pillars;
  const sel = data.pillar;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(3, 1fr)" }, gap: 1.5 }}>
      <PillarCard
        title="Planned Maintenance"
        caption="Snow and landscaping lines · work orders run in UtilizeCore"
        selected={isPmPillar(sel)}
        onClick={() => onSelect?.("planned_maintenance")}
      >
        <PmStats pm={p.planned_maintenance} />
      </PillarCard>
      <PillarCard
        title="On Demand"
        caption={`${p.on_demand.types.length} work order types`}
        selected={sel === "on_demand"}
        onClick={() => onSelect?.("on_demand")}
      >
        <WoStats p={p.on_demand} />
      </PillarCard>
      <PillarCard title="Projects" caption="Project work orders" selected={sel === "projects"} onClick={() => onSelect?.("projects")}>
        <WoStats p={p.projects} />
      </PillarCard>
    </Box>
  );
}

/* ── Planned Maintenance: service line × subcontracted / self-performed ── */

/** compact: fewer columns, for the Overview. */
export function PmTable({ pm, compact }) {
  const series = useSeriesColor();
  const rows = pm.service_lines;
  const total = { service_line: "All Planned Maintenance", subcontracted: pm.subcontracted, self_performed: pm.self_performed };
  const all = [
    { key: "service_line", label: "Service line", render: (r) => <b>{r.service_line}</b> },
    {
      key: "split",
      label: "Split",
      nosort: true,
      width: 140,
      render: (r) => (
        <Box sx={{ width: 120 }}>
          <StackedBar
            height={10}
            segments={[
              { label: "Subcontracted", value: r.subcontracted.lines, color: series },
              { label: "Self-performed", value: r.self_performed.lines, color: SELF_COLOR },
            ]}
          />
        </Box>
      ),
    },
    { key: "sub_lines", label: "Subcontracted", align: "right", sort: (r) => r.subcontracted.lines, render: (r) => count(r.subcontracted.lines) },
    {
      key: "sub_sourced",
      label: "Sourced",
      align: "right",
      sort: (r) => r.subcontracted.sourced_pct,
      render: (r) => (
        <>
          {percent(r.subcontracted.sourced_pct)} <Sub>· {count(r.subcontracted.sourced)}</Sub>
        </>
      ),
    },
    { key: "sub_up", label: "Upcoming", align: "right", sort: (r) => r.subcontracted.upcoming_sourced_pct, render: (r) => percent(r.subcontracted.upcoming_sourced_pct) },
    {
      key: "sub_none",
      label: "No vendor",
      align: "right",
      sort: (r) => r.subcontracted.no_vendor,
      render: (r) =>
        r.subcontracted.no_vendor ? (
          <Box component="span" sx={{ color: "error.main", fontWeight: 700 }}>
            {count(r.subcontracted.no_vendor)}
          </Box>
        ) : (
          <Sub>0</Sub>
        ),
    },
    { key: "sub_margin", label: "Margin", align: "right", sort: (r) => r.subcontracted.margin_pct, render: (r) => <MarginValue value={r.subcontracted.margin_pct} /> },
    { key: "self_lines", label: "Self-performed", align: "right", sort: (r) => r.self_performed.lines, render: (r) => count(r.self_performed.lines) },
    { key: "self_sites", label: "Sites", align: "right", sort: (r) => r.self_performed.sites, render: (r) => count(r.self_performed.sites) },
  ];
  const columns = compact ? all.filter((c) => !["split", "sub_up", "sub_none", "self_sites"].includes(c.key)) : all;
  return (
    <>
      <DataTable
        rowKey={(r) => r.service_line}
        columns={columns}
        rows={rows}
        footer={rows.length > 1 && <TotalsRow columns={columns} row={total} />}
      />
      {rows.length === 0 && <Muted>No active or upcoming snow or landscaping lines.</Muted>}
    </>
  );
}

function TotalsRow({ columns, row }) {
  return (
    <TableRow>
      {columns.map((c) => (
        <TableCell
          key={c.key}
          align={c.align}
          sx={{
            fontFamily: FONT,
            fontSize: "0.8rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
            borderTop: 2,
            borderBottom: 0,
            borderColor: "divider",
          }}
        >
          {c.render(row)}
        </TableCell>
      ))}
    </TableRow>
  );
}

/* ── The Pillars tab ── */

export function PillarsSection({ data, onSelectPillar, onSelectType }) {
  const p = data.pillars;
  const series = useSeriesColor();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <PillarCards data={data} onSelect={onSelectPillar} />

      <Panel
        title="Planned Maintenance"
        subtitle="Active and upcoming snow and landscaping lines, now. Subcontracted lines need a sourced vendor (Sourced is all of them, Upcoming is upcoming ones); self-performed lines and their sites are done by our crews. Margin is projected from client and vendor pricing on lines that have both."
        action={
          <Legend
            items={[
              { label: "Subcontracted", color: series },
              { label: "Self-performed", color: SELF_COLOR },
            ]}
          />
        }
      >
        <PmTable pm={p.planned_maintenance} />
      </Panel>

      <Panel
        title="On Demand"
        subtitle="Every work order type except Project. Work orders, revenue, margin and on time are for work orders due in the date range; open, late and finance are now. Click a type to filter the report to it."
      >
        <TypeScorecard data={data} rows={p.on_demand.types} selected={data.type} onSelect={onSelectType} />
        {p.on_demand.types.length === 0 && <Muted>No On Demand work orders yet.</Muted>}
      </Panel>

      <Panel title="Projects" subtitle="Project work orders. Same columns as On Demand.">
        <TypeScorecard data={data} rows={p.projects.types} selected={data.type} onSelect={onSelectType} />
        {p.projects.types.length === 0 && <Muted>No Project work orders yet.</Muted>}
      </Panel>
    </Box>
  );
}
