// Libraries
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Local Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";
import SlideOutPanel from "../../components/ListPageLayout/SlideOutPanel";
import CreateVendorForm from "./CreateVendorForm";

// Hooks
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

// MUI
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";

const VENDOR_ENTITY_TYPE_ID = 1;

const baseColumns = [
  { field: "company", headerName: "Company", flex: 1.5, minWidth: 180 },
  { field: "contact_name", headerName: "Contact", flex: 1, minWidth: 140 },
  { field: "contact_phone", headerName: "Phone", flex: 1, minWidth: 130 },
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
];

const statusColumn = {
  field: "VendorStatuses",
  headerName: "Status",
  flex: 0.8,
  minWidth: 120,
  renderCell: (params) => {
    const status = params.row.status;
    if (!status) return "—";
    return (
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
    );
  },
};

const createdAtColumn = {
  field: "created_at",
  headerName: "Created At",
  flex: 1,
  minWidth: 160,
  valueGetter: (value, row) =>
    row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
};

function Vendors() {
  const navigate = useNavigate();
  const { user } = useAuthenticatedUser();

  const [vendors, setVendors] = useState([]);
  const [vendorRoles, setVendorRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false); // create panel state, lifted here

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const [vendorsRes, rolesRes] = await Promise.all([
        axios.get("/api/vendors"),
        axios.get(`/api/roleEntityTypes/${VENDOR_ENTITY_TYPE_ID}`),
      ]);
      console.log("fetched vendors", vendorsRes.data);
      setVendors(vendorsRes.data);
      console.log("vendor roles available", rolesRes.data);
      setVendorRoles(rolesRes.data);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const statusOptions = useMemo(() => {
    const map = new Map();
    for (const v of vendors)
      if (v.status?.name) map.set(v.status.name, v.status.name);
    return [...map.values()]
      .sort()
      .map((name) => ({ value: name, label: name }));
  }, [vendors]);

  const roleOptions = useMemo(
    () =>
      vendorRoles.map((r) => ({
        value: r.id,
        label: r.InternalRole?.name ?? "Role",
      })),
    [vendorRoles],
  );

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (q) {
        const hay =
          `${v.company ?? ""} ${v.contact_name ?? ""} ${v.mailing_city ?? ""} ${v.mailing_state ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && v.status?.name !== statusFilter)
        return false;
      if (
        roleFilter !== "all" &&
        !(v.role_assignments || []).some(
          (a) => a.internal_role_id === Number(roleFilter),
        )
      )
        return false;
      return true;
    });
  }, [vendors, search, statusFilter, roleFilter]);

  const roleColumns = useMemo(
    () =>
      vendorRoles.map((role) => ({
        field: `role_${role.id}`,
        headerName: role.InternalRole?.name,
        flex: 1,
        minWidth: 150,
        sortable: false,
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
    () => [...baseColumns, ...roleColumns, statusColumn, createdAtColumn],
    [roleColumns],
  );

  const onRowClick = (row) => navigate(`/vendors/${row.id}`);

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const response = await axios.post("/api/vendors", {
        ...formData,
        user_id: user?.id,
      });
      setVendors((prev) => [response.data, ...prev]);
      setFormOpen(false); // close the panel on success
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
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search vendors…"
            filters={[
              {
                label: "Role",
                value: roleFilter,
                onChange: setRoleFilter,
                options: roleOptions,
              },
              {
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: statusOptions,
              },
            ]}
            actions={
              <>
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
                >
                  Create New
                </Button>
              </>
            }
          />
        }
      >
        <ListDataGrid
          rows={filteredVendors}
          columns={columns}
          onRowClick={onRowClick}
          loading={loading}
        />
      </ListPageLayout>
    </>
  );
}

export default Vendors;
