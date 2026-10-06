import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Chip, Tooltip, Typography, alpha } from "@mui/material";

import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";
// Adjust this path to wherever constants/ lives relative to this page.
import { getServiceLineConfig } from "../../*/constants/serviceLineConfig";

/**
 * GET /api/sites returns, per site:
 *   service_lines: [{ contract_site_id, service_line, status, status_color,
 *                     status_key, is_current, starts_on, ends_on }]
 *   status: { key, name, color }   — the site's rolled-up status
 *
 * Line and site statuses are worked out server-side from contract dates
 * (vw_ServiceLineStatus / vw_SiteStatus). This page only displays them.
 */

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

/** Char(n) columns come back space-padded; treat "" as missing. */
const clean = (v) => (typeof v === "string" ? v.trim() || null : (v ?? null));

const normalizeServiceLine = (sl) => {
  if (sl == null) return null;
  const name = typeof sl === "string" ? sl : (sl.service_line ?? sl.name);
  if (!name) return null;
  return {
    contract_site_id: sl.contract_site_id ?? null,
    service_line: String(name),
    status: sl.status ?? null,
    status_key: sl.status_key ?? "active",
    // Older API shapes had no is_current; treat those lines as current.
    is_current: sl.is_current ?? true,
    starts_on: sl.starts_on ?? null,
    ends_on: sl.ends_on ?? null,
  };
};

/** Lines the site has TODAY (active + upcoming). Removed/ended are hidden. */
const getCurrentLines = (site) =>
  (site?.service_lines ?? [])
    .map(normalizeServiceLine)
    .filter((sl) => sl && sl.is_current);

const lineTooltip = (sl) => {
  if (sl.status_key === "upcoming") return `Starts ${fmtDay(sl.starts_on)}`;
  if (sl.ends_on) return `Active · last day ${fmtDay(sl.ends_on)}`;
  return "Active";
};

const SITE_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "inactive", label: "Inactive" },
  { value: "none", label: "No contracts" },
];

/** One service line chip: the line's own icon and colour from the config. */
function LineChip({ line }) {
  const { color, icon: Icon } = getServiceLineConfig(line.service_line);
  const upcoming = line.status_key === "upcoming";
  return (
    <Tooltip title={lineTooltip(line)} arrow enterDelay={300}>
      <Chip
        icon={<Icon />}
        label={line.service_line}
        size="small"
        sx={{
          height: 24,
          fontWeight: 600,
          fontSize: "0.72rem",
          color: "text.primary",
          bgcolor: alpha(color, upcoming ? 0.05 : 0.12),
          border: `1px ${upcoming ? "dashed" : "solid"} ${alpha(color, 0.45)}`,
          opacity: upcoming ? 0.85 : 1,
          "& .MuiChip-icon": { color, fontSize: 15, ml: 0.75 },
        }}
      />
    </Tooltip>
  );
}

function Sites() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [serviceLineFilter, setServiceLineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/sites")
      .then((response) => {
        setSites(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => console.error("Error fetching sites:", error))
      .finally(() => setLoading(false));
  }, []);

  // Distinct clients present in the data — drives the client filter.
  const clientOptions = useMemo(() => {
    const map = new Map();
    for (const s of sites) {
      if (s.client_id)
        map.set(s.client_id, s.client || `Client ${s.client_id}`);
    }
    return [...map.entries()]
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .map(([value, label]) => ({ value, label }));
  }, [sites]);

  // Distinct service line names among CURRENT lines.
  const serviceLineOptions = useMemo(() => {
    const set = new Set();
    for (const s of sites) {
      for (const sl of getCurrentLines(s)) set.add(sl.service_line);
    }
    return [...set].sort().map((name) => ({ value: name, label: name }));
  }, [sites]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (q) {
        const lines = getCurrentLines(s)
          .map((sl) => sl.service_line)
          .join(" ");
        const hay = [
          s.store,
          s.client,
          s.mailing_address,
          s.mailing_address2,
          s.mailing_city,
          clean(s.mailing_state),
          s.mailing_zipcode,
          lines,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (clientFilter !== "all" && s.client_id !== Number(clientFilter))
        return false;

      if (
        serviceLineFilter !== "all" &&
        !getCurrentLines(s).some((sl) => sl.service_line === serviceLineFilter)
      )
        return false;

      if (statusFilter !== "all" && (s.status_key ?? "none") !== statusFilter)
        return false;

      return true;
    });
  }, [sites, search, clientFilter, serviceLineFilter, statusFilter]);

  const columns = useMemo(
    () => [
      {
        field: "store",
        headerName: "Site",
        flex: 1,
        minWidth: 130,
        valueGetter: (value) => value || "Unnamed site",
      },
      {
        field: "client",
        headerName: "Client",
        flex: 1,
        minWidth: 140,
        // `client` is serialized to a plain string server-side; fall back
        // gracefully if an object ever slips through.
        valueGetter: (value) =>
          typeof value === "string" ? value || "—" : (value?.client ?? "—"),
      },
      {
        field: "mailing_address",
        headerName: "Address",
        flex: 1.3,
        minWidth: 170,
        valueGetter: (value, row) =>
          [clean(value), clean(row.mailing_address2)]
            .filter(Boolean)
            .join(", ") || "—",
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
        width: 130,
        // Sort/export by the label, not the key.
        valueGetter: (value, row) => row.status_name ?? "No contracts",
        renderCell: (params) => {
          const color = params.row.status_color ?? "#9CA3AF";
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                height: "100%",
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: color,
                  flexShrink: 0,
                }}
              />
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                {params.value}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "service_lines",
        headerName: "Service Lines",
        flex: 1.8,
        minWidth: 280,
        sortable: false,
        // Sorting/filtering/export need a primitive, not the object array.
        valueGetter: (value, row) =>
          getCurrentLines(row)
            .map((sl) => sl.service_line)
            .join(", "),
        renderCell: (params) => {
          const lines = getCurrentLines(params.row);

          if (lines.length === 0)
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Typography sx={{ color: "text.disabled", fontSize: "0.8rem" }}>
                  —
                </Typography>
              </Box>
            );

          const visible = lines.slice(0, 3);
          const rest = lines.slice(3);

          return (
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                alignItems: "center",
                height: "100%",
                flexWrap: "nowrap",
                overflow: "hidden",
              }}
            >
              {visible.map((sl, i) => (
                <LineChip
                  key={sl.contract_site_id ?? `${sl.service_line}-${i}`}
                  line={sl}
                />
              ))}
              {rest.length > 0 && (
                <Tooltip
                  title={rest.map((sl) => sl.service_line).join(", ")}
                  arrow
                >
                  <Chip
                    label={`+${rest.length}`}
                    size="small"
                    sx={{ height: 24, fontWeight: 600, fontSize: "0.72rem" }}
                  />
                </Tooltip>
              )}
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <ListPageLayout
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search sites, addresses, zip codes…"
          filters={[
            {
              label: "Client",
              value: clientFilter,
              onChange: setClientFilter,
              options: clientOptions,
            },
            {
              label: "Service Line",
              value: serviceLineFilter,
              onChange: setServiceLineFilter,
              options: serviceLineOptions,
            },
            {
              label: "Status",
              value: statusFilter,
              onChange: setStatusFilter,
              options: SITE_STATUS_OPTIONS,
            },
          ]}
        />
      }
    >
      <ListDataGrid
        rows={filteredSites}
        columns={columns}
        loading={loading}
        exportFileName="sites"
        onRowClick={(row) => navigate(`/sites/${row.id}`)}
      />
    </ListPageLayout>
  );
}

export default Sites;
