import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Layout Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";

// MUI Components
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

const CLIENT_ENTITY_TYPE_ID = 3; // whatever your Clients entity type id is

const statusColors = {
  Active: "#16a34a",
  Paused: "#d97706",
  Pending: "#2563eb",
  Archived: "#6b7280",
};

// The static columns that always exist
const baseColumns = [
  { field: "client", headerName: "Client", flex: 1.5, minWidth: 180 },
  {
    field: "location",
    headerName: "Location",
    flex: 1.2,
    minWidth: 160,
    valueGetter: (value, row) => {
      const city = row.mailing_city?.trim();
      const state = row.mailing_state?.trim();
      if (city && state) return `${city}, ${state}`;
      return city || state || "—";
    },
  },
  {
    field: "service_lines",
    headerName: "Service Lines",
    flex: 1.5,
    minWidth: 220,
    sortable: false,
    renderCell: (params) => {
      const lines = params.row.service_lines || [];
      if (lines.length === 0) return "—";
      const visible = lines.slice(0, 2);
      const remaining = lines.length - visible.length;
      return (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          {visible.map((line) => (
            <Chip
              key={line.id}
              label={line.name}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.7rem" }}
            />
          ))}
          {remaining > 0 && (
            <Chip
              label={`+${remaining}`}
              size="small"
              sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
            />
          )}
        </Box>
      );
    },
  },
];

const statusColumn = {
  field: "status",
  headerName: "Status",
  flex: 0.8,
  minWidth: 120,
  renderCell: (params) => {
    const status = params.row.status;
    if (!status) return "—";
    const color = statusColors[status] || "#6b7280";
    return (
      <Chip
        label={status}
        size="small"
        sx={{
          backgroundColor: color + "22",
          color,
          borderColor: color + "55",
          border: "1px solid",
          fontWeight: 600,
          fontSize: "0.7rem",
          letterSpacing: "0.04em",
          height: 22,
        }}
      />
    );
  },
};

function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [clientRoles, setClientRoles] = useState([]); // roles applicable to Clients
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceLineFilter, setServiceLineFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const [clientsRes, rolesRes] = await Promise.all([
        axios.get("/api/clients"),
        axios.get(`/api/roleEntityTypes/${CLIENT_ENTITY_TYPE_ID}`), // applicable roles
      ]);
      console.log("Fetched clients:", clientsRes.data);
      console.log("Fetched client roles:", rolesRes.data);
      setClients(clientsRes.data);
      setClientRoles(rolesRes.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Build one column per applicable role, generated at runtime.
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
            .filter((a) => a.internal_role_id === role.id)
            .map((a) => a.employee_name);
          return names.length ? names.join(", ") : "—";
        },
      })),
    [clientRoles],
  );

  // Assemble: base columns, then the dynamic role columns, then status last.
  const columns = useMemo(
    () => [...baseColumns, ...roleColumns, statusColumn],
    [roleColumns],
  );

  const onRowClick = (row) => navigate(`/clients/${row.id}`);

  // filter option lists derived from data
  const statusOptions = useMemo(
    () =>
      [...new Set(clients.map((c) => c.status).filter(Boolean))].map((s) => ({
        value: s,
        label: s,
      })),
    [clients],
  );
  const serviceLineOptions = useMemo(() => {
    const map = new Map();
    for (const c of clients)
      for (const sl of c.service_lines || []) map.set(sl.id, sl.name);
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [clients]);
  const roleOptions = useMemo(
    () =>
      clientRoles.map((r) => ({
        value: r.id,
        label: r.InternalRole?.name ?? "Role",
      })),
    [clientRoles],
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q) {
        const hay =
          `${c.client ?? ""} ${c.mailing_city ?? ""} ${c.mailing_state ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (
        serviceLineFilter !== "all" &&
        !(c.service_lines || []).some(
          (sl) => sl.id === Number(serviceLineFilter),
        )
      )
        return false;
      if (
        roleFilter !== "all" &&
        !(c.role_assignments || []).some(
          (a) => a.internal_role_id === Number(roleFilter),
        )
      )
        return false;
      return true;
    });
  }, [clients, search, statusFilter, serviceLineFilter, roleFilter]);

  return (
    <ListPageLayout
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search clients…"
          filters={[
            {
              label: "Role",
              value: roleFilter,
              onChange: setRoleFilter,
              options: roleOptions,
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
              options: statusOptions,
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
      />
    </ListPageLayout>
  );
}

export default Clients;
