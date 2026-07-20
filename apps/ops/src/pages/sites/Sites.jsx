import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Chip, TextField, MenuItem, Typography } from "@mui/material";

// Components
import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";

function Sites() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientFilter, setClientFilter] = useState("all");
  const [serviceLineFilter, setServiceLineFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/sites")
      .then((response) => {
        console.log("Fetched sites:", response.data);
        setSites(response.data);
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
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sites]);

  // Distinct service line names across the data — drives the service line filter.
  const serviceLineOptions = useMemo(() => {
    const set = new Set();
    for (const s of sites) for (const sl of s.service_lines ?? []) set.add(sl);
    return [...set].sort();
  }, [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (clientFilter !== "all" && s.client_id !== Number(clientFilter))
        return false;
      if (
        serviceLineFilter !== "all" &&
        !(s.service_lines ?? []).includes(serviceLineFilter)
      )
        return false;
      return true;
    });
  }, [sites, clientFilter, serviceLineFilter]);

  const columns = useMemo(
    () => [
      {
        field: "store",
        headerName: "Site",
        flex: 1,
        minWidth: 120,
        valueGetter: (value) => value || "Unnamed site",
      },
      {
        field: "client",
        headerName: "Client",
        flex: 1.2,
        minWidth: 150,
        valueGetter: (value) => value || "—",
      },
      {
        field: "location",
        headerName: "Location",
        flex: 1.2,
        minWidth: 160,
        valueGetter: (value, row) => {
          const city = row.mailing_city?.trim();
          const state = row.mailing_state?.trim(); // Char(50) — trim the padding
          if (city && state) return `${city}, ${state}`;
          return city || state || "—";
        },
      },
      {
        field: "service_lines",
        headerName: "Service Lines",
        flex: 1.6,
        minWidth: 240,
        sortable: false,
        renderCell: (params) => {
          const lines = params.row.service_lines ?? [];
          if (lines.length === 0)
            return (
              <Typography sx={{ color: "text.disabled", fontSize: "0.8rem" }}>
                —
              </Typography>
            );
          const visible = lines.slice(0, 3);
          const extra = lines.length - visible.length;
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
              {visible.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22 }}
                />
              ))}
              {extra > 0 && (
                <Chip
                  label={`+${extra}`}
                  size="small"
                  sx={{ height: 22, fontWeight: 600 }}
                />
              )}
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <ListPageLayout>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          gap: 2,
        }}
      >
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          {filteredSites.length} {filteredSites.length === 1 ? "site" : "sites"}
          {(clientFilter !== "all" || serviceLineFilter !== "all") &&
            " · filtered"}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <TextField
            select
            size="small"
            label="Client"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            sx={{ minWidth: 180 }}
            disabled={clientOptions.length === 0}
          >
            <MenuItem value="all">All clients</MenuItem>
            {clientOptions.map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Service Line"
            value={serviceLineFilter}
            onChange={(e) => setServiceLineFilter(e.target.value)}
            sx={{ minWidth: 180 }}
            disabled={serviceLineOptions.length === 0}
          >
            <MenuItem value="all">All service lines</MenuItem>
            {serviceLineOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      <ListDataGrid
        rows={filteredSites}
        columns={columns}
        loading={loading}
        onRowClick={(row) => navigate(`/sites/${row.id}`)}
      />
    </ListPageLayout>
  );
}

export default Sites;
