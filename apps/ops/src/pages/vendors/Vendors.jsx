// Libraries
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Local Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";
import ServiceLineChips from "../../components/ServiceLineChips";
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
import CreateVendorForm from "./CreateVendorForm";

// Hooks
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";
import { getServiceLineConfig } from "../../*/constants/serviceLineConfig";

// MUI
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

const VENDOR_ENTITY_TYPE_ID = 1;

/**
 * GET /api/vendors returns, per vendor (see CHANGES.md for the extras):
 *   status: { id, name, color }, trades: [{ id, name }],
 *   primary_contact_*, mailing_*, created_at, role_assignments
 *   compliance: { W9, MSA, ACH: complete|pending|missing,
 *                 coi: valid|expiring|expired|missing, coi_expiration }
 *   live_lines, service_lines: [names], notices: { warnings, compliance, terminations }
 */

/* ── Filters ──────────────────────────────────────────────────────────── */

const NO_STATE = "__none__";
const NO_SITES = "__none__";
const EMPTY_FILTERS = {
  statuses: [],
  serviceLines: [],
  compliance: [],
  trades: [],
  states: [],
  people: [],
};
const FILTERS_KEY = "nfc.vendors.filters.v1";

const clean = (v) => (typeof v === "string" ? v.trim() || null : (v ?? null));
const stateKey = (v) => clean(v.mailing_state)?.toUpperCase() ?? NO_STATE;
const linesOf = (v) => (v.service_lines?.length ? v.service_lines : [NO_SITES]);
const peopleOf = (v) => {
  const names = [
    ...new Set(
      (v.role_assignments ?? []).map((a) => a.employee_name).filter(Boolean),
    ),
  ];
  return names.length ? names : [NOBODY];
};

const DOC_LABEL = { W9: "W-9", MSA: "MSA", ACH: "ACH" };
const AMBER = "#d97706";
const RED = "#dc2626";
const GREEN = "#16a34a";

// Compliance chips. A vendor matches if it has ANY of the picked issues;
// "Complete" means none at all.
const ISSUES = [
  {
    value: "missing_W9",
    label: "Missing W-9",
    test: (c) => c.W9 !== "complete",
  },
  {
    value: "missing_MSA",
    label: "Missing MSA",
    test: (c) => c.MSA !== "complete",
  },
  {
    value: "missing_ACH",
    label: "Missing ACH",
    test: (c) => c.ACH !== "complete",
  },
  { value: "coi_missing", label: "No COI", test: (c) => c.coi === "missing" },
  {
    value: "coi_expired",
    label: "COI expired",
    test: (c) => c.coi === "expired",
  },
  {
    value: "coi_expiring",
    label: "COI expiring",
    title: "Expires within 30 days",
    test: (c) => c.coi === "expiring",
  },
];
const hasNotice = (v) =>
  (v.notices?.warnings ?? 0) +
    (v.notices?.compliance ?? 0) +
    (v.notices?.terminations ?? 0) >
  0;

const complianceOf = (v) =>
  v.compliance ?? {
    W9: "missing",
    MSA: "missing",
    ACH: "missing",
    coi: "missing",
    coi_expiration: null,
  };

/** Every compliance key a vendor matches, for counting and filtering. */
const complianceKeys = (v) => {
  const c = complianceOf(v);
  const keys = ISSUES.filter((i) => i.test(c)).map((i) => i.value);
  if (!keys.length) keys.push("complete");
  if (hasNotice(v)) keys.push("notice");
  return keys;
};

