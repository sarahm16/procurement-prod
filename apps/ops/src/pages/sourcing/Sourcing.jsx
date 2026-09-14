import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Snackbar, Stack, Typography } from "@mui/material";

import SourcingToolbar from "./SourcingToolbar";
import SourcingGrid from "./SourcingGrid";
import SourcingPanel from "./SourcingPanel";
import SourcingBulkBar, { AssignConfirmDialog } from "./SourcingBulkBar";
import {
  DEFAULT_FILTERS,
  invalidateAssignableVendors,
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

  const filters = useMemo(
    () => ({ ...base, q: debouncedSearch }),
    [base, debouncedSearch],
  );

  const { rows, total, loading, error, patchRows } = useSourcing(filters);
  const clients = useClients();
  const serviceLines = useServiceLines();

  const [openRow, setOpenRow] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [pending, setPending] = useState(null); // { vendor, rows } awaiting confirmation
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const siteRows = useMemo(
    () => (openRow ? rows.filter((r) => r.site_id === openRow.site_id) : []),
    [rows, openRow],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.contract_site_id)),
    [rows, selected],
  );

  const sourcedCount = rows.filter((r) => r.is_sourced).length;

  const handleSort = (key) =>
    setBase((f) => ({
      ...f,
      sort: key,
      dir: f.sort === key && f.dir === "asc" ? "desc" : "asc",
      page: 1,
    }));

  const toggleRow = useCallback((id) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((s) => {
      const allOn =
        rows.length > 0 && rows.every((r) => s.has(r.contract_site_id));
      return allOn ? new Set() : new Set(rows.map((r) => r.contract_site_id));
    });
  }, [rows]);

  /** The single write path for every assign — inline, bulk, or confirmed. */
  const commitAssign = useCallback(
    async (vendor, targetRows, mode) => {
      setBusy(true);
      try {
        const { data } = await axios.post("/api/sourcing/assignments", {
          vendor_id: vendor.id,
          contract_site_ids: targetRows.map((r) => r.contract_site_id),
          mode,
          user_id: user?.id,
        });

        patchRows(data.rows);
        invalidateAssignableVendors();
        setSelected(new Set());
        setPending(null);

        const {
          assigned = [],
          replaced = [],
          skipped = [],
        } = data.summary ?? {};
        const parts = [];
        if (assigned.length) parts.push(`${assigned.length} assigned`);
        if (replaced.length) parts.push(`${replaced.length} replaced`);
        if (skipped.length) parts.push(`${skipped.length} skipped`);
        setToast(`${vendor.company} — ${parts.join(", ") || "no changes"}`);
      } catch (e) {
        console.error("Error assigning vendor:", e);
        setToast(e.response?.data?.error ?? "Couldn't assign that vendor.");
        setPending(null);
      } finally {
        setBusy(false);
      }
    },
    [patchRows, user?.id],
  );

  /** Inline cell edit. Empty rows go straight through; occupied ones confirm. */
  const handleAssignInline = useCallback(
    (row, vendor) => {
      if (row.vendor_id && row.vendor_id !== vendor.id)
        setPending({ vendor, rows: [row] });
      else if (!row.vendor_id) commitAssign(vendor, [row], "skip");
    },
    [commitAssign],
  );

  /** Bulk bar always confirms — it can touch dozens of rows at once. */
  const handleAssignBulk = useCallback(
    (vendor) => setPending({ vendor, rows: selectedRows }),
    [selectedRows],
  );

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
          setSelected(new Set());
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
        selected={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onAssignInline={handleAssignInline}
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

      <SourcingBulkBar
        count={selected.size}
        selectedRows={selectedRows}
        onClear={() => setSelected(new Set())}
        onAssign={handleAssignBulk}
      />

      <AssignConfirmDialog
        open={Boolean(pending)}
        vendor={pending?.vendor}
        rows={pending?.rows ?? []}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={(mode) => commitAssign(pending.vendor, pending.rows, mode)}
      />

      <SourcingPanel
        open={Boolean(openRow)}
        row={openRow}
        siteRows={siteRows}
        userId={user?.id}
        onClose={() => setOpenRow(null)}
        onRowsChanged={patchRows}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      />
    </Box>
  );
}
