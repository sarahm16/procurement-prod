// admin/tables/ServiceLinesManager.jsx
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import MasterDetailManager from "../components/MasterDetailManager";

export default function ServiceLinesManager() {
  const [serviceLines, setServiceLines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/serviceLines");
      setServiceLines(data);
    } catch (e) {
      console.error("Error loading service lines:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Count of services per line — derived live so the master badges stay in sync.
  const countForLine = (line) => line.services?.length ?? 0;

  // The detail panel: services belonging to the selected line, editable.
  const renderDetail = (line) => (
    <ServicesTable
      line={line}
      services={line.services}
      onServicesChanged={(updatedServices) => {
        setServiceLines((prev) =>
          prev.map((l) =>
            l.id === line.id ? { ...l, services: updatedServices } : l,
          ),
        );
      }}
      allServices={line.services}
    />
  );

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.1rem",
          mb: 1.5,
        }}
      >
        Service Lines & Services
      </Typography>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <MasterDetailManager
          items={serviceLines}
          loading={loading}
          title="Service Lines"
          getItemLabel={(l) => l.name}
          getItemCount={(l) => countForLine(l)}
          renderDetail={renderDetail}
          emptyMessage="Select a service line to manage its services."
        />
      </Box>
    </Box>
  );
}

// Detail panel — the editable list of services for one service line.
function ServicesTable({ line, services, onServicesChanged, allServices }) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const sorted = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name)),
    [services],
  );

  const addService = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const { data } = await axios.post(
        `/api/serviceLines/${line.id}/serviceLineServices`,
        {
          name,
          service_line_id: line.id, // auto-associated with the selected line
        },
      );
      onServicesChanged([...allServices, data]);
      setNewName("");
    } catch (e) {
      console.error("Error adding service:", e);
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`/api/serviceLines/serviceLineServices/${id}`);
      onServicesChanged(allServices.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Error deleting service:", e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100%",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
          {line.name}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          {services.length} {services.length === 1 ? "service" : "services"}
        </Typography>
      </Box>

      {/* Add row */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          gap: 1,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder={`Add a service to ${line.name}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addService();
          }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={addService}
          disabled={!newName.trim() || saving}
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
        >
          Add
        </Button>
      </Box>

      {/* Services list */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {sorted.length === 0 ? (
          <Typography
            sx={{ p: 2, fontSize: "0.82rem", color: "text.disabled" }}
          >
            No services yet for this line.
          </Typography>
        ) : (
          sorted.map((s) => (
            <Box
              key={s.id}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 1,
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography sx={{ fontSize: "0.85rem" }}>{s.name}</Typography>
              <IconButton
                size="small"
                onClick={() => deleteService(s.id)}
                disabled={deletingId === s.id}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "error.main" },
                }}
              >
                {deletingId === s.id ? (
                  <CircularProgress size={14} />
                ) : (
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
