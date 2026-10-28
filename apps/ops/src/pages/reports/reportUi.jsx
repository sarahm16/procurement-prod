// pages/Reports/reportUi.jsx
//
// Small building blocks for the Reports page: number formats, stat tiles,
// panels, a sortable table, a stacked status bar, and two SVG charts
// (columns and a line), each with a hover tooltip. No chart library.
import { useMemo, useRef, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export const FONT = '"Barlow", sans-serif';

// Margin thresholds, same as the work order list.
export const MARGIN_TARGET = 50;
export const MARGIN_FLOOR = 47;

/** Status colors carry meaning (good / watch / bad) and always ship with a label or icon. */
export const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };

/** One series → one color. */
export const useSeriesColor = () => (useTheme().palette.mode === "dark" ? "#3987e5" : "#2a78d6");

export function useChartInk() {
  const dark = useTheme().palette.mode === "dark";
  return {
    grid: dark ? "#2c2c2a" : "#e1e0d9",
    axis: dark ? "#383835" : "#c3c2b7",
    muted: dark ? "#c3c2b7" : "#52514e",
    surface: dark ? "#1a1a19" : "#ffffff",
  };
}

/* ── formats ── */

export const money = (n, { compact } = {}) => {
  if (n == null) return "–";
  if (compact && Math.abs(n) >= 1000) {
    return `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
  }
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
};
export const percent = (n) => (n == null ? "–" : `${n.toFixed(1)}%`);
export const count = (n) => (n == null ? "–" : n.toLocaleString("en-US"));
export const fmtDay = (iso, opts = { month: "short", day: "numeric" }) => {
  if (!iso) return "–";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", opts);
};
export const fmtMonth = (key, long) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", long ? { month: "long", year: "numeric" } : { month: "short" });
};

/* ── margin status ── */

export function marginStatus(pctValue) {
  if (pctValue == null) return null;
  if (pctValue >= MARGIN_TARGET) return { key: "good", color: STATUS.good, label: "At or above target", Icon: CheckCircleIcon };
  if (pctValue >= MARGIN_FLOOR) return { key: "warning", color: STATUS.warning, label: "Below target", Icon: WarningAmberRoundedIcon };
  return { key: "critical", color: STATUS.critical, label: "Below floor", Icon: ErrorIcon };
}

/** "48.2%" with a status icon; text stays in ink, the icon carries the color. */
export function MarginValue({ value, size = "0.82rem" }) {
  const s = marginStatus(value);
  if (!s) return <span>–</span>;
  return (
    <Tooltip title={`${s.label} (target ${MARGIN_TARGET}%, floor ${MARGIN_FLOOR}%)`}>
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontVariantNumeric: "tabular-nums" }}>
        <s.Icon sx={{ fontSize: 14, color: s.color }} aria-label={s.label} />
        <Box component="span" sx={{ fontSize: size, fontWeight: 600 }}>
          {percent(value)}
        </Box>
      </Box>
    </Tooltip>
  );
}

/* ── layout ── */

export function Panel({ title, subtitle, action, children, sx }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
        ...sx,
      }}
    >
      {(title || action) && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, px: 2, pt: 1.5, pb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.92rem" }}>{title}</Typography>
            {subtitle && (
              <Typography sx={{ fontFamily: FONT, fontSize: "0.74rem", color: "text.secondary", mt: 0.2 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

export function Kpi({ label, value, hint, accent, children }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        flex: "1 1 170px",
        minWidth: 160,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
        px: 2,
        py: 1.5,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontSize: "2rem",
          fontWeight: 700,
          lineHeight: 1.15,
          color: accent ?? "text.primary",
          fontVariantNumeric: "tabular-nums",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
        }}
      >
        {value}
      </Box>
      {hint && <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.secondary" }}>{hint}</Typography>}
      {children}
    </Box>
  );
}

export function Legend({ items }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
      {items.map((it) => (
        <Box key={it.label} sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
          {it.dashed ? (
            <Box sx={{ width: 14, borderTop: `2px dashed ${it.color}` }} />
          ) : (
            <Box sx={{ width: 10, height: 10, borderRadius: "3px", bgcolor: it.color }} />
          )}
          <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.secondary" }}>{it.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}

/* ── sortable table ── */

/**
 * columns: [{ key, label, align, render(row), sort(row) → value, width }]
 * Click a header to sort; numbers sort high → low first.
 */
export function DataTable({ columns, rows, rowKey, initialSort, onRowClick, dense = true, footer, maxHeight, selectedKey }) {
  const [sort, setSort] = useState(initialSort ?? null); // { key, dir }
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sort ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      if (a.pinned || b.pinned) return a.pinned ? 1 : -1; // "Other" rows stay last
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggle = (key, numeric) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: numeric ? "desc" : "asc" },
    );

  return (
    <Box sx={{ overflowX: "auto", maxHeight, overflowY: maxHeight ? "auto" : undefined }}>
      <Table size={dense ? "small" : "medium"} stickyHeader={Boolean(maxHeight)}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell
                key={c.key}
                align={c.align}
                sx={{
                  fontFamily: FONT,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  whiteSpace: "nowrap",
                  width: c.width,
                  bgcolor: "background.paper",
                }}
              >
                {c.nosort ? (
                  c.label
                ) : (
                  <TableSortLabel
                    active={sort?.key === c.key}
                    direction={sort?.key === c.key ? sort.dir : c.align === "right" ? "desc" : "asc"}
                    onClick={() => toggle(c.key, c.align === "right")}
                  >
                    {c.label}
                  </TableSortLabel>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow
              key={rowKey ? rowKey(r) : i}
              hover={Boolean(onRowClick)}
              selected={selectedKey != null && rowKey?.(r) === selectedKey}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              sx={{ cursor: onRowClick ? "pointer" : "default", "&:last-child td": { borderBottom: 0 } }}
            >
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  align={c.align}
                  sx={{
                    fontFamily: FONT,
                    fontSize: "0.8rem",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                    color: r.pinned ? "text.secondary" : "text.primary",
                  }}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {footer}
        </TableBody>
      </Table>
    </Box>
  );
}

/* ── stacked status bar (sourcing) ── */

/** segments: [{ label, value, color }] — 2px surface gaps between segments. */
export function StackedBar({ segments, total, height = 14 }) {
  const ink = useChartInk();
  const sum = total ?? segments.reduce((s, x) => s + x.value, 0);
  if (!sum) {
    return <Box sx={{ height, borderRadius: "4px", bgcolor: ink.grid }} />;
  }
  const shown = segments.filter((s) => s.value > 0);
  return (
    <Box sx={{ display: "flex", gap: "2px", height, width: "100%" }}>
      {shown.map((s, i) => (
        <Tooltip key={s.label} title={`${s.label}: ${count(s.value)} of ${count(sum)} (${Math.round((s.value / sum) * 100)}%)`}>
          <Box
            sx={{
              flex: `${s.value} 0 0`,
              minWidth: 3,
              bgcolor: s.color,
              borderRadius:
                shown.length === 1 ? "4px" : i === 0 ? "4px 0 0 4px" : i === shown.length - 1 ? "0 4px 4px 0" : 0,
              cursor: "default",
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

/** A thin magnitude bar inside a table cell. */
export function InlineBar({ value, max, width = 90 }) {
  const color = useSeriesColor();
  const ink = useChartInk();
  const w = max > 0 ? Math.max(2, (value / max) * width) : 0;
  return (
    <Box sx={{ display: "inline-flex", width, height: 6, bgcolor: ink.grid, borderRadius: "3px", verticalAlign: "middle" }}>
      <Box sx={{ width: w, bgcolor: color, borderRadius: "3px" }} />
    </Box>
  );
}

/** A tiny trend line for a table cell. values: numbers or null (gaps). */
export function Sparkline({ values, labels = [], width = 96, height = 26, min, max, refValue, format = (v) => v }) {
  const color = useSeriesColor();
  const ink = useChartInk();
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (pts.length === 0) return <Box component="span" sx={{ color: "text.disabled", fontSize: "0.72rem" }}>–</Box>;
  const lo = min ?? Math.min(...pts.map(([, v]) => v), refValue ?? Infinity);
  const hi = max ?? Math.max(...pts.map(([, v]) => v), refValue ?? -Infinity);
  const span = hi - lo || 1;
  const X = (i) => 3 + (i / Math.max(1, values.length - 1)) * (width - 6);
  const Y = (v) => 3 + (1 - (v - lo) / span) * (height - 6);
  const segs = [];
  let cur = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push(`${X(i)},${Y(v)}`);
  });
  if (cur.length) segs.push(cur);
  const [li, lv] = pts[pts.length - 1];
  const title = values
    .map((v, i) => (v == null ? null : `${labels[i] ?? i + 1}: ${format(v)}`))
    .filter(Boolean)
    .join(" · ");
  return (
    <Tooltip title={title}>
      <svg width={width} height={height} style={{ display: "block" }} role="img" aria-label={title}>
        {refValue != null && refValue >= lo && refValue <= hi && (
          <line x1="0" x2={width} y1={Y(refValue)} y2={Y(refValue)} stroke={ink.axis} strokeDasharray="3 3" strokeWidth="1" />
        )}
        {segs.map((s, k) =>
          s.length === 1 ? null : <polyline key={k} points={s.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />,
        )}
        <circle cx={X(li)} cy={Y(lv)} r="2.5" fill={color} />
      </svg>
    </Tooltip>
  );
}

/* ── SVG charts ── */

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function useHover() {
  const [hover, setHover] = useState(null); // { i, x, y }
  return [hover, setHover];
}

function HoverCard({ hover, width, children }) {
  const theme = useTheme();
  if (!hover) return null;
  const left = Math.min(Math.max(hover.x - 80, 0), width - 170);
  return (
    <Box
      sx={{
        position: "absolute",
        top: Math.max(hover.y - 70, 0),
        left,
        width: 170,
        pointerEvents: "none",
        bgcolor: "background.paper",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        boxShadow: 3,
        px: 1.25,
        py: 0.75,
        fontFamily: FONT,
        fontSize: "0.74rem",
        zIndex: 2,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * Columns over categories (months). One series, one color.
 *   data: [{ key, label, value, tip: ReactNode }]
 */
export function ColumnChart({ data, height = 200, format = (v) => v, ariaLabel }) {
  const color = useSeriesColor();
  const ink = useChartInk();
  const ref = useRef(null);
  const [hover, setHover] = useHover();
  const W = 640;
  const pad = { l: 48, r: 8, t: 10, b: 24 };
  const max = niceMax(Math.max(0, ...data.map((d) => d.value ?? 0)));
  const ih = height - pad.t - pad.b;
  const step = (W - pad.l - pad.r) / Math.max(1, data.length);
  const bw = Math.min(36, step * 0.6);
  const ticks = [0, max / 2, max];

  return (
    <Box ref={ref} sx={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block" }}>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={t === 0 ? ink.axis : ink.grid} strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill={ink.muted} fontFamily="Barlow, sans-serif">
                {format(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * step + (step - bw) / 2;
          const h = d.value ? Math.max(2, (d.value / max) * ih) : 0;
          const y = pad.t + ih - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.key}>
              {h > 0 && (
                <path
                  d={`M${x},${pad.t + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + ih} Z`}
                  fill={color}
                  opacity={hover && hover.i !== i ? 0.55 : 1}
                />
              )}
              <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize="10" fill={ink.muted} fontFamily="Barlow, sans-serif">
                {d.label}
              </text>
              {/* hit target: the whole column */}
              <rect
                x={pad.l + i * step}
                y={pad.t}
                width={step}
                height={ih}
                fill="transparent"
                onMouseEnter={() => {
                  const box = ref.current?.getBoundingClientRect();
                  const scale = box ? box.width / W : 1;
                  setHover({ i, x: (x + bw / 2) * scale, y: y * scale });
                }}
              />
            </g>
          );
        })}
      </svg>
      <HoverCard hover={hover} width={ref.current?.getBoundingClientRect().width ?? W}>
        {hover && data[hover.i].tip}
      </HoverCard>
    </Box>
  );
}

/**
 * A line over categories, with optional dashed reference lines.
 *   data: [{ key, label, value|null, tip }]
 *   refs: [{ value, label, color }]
 */
export function LineChart({ data, height = 200, min = 0, max: fixedMax, format = (v) => v, refs = [], ariaLabel }) {
  const color = useSeriesColor();
  const ink = useChartInk();
  const ref = useRef(null);
  const [hover, setHover] = useHover();
  const W = 640;
  const pad = { l: 48, r: 70, t: 10, b: 24 };
  const vals = data.map((d) => d.value).filter((v) => v != null);
  const max = fixedMax ?? niceMax(Math.max(...vals, ...refs.map((r) => r.value), 1));
  const lo = min;
  const ih = height - pad.t - pad.b;
  const step = (W - pad.l - pad.r) / Math.max(1, data.length);
  const X = (i) => pad.l + i * step + step / 2;
  const Y = (v) => pad.t + ih - ((v - lo) / (max - lo)) * ih;
  const ticks = [lo, lo + (max - lo) / 2, max];

  // Break the line where a month has no value.
  const segments = [];
  let cur = [];
  data.forEach((d, i) => {
    if (d.value == null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push([X(i), Y(Math.max(lo, Math.min(max, d.value)))]);
  });
  if (cur.length) segments.push(cur);

  return (
    <Box ref={ref} sx={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={ariaLabel} style={{ display: "block" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke={t === lo ? ink.axis : ink.grid} strokeWidth="1" />
            <text x={pad.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="10" fill={ink.muted} fontFamily="Barlow, sans-serif">
              {format(t)}
            </text>
          </g>
        ))}
        {refs.map((r) => (
          <g key={r.label}>
            <line x1={pad.l} x2={W - pad.r} y1={Y(r.value)} y2={Y(r.value)} stroke={r.color} strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - pad.r + 4} y={Y(r.value) + 4} fontSize="10" fill={ink.muted} fontFamily="Barlow, sans-serif">
              {r.label}
            </text>
          </g>
        ))}
        {segments.map((pts, k) => (
          <polyline key={k} points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {hover && data[hover.i].value != null && (
          <line x1={X(hover.i)} x2={X(hover.i)} y1={pad.t} y2={pad.t + ih} stroke={ink.axis} strokeWidth="1" />
        )}
        {data.map((d, i) =>
          d.value == null ? null : (
            <circle
              key={d.key}
              cx={X(i)}
              cy={Y(Math.max(lo, Math.min(max, d.value)))}
              r={hover?.i === i ? 5 : 4}
              fill={color}
              stroke={ink.surface}
              strokeWidth="2"
            />
          ),
        )}
        {data.map((d, i) => (
          <g key={`x${d.key}`}>
            <text x={X(i)} y={height - 6} textAnchor="middle" fontSize="10" fill={ink.muted} fontFamily="Barlow, sans-serif">
              {d.label}
            </text>
            <rect
              x={X(i) - step / 2}
              y={pad.t}
              width={step}
              height={ih}
              fill="transparent"
              onMouseEnter={() => {
                const box = ref.current?.getBoundingClientRect();
                const scale = box ? box.width / W : 1;
                setHover({ i, x: X(i) * scale, y: (d.value == null ? pad.t + ih / 2 : Y(d.value)) * scale });
              }}
            />
          </g>
        ))}
      </svg>
      <HoverCard hover={hover} width={ref.current?.getBoundingClientRect().width ?? W}>
        {hover && data[hover.i].tip}
      </HoverCard>
    </Box>
  );
}
