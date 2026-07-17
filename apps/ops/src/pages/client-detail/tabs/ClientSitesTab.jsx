// Client Sites Tab
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";

import ListDataGrid from "../../../components/ListPageLayout/ListDataGrid";
import { useClientActions, useClientSites } from "../ClientDetailProvider";

function ClientSitesTab() {
  const navigate = useNavigate();
  const sites = useClientSites();
  const { loadSites } = useClientActions();

  const [serviceLineFilter, setServiceLineFilter] = useState("all");

  useEffect(() => {
    if (sites === null) loadSites();
  }, [sites, loadSites]);

  // Distinct service lines present across the loaded sites — drives the filter select.
  // Works off site.serviceLines once the endpoint provides it; empty until then.
  const serviceLineOptions = useMemo(() => {
    if (!sites) return [];
    const map = new Map();
    for (const s of sites) {
      for (const sl of s.serviceLines ?? []) map.set(sl.id, sl);
    }
    return [...map.values()];
  }, [sites]);

  const filteredSites = useMemo(() => {
    if (!sites) return [];
    if (serviceLineFilter === "all") return sites;
    return sites.filter((s) =>
      (s.serviceLines ?? []).some((sl) => sl.id === Number(serviceLineFilter)),
    );
  }, [sites, serviceLineFilter]);

  const columns = useMemo(
    () => [
      {
        field: "store",
        headerName: "Site",
        flex: 1.4,
        minWidth: 180,
        valueGetter: (value) => value || "Unnamed site",
      },
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
        field: "serviceLines",
        headerName: "Service Lines",
        flex: 1.6,
        minWidth: 240,
        sortable: false,
        renderCell: (params) => {
          const lines = params.row.serviceLines ?? [];
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
              {visible.map((sl) => (
                <Chip
                  key={sl.id}
                  label={sl.name}
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

  // Loading (null = not yet fetched, per the lazy-slice convention)
  if (sites === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (sites.length === 0) {
    return (
      <Typography sx={{ py: 4, textAlign: "center", color: "text.disabled" }}>
        No sites for this client yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
          {filteredSites.length} {filteredSites.length === 1 ? "site" : "sites"}
          {serviceLineFilter !== "all" && ` · filtered`}
        </Typography>

        <TextField
          select
          size="small"
          label="Service Line"
          value={serviceLineFilter}
          onChange={(e) => setServiceLineFilter(e.target.value)}
          sx={{ minWidth: 200 }}
          disabled={serviceLineOptions.length === 0}
        >
          <MenuItem value="all">All service lines</MenuItem>
          {serviceLineOptions.map((sl) => (
            <MenuItem key={sl.id} value={sl.id}>
              {sl.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <ListDataGrid
        rows={filteredSites}
        columns={columns}
        onRowClick={(row) => navigate(`/sites/${row.id}`)}
      />
    </Box>
  );
}

export default ClientSitesTab;
