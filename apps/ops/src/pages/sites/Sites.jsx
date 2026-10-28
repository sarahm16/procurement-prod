import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ClientSegmentChip from "../../components/ClientSegmentChip/ClientSegmentChip";
import ServiceLineChips, {
  StatusCell,
} from "../../components/ServiceLineChips";
import {
  ChipRow,
  ClearFiltersButton,
  FilterDivider,
  FilterPanel,
  NOBODY,
  OptionsFilter,
  PeopleFilter,
  activeFilterCount,
  countBy,
  passes,
  useSavedFilters,
} from "../../components/ListFilters/ListFilters";

import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import {
  SEGMENTS,
  SEGMENT_LABEL,
  getSegmentConfig,
} from "../../*/constants/clientSegmentConfig";
import { getServiceLineConfig } from "../../*/constants/serviceLineConfig";

/**
 * GET /api/sites returns, per site:
 *   service_lines: [{ contract_site_id, service_line, status, status_color,
 *                     status_key, is_current, starts_on, ends_on }]
 *   status: { key, name, color }   — the site's rolled-up status
 *   client_id, client, segment     — segment comes from the client
 *   role_assignments, client_role_assignments
 *       [{ internal_role_id, role_name, employee_id, employee_name }]
 *       the site's own team, and its client's (see CHANGES.md)
 *
 * Line and site statuses are worked out server-side from contract dates
 * (vw_ServiceLineStatus / vw_SiteStatus). This page only displays them.
 */

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

/** Current lines in the shape ServiceLineChips takes. */
const toChipLines = (row) =>
  getCurrentLines(row).map((sl) => ({
    key: sl.contract_site_id,
    name: sl.service_line,
    status_key: sl.status_key,
    starts_on: sl.starts_on,
    ends_on: sl.ends_on,
  }));

/* ── Filters ──────────────────────────────────────────────────────────── */

const STATUSES = [
  { value: "active", label: "Active", color: "#16a34a" },
  { value: "upcoming", label: "Upcoming", color: "#2563eb" },
  { value: "inactive", label: "Inactive", color: "#6b7280" },
  { value: "none", label: "No contracts", color: "#9ca3af" },
];
const NO_SEGMENT = "__none__";
const NO_STATE = "__none__";

const EMPTY_FILTERS = {
  statuses: [],
  segments: [],
  serviceLines: [],
  clients: [],
  states: [],
  people: [],
};
const FILTERS_KEY = "nfc.sites.filters.v1";

const statusKey = (s) => s.status_key ?? "none";
const segmentKey = (s) => s.segment || NO_SEGMENT;
const stateKey = (s) => clean(s.mailing_state)?.toUpperCase() ?? NO_STATE;
const lineNames = (s) => [
  ...new Set(getCurrentLines(s).map((sl) => sl.service_line)),
];

/**
 * Who's responsible for a site: its own team if it has one, otherwise its
 * client's (a client's account manager covers its sites unless a site has
 * its own). `inherited` says which.
 */
const teamOf = (s) => {
  const own = s.role_assignments ?? [];
  if (own.length) return { people: own, inherited: false };
  return { people: s.client_role_assignments ?? [], inherited: true };
};
const peopleOf = (s) => {
  const names = [
    ...new Set(
      teamOf(s)
        .people.map((a) => a.employee_name)
        .filter(Boolean),
    ),
  ];
  return names.length ? names : [NOBODY];
};

