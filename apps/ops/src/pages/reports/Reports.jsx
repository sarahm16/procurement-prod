// pages/Reports/Reports.jsx
//
// Company-wide numbers for management, by pillar: Planned Maintenance (snow
// and landscaping lines, subcontracted or self-performed), On Demand and
// Projects. Plus margin, work order fulfillment, sourcing by service line,
// vendor performance, ops workload and the finance pipeline. The personal
// view is the Dashboard.
//
// The pillar filter limits the report to one pillar. Planned Maintenance
// work orders run in UtilizeCore, so for it the work order tabs say so and
// the report is sourcing and pricing. The type filter narrows On Demand or
// Projects to one work order type.
//
// The date range applies to work orders (by due date) and notices (by date
// sent). Sourcing, workload and the finance pipeline are always "now".
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

import GeneralPageLayout from "../../components/GeneralPageLayout";
import { FONT } from "./reportUi";
import {
  ElsewhereNote,
  FinanceSection,
  FulfillmentSection,
  MarginSection,
  OverviewSection,
  SourcingSection,
  VendorsSection,
  WorkloadSection,
} from "./ReportSections";
import { PILLAR_OPTIONS, PillarsSection, isPmPillar, pillarLabel, pillarOfType } from "./PillarSections";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pillars", label: "Pillars" },
  { key: "sourcing", label: "Sourcing" },
  { key: "fulfillment", label: "Fulfillment" },
  { key: "margin", label: "Margin" },
  { key: "vendors", label: "Vendors" },
  { key: "workload", label: "Workload" },
  { key: "finance", label: "Finance" },
];
// Tabs the date range doesn't affect.
const NOW_TABS = ["sourcing", "workload", "finance"];
// Work order tabs: nothing to show for Planned Maintenance (UtilizeCore).
const WO_TABS = { fulfillment: "fulfillment data", vendors: "vendor work order data", finance: "finance pipeline" };

const p2 = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

function presetRange(key, now = new Date()) {
  const y = now.getFullYear();
  const today = iso(now);
  switch (key) {
    case "month":
      return { from: `${y}-${p2(now.getMonth() + 1)}-01`, to: today };
    case "90":
      return { from: iso(new Date(y, now.getMonth(), now.getDate() - 89)), to: today };
    case "12m":
      return { from: iso(new Date(y, now.getMonth() - 11, 1)), to: today };
    case "last":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "ytd":
    default:
      return { from: `${y}-01-01`, to: today };
  }
}

const PRESETS = [
  { key: "month", label: "This month" },
  { key: "90", label: "Last 90 days" },
  { key: "ytd", label: "Year to date" },
  { key: "12m", label: "Last 12 months" },
  { key: "last", label: "Last year" },
  { key: "custom", label: "Custom…" },
];

const remember = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private window etc. */
  }
};
const recall = (k, fallback) => {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
};

