import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Box, Chip, Typography } from "@mui/material";

import ListDataGrid from "../../components/ListPageLayout/ListDataGrid";
import ListPageLayout from "../../components/ListPageLayout/ListPageLayout";
import ListToolbar from "../../components/ListPageLayout/ListToolbar";

/**
 * The sites API returns `service_lines` as an array of objects:
 *   { contract_site_id, service_line, status_id, status, status_color }
 *
 * It used to return an array of plain strings. Normalizing both shapes here
 * means the grid renders correctly regardless of which version of the API is
 * answering, and guarantees we never hand React an object as a child (the
 * "Objects are not valid as a React child" error).
 */
const normalizeServiceLine = (sl) => {
  if (sl == null) return null;

  if (typeof sl === "string") {
    return {
      contract_site_id: null,
      service_line: sl,
      status: null,
      status_color: null,
    };
  }

  const name = sl.service_line ?? sl.name ?? null;
  if (!name) return null;

  return {
    contract_site_id: sl.contract_site_id ?? null,
    service_line: String(name),
    status: sl.status ?? null,
    status_color: sl.status_color ?? null,
  };
};

const getServiceLines = (site) =>
  (site?.service_lines ?? []).map(normalizeServiceLine).filter(Boolean);

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
        setSites(Array.isArray(response.data) ? response.data : []);
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
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
      .map(([value, label]) => ({ value, label }));
  }, [sites]);

  // Distinct service line NAMES — pulled off the normalized objects.
  const serviceLineOptions = useMemo(() => {
    const set = new Set();
    for (const s of sites) {
      for (const sl of getServiceLines(s)) set.add(sl.service_line);
    }
    return [...set].sort().map((name) => ({ value: name, label: name }));
  }, [sites]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((s) => {
      if (q) {
        const lines = getServiceLines(s)
          .map((sl) => sl.service_line)
          .join(" ");
        const hay =
          `${s.store ?? ""} ${s.client ?? ""} ${s.mailing_city ?? ""} ${s.mailing_state ?? ""} ${lines}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (clientFilter !== "all" && s.client_id !== Number(clientFilter))
        return false;

      if (
        serviceLineFilter !== "all" &&
        !getServiceLines(s).some((sl) => sl.service_line === serviceLineFilter)
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
        // `client` is serialized to a plain string server-side; fall back
        // gracefully if an object ever slips through.
        valueGetter: (value) =>
          typeof value === "string" ? value || "—" : (value?.client ?? "—"),
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
        // Sorting/filtering/export need a primitive, not the object array.
        valueGetter: (value, row) =>
          getServiceLines(row)
            .map((sl) => sl.service_line)
            .join(", "),
        renderCell: (params) => {
          const lines = getServiceLines(params.row);

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
              {visible.map((sl, i) => (
                <Chip
                  key={sl.contract_site_id ?? `${sl.service_line}-${i}`}
                  label={sl.service_line}
                  title={sl.status ?? undefined}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 22,
                    ...(sl.status_color && {
                      borderColor: sl.status_color,
                      color: sl.status_color,
                    }),
                  }}
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