const searchText = (v) =>
  [
    v.company,
    v.primary_contact_name,
    v.primary_contact_email,
    v.primary_contact_phone,
    v.mailing_city,
    clean(v.mailing_state),
    v.status?.name,
    ...(v.trades ?? []).map((t) => t.name),
    ...(v.service_lines ?? []),
    ...(v.role_assignments ?? []).map((a) => a.employee_name),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const makeTests = (q, f) => ({
  search: (v) => !q || searchText(v).includes(q),
  statuses: (v) =>
    !f.statuses.length || f.statuses.includes(v.status?.name ?? "No status"),
  serviceLines: (v) =>
    !f.serviceLines.length ||
    linesOf(v).some((n) => f.serviceLines.includes(n)),
  compliance: (v) =>
    !f.compliance.length ||
    complianceKeys(v).some((k) => f.compliance.includes(k)),
  trades: (v) =>
    !f.trades.length || (v.trades ?? []).some((t) => f.trades.includes(t.id)),
  states: (v) => !f.states.length || f.states.includes(stateKey(v)),
  people: (v) =>
    !f.people.length || peopleOf(v).some((n) => f.people.includes(n)),
});

/* ── Cells ────────────────────────────────────────────────────────────── */

const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

/** W-9 · MSA · ACH · COI, each green (done), amber (sent / expiring) or red. */
function ComplianceCell({ row }) {
  const c = complianceOf(row);
  const items = [
    ...["W9", "MSA", "ACH"].map((k) => ({
      label: DOC_LABEL[k],
      color: c[k] === "complete" ? GREEN : c[k] === "pending" ? AMBER : RED,
      tip:
        c[k] === "complete"
          ? "Signed"
          : c[k] === "pending"
            ? "Sent, not signed yet"
            : "Not on file",
      icon: DescriptionOutlinedIcon,
    })),
    {
      label: "COI",
      color: c.coi === "valid" ? GREEN : c.coi === "expiring" ? AMBER : RED,
      tip:
        c.coi === "missing"
          ? "No COI on file"
          : `${c.coi === "expired" ? "Expired" : c.coi === "expiring" ? "Expires" : "Valid until"} ${fmtDay(c.coi_expiration)}`,
      icon: HealthAndSafetyOutlinedIcon,
    },
  ];
  const n = row.notices ?? {};
  const noticeCount =
    (n.warnings ?? 0) + (n.compliance ?? 0) + (n.terminations ?? 0);
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}
    >
      {items.map((it) => (
        <Tooltip key={it.label} title={`${it.label}: ${it.tip}`}>
          <Box
            component="span"
            sx={{
              fontSize: "0.66rem",
              fontWeight: 700,
              px: 0.6,
              lineHeight: "18px",
              borderRadius: "4px",
              color: it.color,
              border: `1px solid ${it.color}55`,
              bgcolor: `${it.color}14`,
            }}
          >
            {it.label}
          </Box>
        </Tooltip>
      ))}
      {noticeCount > 0 && (
        <Tooltip
          title={[
            n.terminations && `${n.terminations} termination`,
            n.warnings && `${n.warnings} warning${n.warnings === 1 ? "" : "s"}`,
            n.compliance &&
              `${n.compliance} compliance notice${n.compliance === 1 ? "" : "s"}`,
          ]
            .filter(Boolean)
            .join(", ")
            .concat(" in the last year")}
        >
          <ReportProblemOutlinedIcon
            sx={{ fontSize: 16, color: n.terminations ? RED : AMBER, ml: 0.25 }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

const StatusChip = ({ status }) =>
  status ? (
    <Chip
      label={status.name}
      size="small"
      sx={{
        backgroundColor: status.color + "22",
        color: status.color,
        borderColor: status.color + "55",
        border: "1px solid",
        fontWeight: 600,
        fontSize: "0.7rem",
        letterSpacing: "0.04em",
        height: 22,
      }}
    />
  ) : (
    "—"
  );

/* ── Columns ──────────────────────────────────────────────────────────── */

const baseColumns = [
  { field: "company", headerName: "Company", flex: 1.5, minWidth: 180 },
  {
    field: "primary_contact_name",
    headerName: "Contact",
    flex: 1,
    minWidth: 140,
    valueGetter: (value, row) => row.primary_contact_name ?? "—",
  },
  {
    // Hidden at first to make room (Columns → Email shows it); still searchable.
    field: "primary_contact_email",
    headerName: "Email",
    flex: 1.2,
    minWidth: 180,
    valueGetter: (value, row) => row.primary_contact_email ?? "—",
  },
  {
    field: "primary_contact_phone",
    headerName: "Phone",
    flex: 0.9,
    minWidth: 130,
    valueGetter: (value, row) => row.primary_contact_phone ?? "—",
  },
  {
    field: "location",
    headerName: "Location",
    flex: 1,
    minWidth: 140,
    valueGetter: (value, row) => {
      const city = clean(row.mailing_city);
      const state = clean(row.mailing_state);
      if (city && state) return `${city}, ${state}`;
      return city || state || "—";
    },
  },
  {
    field: "status",
    headerName: "Status",
    flex: 0.8,
    minWidth: 120,
    valueGetter: (value, row) => row.status?.name ?? "",
    renderCell: (params) => <StatusChip status={params.row.status} />,
  },
  {
    field: "service_lines",
    headerName: "On sites",
    flex: 1.4,
    minWidth: 220,
    // Sort by how many lines they're on; export the names.
    valueGetter: (value, row) => row.live_lines ?? 0,
    valueFormatter: (value, row) => (row.service_lines ?? []).join(", "),
    renderCell: ({ row }) =>
      row.live_lines ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            height: "100%",
            minWidth: 0,
          }}
        >
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: "0.78rem",
              minWidth: 22,
              textAlign: "right",
            }}
          >
            {row.live_lines}
          </Box>
          <ServiceLineChips
            lines={(row.service_lines ?? []).map((n) => ({ key: n, name: n }))}
            max={2}
          />
        </Box>
      ) : (
        <Box component="span" sx={{ color: "text.disabled" }}>
          Not on any sites
        </Box>
      ),
  },
  {
    field: "compliance",
    headerName: "Compliance",
    width: 210,
    sortable: true,
    // Sort by how many things are outstanding.
    valueGetter: (value, row) =>
      ISSUES.filter((i) => i.test(complianceOf(row))).length,
    valueFormatter: (value) => (value ? `${value} outstanding` : "Complete"),
    renderCell: ({ row }) => <ComplianceCell row={row} />,
  },
  {
    field: "trades",
    headerName: "Trades",
    flex: 1.2,
    minWidth: 160,
    sortable: false,
    valueGetter: (value, row) =>
      (row.trades ?? []).map((t) => t.name).join(", ") || "—",
  },
];

