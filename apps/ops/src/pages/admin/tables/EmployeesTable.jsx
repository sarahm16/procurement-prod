// Libraries
import { useMemo, useState } from "react";

// Custom Hooks
import { useFetchAll } from "../../../*/hooks/useFetchAll";

// Local Components
import ListDataGrid from "../../../components/ListPageLayout/ListDataGrid";
import ListToolbar from "../../../components/ListPageLayout/ListToolbar";

// MUI Components
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";

function EmployeesAdmin() {
  const { data: employees = [], loading, error } = useFetchAll("employees");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // active / terminated

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees || []).filter((e) => {
      if (q) {
        const hay = `${e.name ?? ""} ${e.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "active" && e.terminated) return false;
      if (statusFilter === "terminated" && !e.terminated) return false;
      return true;
    });
  }, [employees, search, statusFilter]);

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Name", flex: 1.3, minWidth: 180 },
      { field: "email", headerName: "Email", flex: 1.5, minWidth: 220 },
      {
        field: "terminated",
        headerName: "Status",
        flex: 0.7,
        minWidth: 120,
        renderCell: (params) =>
          params.row.terminated ? (
            <Chip
              label="Former"
              size="small"
              sx={{
                height: 22,
                backgroundColor: "#6b728022",
                color: "#6b7280",
              }}
            />
          ) : (
            <Chip
              label="Active"
              size="small"
              sx={{
                height: 22,
                backgroundColor: "#16a34a22",
                color: "#16a34a",
              }}
            />
          ),
      },
    ],
    [],
  );

  if (error) {
    return <div>Error loading employees.</div>;
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column", // stack toolbar above grid, not side by side
          height: "100%",
          minHeight: 0,
        }}
      >
        <Box sx={{ flexShrink: 0, mb: 2 }}>
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employees…"
            filters={[
              {
                label: "Status",
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: "active", label: "Active" },
                  { value: "terminated", label: "Former" },
                ],
              },
            ]}
          />
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <ListDataGrid rows={filtered} columns={columns} loading={loading} />
        </Box>
      </Box>
    </>
  );
}

export default EmployeesAdmin;
