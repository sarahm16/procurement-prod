import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

// Layout Components
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

const CLIENT_ENTITY_TYPE_ID = 3; // whatever your Clients entity type id is

/**
 * GET /api/clients returns, per client:
 *   status: { key, name, color }   — worked out from contracts, or Paused
 *   status_key, status_name, status_color, contract_status_name,
 *   paused_at, paused_reason, paused_by_name
 *   segment                        — the segment's name, or null
 *   service_lines: [{ id, name }]  — the lines the client is set up for
 *   role_assignments: [{ internal_role_id, employee_name, … }]
 */

/* ── Filters ──────────────────────────────────────────────────────────── */

// Statuses in lifecycle order; colours come from the API when it sends them.
const STATUSES = [
  { value: "active", label: "Active", color: "#16a34a" },
  { value: "upcoming", label: "Upcoming", color: "#2563eb" },
  { value: "paused", label: "Paused", color: "#d97706" },
  { value: "inactive", label: "Inactive", color: "#6b7280" },
  { value: "none", label: "No contracts", color: "#9ca3af" },
];
const NO_SEGMENT = "__none__";

const EMPTY_FILTERS = {
  statuses: [],
  segments: [],
  serviceLines: [],
  people: [],
};
const FILTERS_KEY = "nfc.clients.filters.v1";

/** Char(n) columns come back space-padded; treat "" as missing. */
const clean = (v) => (typeof v === "string" ? v.trim() || null : (v ?? null));

const statusKey = (c) => c.status_key ?? "none";
const segmentKey = (c) => c.segment || NO_SEGMENT;
const peopleOf = (c) => {
  const names = [
    ...new Set(
      (c.role_assignments ?? []).map((a) => a.employee_name).filter(Boolean),
    ),
  ];
  return names.length ? names : [NOBODY];
};