const createdAtColumn = {
  field: "created_at",
  headerName: "Created",
  flex: 0.8,
  minWidth: 120,
  type: "date",
  valueGetter: (value) => (value ? new Date(value) : null),
};

// Email starts hidden to make room; Columns → Email brings it back.
const GRID_INITIAL_STATE = {
  columns: { columnVisibilityModel: { primary_contact_email: false } },
};

/* ── Page ─────────────────────────────────────────────────────────────── */

function Vendors() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  const [vendors, setVendors] = useState([]);
  const [vendorRoles, setVendorRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false); // create panel state, lifted here

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useSavedFilters(FILTERS_KEY, EMPTY_FILTERS);
  const set = (key) => (next) => setFilters((f) => ({ ...f, [key]: next }));

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, rolesRes] = await Promise.all([
        axios.get("/api/vendors"),
        axios.get(`/api/roleEntityTypes/${VENDOR_ENTITY_TYPE_ID}`),
      ]);
      setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);
      setVendorRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const roleColumns = useMemo(
    () =>
      vendorRoles.map((role) => ({
        field: `role_${role.id}`,
        headerName: role.InternalRole?.name,
        flex: 1,
        minWidth: 150,
        valueGetter: (value, row) => {
          const names = (row.role_assignments || [])
            .filter((a) => a.internal_role_id === role.internal_role_id)
            .map((a) => a.employee_name);
          return names.length ? names.join(", ") : "—";
        },
      })),
    [vendorRoles],
  );

  const columns = useMemo(
    () => [...baseColumns, ...roleColumns, createdAtColumn],
    [roleColumns],
  );

  const tests = useMemo(
    () => makeTests(search.trim().toLowerCase(), filters),
    [search, filters],
  );
  const filtered = useMemo(
    () => vendors.filter((v) => passes(tests, v)),
    [vendors, tests],
  );

  /** Options with counts, each group counted against the other groups. */
  const facets = useMemo(() => {
    const without = (skip) => vendors.filter((v) => passes(tests, v, skip));
    const forStatuses = without("statuses");
    const forLines = without("serviceLines");
    const forCompliance = without("compliance");
    const forTrades = without("trades");
    const forStates = without("states");
    const forPeople = without("people");

    const statusCounts = countBy(forStatuses, (v) => [
      v.status?.name ?? "No status",
    ]);
    const lineCounts = countBy(forLines, linesOf);
    const complianceCounts = countBy(forCompliance, complianceKeys);
    const tradeCounts = countBy(forTrades, (v) =>
      (v.trades ?? []).map((t) => t.id),
    );
    const stateCounts = countBy(forStates, (v) => [stateKey(v)]);
    const peopleCounts = countBy(forPeople, peopleOf);

    // Statuses in their table order (by id).
    const statuses = new Map();
    for (const v of vendors)
      if (v.status?.name) statuses.set(v.status.name, v.status);
    const statusList = [...statuses.values()].sort(
      (a, b) => (a.id ?? 0) - (b.id ?? 0),
    );

    const tradeNames = new Map();
    for (const v of vendors)
      for (const t of v.trades ?? []) tradeNames.set(t.id, t.name);

    const roleName = new Map(
      vendorRoles.map((r) => [r.internal_role_id, r.InternalRole?.name]),
    );
    const rolesBy = new Map();
    for (const v of vendors)
      for (const a of v.role_assignments ?? []) {
        if (!a.employee_name) continue;
        if (!rolesBy.has(a.employee_name))
          rolesBy.set(a.employee_name, new Set());
        const r = roleName.get(a.internal_role_id);
        if (r) rolesBy.get(a.employee_name).add(r);
      }

    return {
      statuses: [
        ...statusList.map((s) => ({
          value: s.name,
          label: s.name,
          color: s.color,
          count: statusCounts.get(s.name) ?? 0,
        })),
        ...(vendors.some((v) => !v.status)
          ? [
              {
                value: "No status",
                label: "No status",
                color: "#9ca3af",
                count: statusCounts.get("No status") ?? 0,
              },
            ]
          : []),
      ],
      serviceLines: [
        ...[...new Set(vendors.flatMap((v) => v.service_lines ?? []))]
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
        {
          value: NO_SITES,
          label: "Not on any sites",
          color: "#9ca3af",
          icon: BlockOutlinedIcon,
          count: lineCounts.get(NO_SITES) ?? 0,
          title: "Vendors with no live site assignments: your bench",
        },
      ],
      compliance: [
        {
          value: "complete",
          label: "Complete",
          color: GREEN,
          icon: TaskAltIcon,
          count: complianceCounts.get("complete") ?? 0,
          title: "W-9, MSA, ACH signed and a valid COI",
        },
        ...ISSUES.map((i) => ({
          value: i.value,
          label: i.label,
          title: i.title,
          color: i.value === "coi_expiring" ? AMBER : RED,
          count: complianceCounts.get(i.value) ?? 0,
        })),
        {
          value: "notice",
          label: "Notice in last year",
          color: AMBER,
          icon: ReportProblemOutlinedIcon,
          count: complianceCounts.get("notice") ?? 0,
          title:
            "A warning, compliance or termination notice in the last 12 months",
        },
      ],
      trades: [...tradeNames]
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
        .map(([value, label]) => ({
          value,
          label,
          count: tradeCounts.get(value) ?? 0,
        })),
      states: [...new Set(vendors.map(stateKey))]
        .sort((a, b) =>
          a === NO_STATE ? 1 : b === NO_STATE ? -1 : a.localeCompare(b),
        )
        .map((st) => ({
          value: st,
          label: st === NO_STATE ? "No state" : st,
          count: stateCounts.get(st) ?? 0,
        })),
      people: [
        ...[...rolesBy.keys()]
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({
            name,
            count: peopleCounts.get(name) ?? 0,
            detail:
              vendorRoles.length > 1
                ? [...rolesBy.get(name)].sort().join(", ")
                : undefined,
          })),
        { name: NOBODY, count: peopleCounts.get(NOBODY) ?? 0 },
      ],
      totals: {
        statuses: forStatuses.length,
        serviceLines: forLines.length,
        compliance: forCompliance.length,
      },
    };
  }, [vendors, vendorRoles, tests]);

  const peopleNoun = useMemo(() => {
    if (vendorRoles.length === 1) {
      const r = (
        vendorRoles[0].InternalRole?.name ?? "team member"
      ).toLowerCase();
      return { one: r, many: `${r}s` };
    }
    return { one: "team member", many: "team members" };
  }, [vendorRoles]);

  const onRowClick = (row) => navigate(`/vendors/${row.id}`);

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await axios.post("/api/vendors", { ...formData, user_id: user?.id });
      setFormOpen(false); // close the panel on success
      fetchVendors(); // reload, so the new vendor comes with its list extras
    } catch (error) {
      console.error("Error creating vendor:", error);
    }
    setSubmitting(false);
  };

  return (
    <>
      <SlideOutPanel
        title="Create New Vendor"
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        <CreateVendorForm
          onSubmit={onSubmit}
          submitting={submitting}
          onClose={() => setFormOpen(false)}
        />
      </SlideOutPanel>

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
                  labelWidth={78}
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
                  options={facets.trades}
                  selected={filters.trades}
                  onChange={set("trades")}
                  noun={{ one: "trade", many: "trades" }}
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
                  noun={peopleNoun}
                />
                <Tooltip title="Refresh">
                  <span>
                    <IconButton
                      size="small"
                      onClick={fetchVendors}
                      disabled={loading}
                      sx={{ color: "text.secondary" }}
                    >
                      <RefreshIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
                  onClick={() => setFormOpen(true)}
                  sx={{ height: 32, whiteSpace: "nowrap" }}
                >
                  Create New
                </Button>
              </Box>
            </Box>

            <FilterDivider />

            <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                }}
              >
                <ChipRow
                  label="On sites"
                  labelWidth={78}
                  options={facets.serviceLines}
                  selected={filters.serviceLines}
                  onChange={set("serviceLines")}
                  total={facets.totals.serviceLines}
                />
                <ChipRow
                  label="Compliance"
                  labelWidth={78}
                  options={facets.compliance}
                  selected={filters.compliance}
                  onChange={set("compliance")}
                  total={facets.totals.compliance}
                />
              </Box>
              <ClearFiltersButton
                count={activeFilterCount(filters)}
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
          noRowsMessage="No vendors match these filters"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search vendors, contacts, trades, places, people…"
          exportFileName="vendors"
          initialState={GRID_INITIAL_STATE}
        />
      </ListPageLayout>
    </>
  );
}

export default Vendors;
