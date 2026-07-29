import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Chip, Typography } from "@mui/material";

import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";

function Sites() {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
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
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [sites]);

  // Distinct service line names — service_lines here is an array of strings.
  const serviceLineOptions = useMemo(() => {
    const set = new Set();
    for (const s of sites) for (const sl of s.service_lines ?? []) set.add(sl);
    return [...set].sort().map((name) => ({ value: name, label: name }));
  }, [sites]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (q) {
        const hay =
          `${s.store ?? ""} ${s.client ?? ""} ${s.mailing_city ?? ""} ${s.mailing_state ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (clientFilter !== "all" && s.client_id !== Number(clientFilter))
        return false;
      if (
        serviceLineFilter !== "all" &&
        !(s.service_lines ?? []).includes(serviceLineFilter)
      )
        return false;
      return true;
    });
  }, [sites, search, clientFilter, serviceLineFilter]);

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
    <ListPageLayout
      toolbar={
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search sites…"
          filters={[
            {
              label: "Client",
              value: clientFilter,
              onChange: setClientFilter,
              options: clientOptions,
            },
            {
              label: "Service Line",
              value: serviceLineFilter,
              onChange: setServiceLineFilter,
              options: serviceLineOptions,
            },
          ]}
        />
      }
    >
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