const searchText = (s) =>
  [
    s.store,
    s.client,
    s.mailing_address,
    s.mailing_address2,
    s.mailing_city,
    clean(s.mailing_state),
    s.mailing_zipcode,
    s.segment,
    ...lineNames(s),
    ...teamOf(s).people.map((a) => a.employee_name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/** One test per filter group, so each group can be counted against the rest. */
const makeTests = (q, f) => ({
  search: (s) => !q || searchText(s).includes(q),
  statuses: (s) => !f.statuses.length || f.statuses.includes(statusKey(s)),
  segments: (s) => !f.segments.length || f.segments.includes(segmentKey(s)),
  // A site matches if it currently has ANY of the picked service lines.
  serviceLines: (s) =>
    !f.serviceLines.length ||
    lineNames(s).some((n) => f.serviceLines.includes(n)),
  clients: (s) => !f.clients.length || f.clients.includes(s.client_id),
  states: (s) => !f.states.length || f.states.includes(stateKey(s)),
  people: (s) =>
    !f.people.length || peopleOf(s).some((n) => f.people.includes(n)),
});

/* ── Columns ──────────────────────────────────────────────────────────── */

const columns = [
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
    field: "segment",
    headerName: SEGMENT_LABEL,
    width: 140,
    // From the site's client; read-only.
    valueGetter: (value) => value ?? "",
    renderCell: ({ value }) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        {value ? <ClientSegmentChip segment={value} /> : "—"}
      </Box>
    ),
  },
  {
    field: "status_key",
    headerName: "Status",
    width: 130,
    // Sort/export by the label, not the key.
    valueGetter: (value, row) => row.status_name ?? "No contracts",
    renderCell: (params) => (
      <StatusCell name={params.value} color={params.row.status_color} />
    ),
  },
  {
    field: "service_lines",
    headerName: "Service Lines",
    flex: 1.8,
    minWidth: 280,
    sortable: false,
    // Sorting/filtering/export need a primitive, not the object array.
    valueGetter: (value, row) => lineNames(row).join(", "),
    renderCell: (params) => (
      <ServiceLineChips lines={toChipLines(params.row)} />
    ),
  },
  {
    field: "team",
    headerName: "Account Manager",
    flex: 1,
    minWidth: 160,
    sortable: true,
    valueGetter: (value, row) => {
      const names = peopleOf(row).filter((n) => n !== NOBODY);
      return names.length ? names.join(", ") : "—";
    },
    renderCell: ({ value, row }) =>
      value !== "—" && teamOf(row).inherited ? (
        <Tooltip title="From the client. This site has no account manager of its own.">
          <Box component="span" sx={{ color: "text.secondary" }}>
            {value}
          </Box>
        </Tooltip>
      ) : (
        value
      ),
  },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

function Sites() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useSavedFilters(FILTERS_KEY, EMPTY_FILTERS);
  const set = (key) => (next) => setFilters((f) => ({ ...f, [key]: next }));

  const fetchSites = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/sites");
      setSites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching sites:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const tests = useMemo(
    () => makeTests(search.trim().toLowerCase(), filters),
    [search, filters],
  );
  const filtered = useMemo(
    () => sites.filter((s) => passes(tests, s)),
    [sites, tests],
  );

  /** Options with counts, each group counted against the other groups. */
  const facets = useMemo(() => {
    const without = (skip) => sites.filter((s) => passes(tests, s, skip));
    const forStatuses = without("statuses");
    const forSegments = without("segments");
    const forLines = without("serviceLines");
    const forClients = without("clients");
    const forStates = without("states");
    const forPeople = without("people");

    const statusCounts = countBy(forStatuses, (s) => [statusKey(s)]);
    const segmentCounts = countBy(forSegments, (s) => [segmentKey(s)]);
    const lineCounts = countBy(forLines, lineNames);
    const clientCounts = countBy(forClients, (s) => [s.client_id]);
    const stateCounts = countBy(forStates, (s) => [stateKey(s)]);
    const peopleCounts = countBy(forPeople, peopleOf);

    const segmentNames = [
      ...Object.keys(SEGMENTS),
      ...[...new Set(sites.map((s) => s.segment).filter(Boolean))]
        .filter((n) => !SEGMENTS[n])
        .sort(),
    ];

    const clientNames = new Map();
    for (const s of sites)
      if (s.client_id)
        clientNames.set(s.client_id, s.client || `Client ${s.client_id}`);

    const states = [...new Set(sites.map(stateKey))].sort((a, b) =>
      a === NO_STATE ? 1 : b === NO_STATE ? -1 : a.localeCompare(b),
    );

    // People and their roles, noting who only covers sites through a client.
    const roles = new Map();
    const ownSites = new Set();
    for (const s of sites) {
      const { people, inherited } = teamOf(s);
      for (const a of people) {
        if (!a.employee_name) continue;
        if (!roles.has(a.employee_name)) roles.set(a.employee_name, new Set());
        if (a.role_name) roles.get(a.employee_name).add(a.role_name);
        if (!inherited) ownSites.add(a.employee_name);
      }
    }
    const roleNames = new Set([...roles.values()].flatMap((r) => [...r]));

    return {
      statuses: STATUSES.filter(
        (s) => s.value !== "none" || sites.some((x) => statusKey(x) === "none"),
      ).map((s) => ({
        ...s,
        color:
          sites.find((x) => x.status_key === s.value)?.status_color ?? s.color,
        count: statusCounts.get(s.value) ?? 0,
      })),
      segments: [
        ...segmentNames.map((name) => {
          const cfg = getSegmentConfig(name);
          return {
            value: name,
            label: name,
            color: cfg.color,
            icon: cfg.icon,
            count: segmentCounts.get(name) ?? 0,
          };
        }),
        ...(sites.some((s) => !s.segment)
          ? [
              {
                value: NO_SEGMENT,
                label: "None",
                color: "#9ca3af",
                icon: BlockOutlinedIcon,
                count: segmentCounts.get(NO_SEGMENT) ?? 0,
                title: `The client has no ${SEGMENT_LABEL.toLowerCase()} set`,
              },
            ]
          : []),
      ],
      serviceLines: [...new Set(sites.flatMap(lineNames))]
        .sort()
        .map((name) => {
          const cfg = getServiceLineConfig(name);
          return {
            value: name,
            label: name,
            color: cfg.color,
            icon: cfg.icon,
            count: lineCounts.get(name) ?? 0,
          };
        }),
      clients: [...clientNames]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
        .map(([value, label]) => ({
          value,
          label,
          count: clientCounts.get(value) ?? 0,
        })),
      states: states.map((st) => ({
        value: st,
        label: st === NO_STATE ? "No state" : st,
        count: stateCounts.get(st) ?? 0,
      })),
      people: [
        ...[...roles.keys()]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => {
            const r = [...roles.get(name)].sort();
            const via = ownSites.has(name) ? "" : "through clients";
            const detail =
              [roleNames.size > 1 ? r.join(", ") : "", via]
                .filter(Boolean)
                .join(" · ") || undefined;
            return { name, count: peopleCounts.get(name) ?? 0, detail };
          }),
        { name: NOBODY, count: peopleCounts.get(NOBODY) ?? 0 },
      ],
      peopleNoun:
        roleNames.size === 1
          ? (() => {
              const r = [...roleNames][0].toLowerCase();
              return { one: r, many: `${r}s` };
            })()
          : { one: "account manager", many: "account managers" },
      totals: {
        statuses: forStatuses.length,
        segments: forSegments.length,
        serviceLines: forLines.length,
      },
    };
  }, [sites, tests]);

  const activeCount = activeFilterCount(filters);

  return (
    <ListPageLayout
      toolbar={
        <FilterPanel>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "flex-start",
              flexWrap: { xs: "wrap", lg: "nowrap" },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <ChipRow
                label="Status"
                options={facets.statuses}
                selected={filters.statuses}
                onChange={set("statuses")}
                total={facets.totals.statuses}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "center",
                flexShrink: 0,
                ml: "auto",
                flexWrap: "wrap",
              }}
            >
              <OptionsFilter
                options={facets.clients}
                selected={filters.clients}
                onChange={set("clients")}
                noun={{ one: "client", many: "clients" }}
              />
              <OptionsFilter
                options={facets.states}
                selected={filters.states}
                onChange={set("states")}
                noun={{ one: "state", many: "states" }}
                width={220}
              />
              <PeopleFilter
                options={facets.people}
                selected={filters.people}
                onChange={set("people")}
                me={user?.name}
                noun={facets.peopleNoun}
              />
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    size="small"
                    onClick={fetchSites}
                    disabled={loading}
                    sx={{ color: "text.secondary" }}
                  >
                    <RefreshIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <FilterDivider />

          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: { xs: "column", xl: "row" },
                gap: { xs: 1.25, xl: 4 },
              }}
            >
              <ChipRow
                label={SEGMENT_LABEL}
                options={facets.segments}
                selected={filters.segments}
                onChange={set("segments")}
                total={facets.totals.segments}
              />
              <ChipRow
                label="Service"
                options={facets.serviceLines}
                selected={filters.serviceLines}
                onChange={set("serviceLines")}
                total={facets.totals.serviceLines}
              />
            </Box>
            <ClearFiltersButton
              count={activeCount}
              onClear={() => setFilters(EMPTY_FILTERS)}
            />
          </Box>
        </FilterPanel>
      }
    >
      <ListDataGrid
        rows={filtered}
        columns={columns}
        loading={loading}
        noRowsMessage="No sites match these filters"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sites, clients, addresses, zip codes, people…"
        exportFileName="sites"
        onRowClick={(row) => navigate(`/sites/${row.id}`)}
      />
    </ListPageLayout>
  );
}

export default Sites;
