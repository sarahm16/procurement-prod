// Libraries
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Local Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";

// MUI Components
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";

// Client status is a plain string (unlike vendor status, which is an object),
// so map each status to a color here.
const statusColors = {
  Active: "#16a34a",
  Paused: "#d97706",
  Pending: "#2563eb",
  Archived: "#6b7280",
};

const clientColumns = [
  {
    field: "client",
    headerName: "Client",
    flex: 1.5,
    minWidth: 180,
  },
  {
    field: "location",
    headerName: "Location",
    flex: 1.2,
    minWidth: 160,
    valueGetter: (value, row) => {
      // mailing_state is Char(50), so it comes back padded with trailing spaces — trim it.
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

      // Some clients have many service lines (one has 7), which would overflow
      // the row, so show the first two and collapse the rest into a +N chip.
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
  {
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
            backgroundColor: color + "22", // hex color at ~13% opacity for background
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
  },
];

function Clients() {
  // Hooks
  const navigate = useNavigate();

  // State
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/clients");
      console.log("Fetched clients:", response.data);
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const onRowClick = (row) => {
    console.log("Row Clicked: ", row);
    navigate(`/clients/${row.id}`);
  };

  return (
    <>
      <ListPageLayout onRefresh={fetchClients}>
        <ListDataGrid
          rows={clients}
          columns={clientColumns}
          onRowClick={onRowClick}
          loading={loading}
        />
      </ListPageLayout>
    </>
  );
}

export default Clients;