const searchText = (c) =>
  [
    c.client,
    c.legal_name,
    c.mailing_address,
    c.mailing_address2,
    c.mailing_city,
    clean(c.mailing_state),
    c.mailing_zipcode,
    c.segment,
    ...(c.service_lines ?? []).map((sl) => sl.name),
    ...(c.role_assignments ?? []).map((a) => a.employee_name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/** One test per filter group, so each group can be counted against the rest. */
const makeTests = (q, f) => ({
  search: (c) => !q || searchText(c).includes(q),
  statuses: (c) => !f.statuses.length || f.statuses.includes(statusKey(c)),
  segments: (c) => !f.segments.length || f.segments.includes(segmentKey(c)),
  // A client matches if it has ANY of the picked service lines.
  serviceLines: (c) =>
    !f.serviceLines.length ||
    (c.service_lines ?? []).some((sl) => f.serviceLines.includes(sl.id)),
  people: (c) =>
    !f.people.length || peopleOf(c).some((n) => f.people.includes(n)),
});

/* ── Columns ──────────────────────────────────────────────────────────── */

/** "2026-10-06" → "Oct 6, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/** Hover text on the status: why a client is paused, or what's coming. */
const statusHint = (row) => {
  if (row.status_key === "paused") {
    const since = row.paused_at ? ` since ${fmtDay(row.paused_at)}` : "";
    const by = row.paused_by_name ? ` by ${row.paused_by_name}` : "";
    const reason = row.paused_reason ? ` — ${row.paused_reason}` : "";
    return `Paused${since}${by}${reason}. Contracts: ${row.contract_status_name ?? "—"}.`;
  }
  if (row.status_key === "upcoming" && row.next_start_date)
    return `First contract starts ${fmtDay(row.next_start_date)}`;
  if (row.status_key === "inactive" && row.last_end_date)
    return `Last contract ended ${fmtDay(row.last_end_date)}`;
  return null;
};

const toChipLines = (row) =>
  (row.service_lines ?? [])
    .filter((sl) => sl?.name)
    .map((sl) => ({ key: sl.id, name: sl.name }));

// Same order as the sites list: name, address parts, status, service lines.
const baseColumns = [
  { field: "client", headerName: "Client", flex: 1.2, minWidth: 160 },
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
    // Sort/export by the label, not the key (or the status object).
    valueGetter: (value, row) => row.status_name ?? "No contracts",
    renderCell: (params) => (
      <StatusCell
        name={params.value}
        color={params.row.status_color}
        hint={statusHint(params.row)}
      />
    ),
  },
  {
    field: "service_lines",
    headerName: "Service Lines",
    flex: 1.8,
    minWidth: 280,
    sortable: false,
    // Sorting/filtering/export need a primitive, not the object array.
    valueGetter: (value, row) =>
      toChipLines(row)
        .map((l) => l.name)
        .join(", "),
    renderCell: (params) => (
      <ServiceLineChips lines={toChipLines(params.row)} />
    ),
  },
];

/* ── Page ─────────────────────────────────────────────────────────────── */

function Clients() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  const [clients, setClients] = useState([]);
  const [clientRoles, setClientRoles] = useState([]); // roles applicable to Clients
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useSavedFilters(FILTERS_KEY, EMPTY_FILTERS);
  const set = (key) => (next) => setFilters((f) => ({ ...f, [key]: next }));

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, rolesRes] = await Promise.all([
        axios.get("/api/clients"),
        axios.get(`/api/roleEntityTypes/${CLIENT_ENTITY_TYPE_ID}`), // applicable roles
      ]);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
      setClientRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // One column per applicable role, after the shared columns.
  const roleColumns = useMemo(
    () =>
      clientRoles.map((role) => ({
        field: `role_${role.id}`,
        headerName: role?.InternalRole?.name,
        flex: 1,
        minWidth: 150,
        sortable: false,
        // pull this client's assignees for THIS role out of its role_assignments
        valueGetter: (value, row) => {
          const names = (row.role_assignments || [])
            .filter((a) => a.internal_role_id === role.internal_role_id)
            .map((a) => a.employee_name);
          return names.length ? names.join(", ") : "—";
        },
      })),
    [clientRoles],
  );

  const columns = useMemo(
    () => [...baseColumns, ...roleColumns],
    [roleColumns],
  );

  const tests = useMemo(
    () => makeTests(search.trim().toLowerCase(), filters),
    [search, filters],
  );
  const filtered = useMemo(
    () => clients.filter((c) => passes(tests, c)),
    [clients, tests],
  );

  /** Chip options with counts, each group counted against the other groups. */
  const facets = useMemo(() => {
    const without = (skip) => clients.filter((c) => passes(tests, c, skip));
    const forStatuses = without("statuses");
    const forSegments = without("segments");
    const forLines = without("serviceLines");
    const forPeople = without("people");

    // Status colours as the API sends them, falling back to ours.
    const apiColor = new Map();
    for (const c of clients)
      if (c.status_key && c.status_color)
        apiColor.set(c.status_key, c.status_color);

    const statusCounts = countBy(forStatuses, (c) => [statusKey(c)]);
    const segmentCounts = countBy(forSegments, (c) => [segmentKey(c)]);
    const lineCounts = countBy(forLines, (c) =>
      (c.service_lines ?? []).map((sl) => sl.id),
    );
    const peopleCounts = countBy(forPeople, peopleOf);

    // Segments: the configured ones, any others in the data, then "None".
    const segmentNames = [
      ...Object.keys(SEGMENTS),
      ...[...new Set(clients.map((c) => c.segment).filter(Boolean))]
        .filter((n) => !SEGMENTS[n])
        .sort(),
    ];

    const lineNames = new Map();
    for (const c of clients)
      for (const sl of c.service_lines ?? []) lineNames.set(sl.id, sl.name);

    // Who's on client teams, and in which roles.
    const roleName = new Map(
      clientRoles.map((r) => [r.internal_role_id, r.InternalRole?.name]),
    );
    const rolesBy = new Map();
    for (const c of clients) {
      for (const a of c.role_assignments ?? []) {
        if (!a.employee_name) continue;
        if (!rolesBy.has(a.employee_name))
          rolesBy.set(a.employee_name, new Set());
        const r = roleName.get(a.internal_role_id);
        if (r) rolesBy.get(a.employee_name).add(r);
      }
    }
    const showRoles = clientRoles.length > 1;

    return {
      statuses: STATUSES.filter(
        (s) =>
          s.value !== "none" || clients.some((c) => statusKey(c) === "none"),
      ).map((s) => ({
        ...s,
        color: apiColor.get(s.value) ?? s.color,
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
        ...(clients.some((c) => !c.segment)
          ? [
              {
                value: NO_SEGMENT,
                label: "None",
                color: "#9ca3af",
                icon: BlockOutlinedIcon,
                count: segmentCounts.get(NO_SEGMENT) ?? 0,
                title: `No ${SEGMENT_LABEL.toLowerCase()} set`,
              },
            ]
          : []),
      ],
      serviceLines: [...lineNames]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
        .map(([id, name]) => {
          const cfg = getServiceLineConfig(name);
          return {
            value: id,
            label: name,
            color: cfg.color,
            icon: cfg.icon,
            count: lineCounts.get(id) ?? 0,
          };
        }),
      people: [
        ...[...rolesBy.keys()]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({
            name,
            count: peopleCounts.get(name) ?? 0,
            detail: showRoles
              ? [...rolesBy.get(name)].sort().join(", ")
              : undefined,
          })),
        { name: NOBODY, count: peopleCounts.get(NOBODY) ?? 0 },
      ],
      totals: {
        statuses: forStatuses.length,
        segments: forSegments.length,
        serviceLines: forLines.length,
      },
    };
  }, [clients, clientRoles, tests]);

  // The people button is named after the role when clients have just one.
  const peopleNoun = useMemo(() => {
    if (clientRoles.length === 1) {
      const r = (
        clientRoles[0].InternalRole?.name ?? "team member"
      ).toLowerCase();
      return { one: r, many: `${r}s` };
    }
    return { one: "team member", many: "team members" };
  }, [clientRoles]);

  const activeCount = activeFilterCount(filters);
  const onRowClick = (row) => navigate(`/clients/${row.id}`);

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
              }}
            >
              <PeopleFilter
                options={facets.people}
                selected={filters.people}
                onChange={set("people")}
                me={user?.name}
                noun={peopleNoun}
              />
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    size="small"
                    onClick={fetchClients}
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
        onRowClick={onRowClick}
        loading={loading}
        noRowsMessage="No clients match these filters"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search clients, addresses, zip codes, people…"
        exportFileName="clients"
      />
    </ListPageLayout>
  );
}

export default Clients;