export default function Reports() {
  const theme = useTheme();
  const [tab, setTab] = useState(() => {
    const t = recall("reports.tab", "overview");
    return TABS.some((x) => x.key === t) ? t : t === "types" ? "pillars" : "overview";
  });
  const [preset, setPreset] = useState(() => recall("reports.range", "ytd"));
  const [custom, setCustom] = useState(() => presetRange("ytd"));
  const range = useMemo(() => (preset === "custom" ? custom : presetRange(preset)), [preset, custom]);
  const [pillar, setPillar] = useState(() => {
    const p = recall("reports.pillar", "");
    return PILLAR_OPTIONS.some((o) => o.value === p) ? p : "";
  });
  const [woType, setWoType] = useState(() => recall("reports.type", ""));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!range.from || !range.to || range.from > range.to) return;
    setLoading(true);
    try {
      const { data: d } = await axios.get("/api/reports/summary", {
        params: { ...range, ...(pillar && { pillar }), ...(woType && !isPmPillar(pillar) && { type: woType }) },
      });
      setData(d);
      setError("");
    } catch (e) {
      console.error("Error loading reports:", e);
      setError(e?.response?.data?.error ?? "Couldn't load the reports.");
    } finally {
      setLoading(false);
    }
  }, [range, pillar, woType]);

  useEffect(() => {
    load();
  }, [load]);

  const openTab = (key) => {
    setTab(key);
    remember("reports.tab", key);
  };

  const chooseType = (type) => {
    setWoType(type);
    remember("reports.type", type);
  };
  const choosePillar = (p) => {
    setPillar(p);
    remember("reports.pillar", p);
    // A type from another pillar no longer fits.
    if (woType && (isPmPillar(p) || (p && data && pillarOfType(data, woType) !== p))) chooseType("");
  };
  // From the pillar cards: filter to that pillar (or back to all) and show its overview.
  const selectPillar = (p) => {
    choosePillar(p === pillar ? "" : p);
    openTab("overview");
  };
  // From a type scorecard: filter to that type (and its pillar).
  const selectType = (type) => {
    if (type === woType) {
      chooseType("");
    } else {
      chooseType(type);
      const p = pillarOfType(data, type);
      setPillar(p);
      remember("reports.pillar", p);
    }
    openTab("overview");
  };

  const pm = isPmPillar(pillar);
  // Types to offer: the selected pillar's, or all of them.
  const types = useMemo(() => {
    if (!data) return woType ? [woType] : [];
    if (pillar === "on_demand" || pillar === "projects") return data.pillars[pillar].types.map((t) => t.type);
    return data.types;
  }, [data, pillar, woType]);
  const typeApplies = tab !== "sourcing" && !pm;

  const rangeText = `${new Date(`${range.from}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(`${range.to}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const rangeApplies = !NOW_TABS.includes(tab) && !(pm && tab !== "pillars");

  const section = () => {
    if (tab === "workload") return <WorkloadSection pillar={pillar || null} type={(!pm && woType) || null} />;
    if (!data) return null;
    if (data.work_orders_elsewhere && WO_TABS[tab]) return <ElsewhereNote what={WO_TABS[tab]} />;
    switch (tab) {
      case "pillars":
        return <PillarsSection data={data} onSelectPillar={selectPillar} onSelectType={selectType} />;
      case "sourcing":
        return <SourcingSection data={data} />;
      case "fulfillment":
        return <FulfillmentSection data={data} />;
      case "margin":
        return <MarginSection data={data} />;
      case "vendors":
        return <VendorsSection data={data} />;
      case "finance":
        return <FinanceSection data={data} />;
      default:
        return (
          <OverviewSection data={data} onOpen={openTab} onSelectPillar={selectPillar} />
        );
    }
  };

  return (
    <GeneralPageLayout>
      <Box sx={{ maxWidth: 1440, mx: "auto", pt: 3 }}>
        {/* Header + filters in one row */}
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexWrap: "wrap", mb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700, fontSize: "1.8rem" }}>
              Reports
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: "0.82rem", color: "text.secondary" }}>
              {pm && tab !== "pillars"
                ? "Planned Maintenance lines as of today."
                : rangeApplies
                  ? `Work orders due ${rangeText}`
                  : "As of today. The date range doesn't apply to this tab."}
            </Typography>
            {(pillar || (woType && typeApplies)) && (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
                {pillar && (
                  <Chip
                    label={`${pillarLabel(pillar)} only`}
                    onDelete={() => choosePillar("")}
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{ fontFamily: FONT, fontWeight: 600 }}
                  />
                )}
                {woType && typeApplies && (
                  <Chip
                    label={`${woType} work orders only`}
                    onDelete={() => chooseType("")}
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{ fontFamily: FONT, fontWeight: 600 }}
                  />
                )}
              </Box>
            )}
          </Box>
          <TextField
            select
            size="small"
            label="Pillar"
            value={pillar}
            onChange={(e) => choosePillar(e.target.value)}
            SelectProps={{ displayEmpty: true, renderValue: (v) => {
                const o = PILLAR_OPTIONS.find((x) => x.value === v);
                return !o ? "All pillars" : o.indent ? `PM · ${o.label}` : o.label;
              } }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 210 }}
          >
            {PILLAR_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={o.indent ? { pl: 4, fontSize: "0.88rem" } : undefined}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Work order type"
            value={types.includes(woType) ? woType : ""}
            onChange={(e) => chooseType(e.target.value)}
            disabled={!typeApplies}
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }}
          >
            <MenuItem value="">All types</MenuItem>
            {types.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Date range"
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              remember("reports.range", e.target.value);
            }}
            disabled={!rangeApplies}
            sx={{ width: 170 }}
          >
            {PRESETS.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          {preset === "custom" && rangeApplies && (
            <>
              <TextField
                type="date"
                size="small"
                label="From"
                value={custom.from}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={custom.from > custom.to}
              />
              <TextField
                type="date"
                size="small"
                label="To"
                value={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                error={custom.from > custom.to}
              />
            </>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
            sx={{ height: 40 }}
          >
            Refresh
          </Button>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => openTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            "& .MuiTab-root": { fontFamily: FONT, fontWeight: 600, textTransform: "none", fontSize: "0.85rem", minWidth: 0, px: 1.5 },
          }}
        >
          {TABS.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>

        {error && tab !== "workload" && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!data && loading && tab !== "workload" ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={26} color="secondary" />
          </Box>
        ) : (
          <Box sx={{ opacity: loading && tab !== "workload" ? 0.6 : 1, transition: "opacity .15s", pb: 4 }}>{section()}</Box>
        )}
      </Box>
    </GeneralPageLayout>
  );
}
