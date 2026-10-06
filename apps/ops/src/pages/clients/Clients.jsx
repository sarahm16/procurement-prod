import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Layout Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";
import ServiceLineChips, {
  StatusCell,
} from "../../components/ServiceLineChips";

const CLIENT_ENTITY_TYPE_ID = 3; // whatever your Clients entity type id is

/**
 * GET /api/clients returns, per client:
 *   status: { key, name, color }   — worked out from contracts, or Paused
 *   status_key, status_name, status_color, contract_status_name,
 *   paused_at, paused_reason, paused_by_name
 *   service_lines: [{ id, name }]  — the lines the client is set up for
 */

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "paused", label: "Paused" },
  { value: "inactive", label: "Inactive" },
  { value: "none", label: "No contracts" },
];

/** Char(n) columns come back space-padded; treat "" as missing. */
const clean = (v) => (typeof v === "string" ? v.trim() || null : (v ?? null));

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

function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientRoles, setClientRoles] = useState([]); // roles applicable to Clients
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceLineFilter, setServiceLineFilter] = useState("all");

  const fetchClients = async () => {
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

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

  const onRowClick = (row) => navigate(`/clients/${row.id}`);

  const serviceLineOptions = useMemo(() => {
    const map = new Map();
    for (const c of clients)
      for (const sl of c.service_lines || []) map.set(sl.id, sl.name);
    return [...map.entries()]
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .map(([value, label]) => ({ value, label }));
  }, [clients]);

  // Value is internal_role_id — what role_assignments carry. (It used to be
  // the RoleEntityTypes row id, which never matched, so the filter emptied
  // the grid.)
  const roleOptions = useMemo(
    () =>
      clientRoles.map((r) => ({
        value: r.internal_role_id,
        label: r.InternalRole?.name ?? "Role",
      })),
    [clientRoles],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q) {
        const hay = [
          c.client,
          c.legal_name,
          c.mailing_address,
          c.mailing_address2,
          c.mailing_city,
          clean(c.mailing_state),
          c.mailing_zipcode,
          ...(c.service_lines ?? []).map((sl) => sl.name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && (c.status_key ?? "none") !== statusFilter)
        return false;
      if (
        serviceLineFilter !== "all" &&
        !(c.service_lines || []).some(
          (sl) => sl.id === Number(serviceLineFilter),
        )
      )
        return false;

      return true;
    });
  }, [clients, search, statusFilter, serviceLineFilter]);

  return (
    <ListPageLayout
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search clients, addresses, zip codes…"
          filters={[
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
              options: STATUS_OPTIONS,
            },
          ]}
        />
      }
    >
      <ListDataGrid
        rows={filteredClients}
        columns={columns}
        onRowClick={onRowClick}
        loading={loading}
        exportFileName="clients"
      />
    </ListPageLayout>
  );
}

export default Clients;
