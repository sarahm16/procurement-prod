import { useMemo, useState } from "react";
import { Box, Button, Stack, Typography, Alert } from "@mui/material";

import SourcingToolbar from "./SourcingToolbar";
import SourcingGrid from "./SourcingGrid";
import SourcingPanel from "./SourcingPanel";
import {
  DEFAULT_FILTERS,
  useClients,
  useDebounced,
  useServiceLines,
  useSourcing,
} from "./useSourcing";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

export default function Sourcing() {
  const { user } = useAuthenticatedUser();

  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounced(searchText, 300);

  const [base, setBase] = useState(DEFAULT_FILTERS);

  // Keep the debounced search out of the filter object the user edits, so
  // typing doesn't reset the page on every keystroke.
  const filters = useMemo(
    () => ({ ...base, q: debouncedSearch }),
    [base, debouncedSearch],
  );

  const { rows, total, loading, error, patchRows } = useSourcing(filters);
  const clients = useClients();
  const serviceLines = useServiceLines();

  const [openRow, setOpenRow] = useState(null);

  const siteRows = useMemo(
    () => (openRow ? rows.filter((r) => r.site_id === openRow.site_id) : []),
    [rows, openRow],
  );

  const sourcedCount = rows.filter((r) => r.is_sourced).length;

  const handleSort = (key) =>
    setBase((f) => ({
      ...f,
      sort: key,
      dir: f.sort === key && f.dir === "asc" ? "desc" : "asc",
      page: 1,
    }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          flexWrap="wrap"
        >
          <Box>
            <Typography variant="h4">Sourcing</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
              {loading && !rows.length
                ? "Loading…"
                : `${total.toLocaleString()} service line${total === 1 ? "" : "s"} match`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={3}>
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", fontSize: "0.62rem" }}
              >
                Sourced on page
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "success.main",
                  lineHeight: 1.1,
                }}
              >
                {sourcedCount}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", fontSize: "0.62rem" }}
              >
                To go
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "error.main",
                  lineHeight: 1.1,
                }}
              >
                {rows.length - sourcedCount}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      <SourcingToolbar
        filters={base}
        onChange={setBase}
        clients={clients}
        serviceLines={serviceLines}
        searchText={searchText}
        onSearchText={setSearchText}
        onReset={() => {
          setSearchText("");
          setBase(DEFAULT_FILTERS);
        }}
      />

      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <SourcingGrid
        rows={rows}
        loading={loading}
        sort={base.sort}
        dir={base.dir}
        onSort={handleSort}
        onOpenRow={setOpenRow}
      />

      {rows.length < total && (
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ px: 2.5, py: 2 }}
        >
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            Showing {rows.length.toLocaleString()} of {total.toLocaleString()}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setBase((f) => ({ ...f, limit: f.limit + 100 }))}
          >
            Load more
          </Button>
        </Stack>
      )}

      <SourcingPanel
        open={Boolean(openRow)}
        row={openRow}
        siteRows={siteRows}
        userId={user?.id}
        onClose={() => setOpenRow(null)}
        onRowsChanged={patchRows}
      />
    </Box>
  );
}
