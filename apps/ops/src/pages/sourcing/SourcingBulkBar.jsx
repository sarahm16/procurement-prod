import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import { useAssignableVendors } from "./useSourcing";

/**
 * One dialog for every assign that isn't trivially safe.
 *
 * "Trivially safe" means assigning to rows that have nobody on them — the grid
 * already shows what you picked and it's one click to change. Anything that
 * would displace an existing vendor asks first, and never replaces by default.
 */
export function AssignConfirmDialog({
  open,
  vendor,
  rows,
  busy,
  onCancel,
  onConfirm,
}) {
  const [replace, setReplace] = useState(false);

  const empty = rows.filter((r) => !r.vendor_id);
  const occupied = rows.filter(
    (r) => r.vendor_id && r.vendor_id !== vendor?.id,
  );
  const already = rows.filter((r) => r.vendor_id === vendor?.id);

  const willTouch = empty.length + (replace ? occupied.length : 0);

  const handleClose = () => {
    setReplace(false);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
      >
        Assign {vendor?.company}?
      </DialogTitle>

      <DialogContent>
        {empty.length > 0 && (
          <Typography sx={{ fontSize: "0.88rem", mb: occupied.length ? 2 : 0 }}>
            <strong>{empty.length}</strong> service line
            {empty.length === 1 ? "" : "s"} with no vendor will be assigned.
          </Typography>
        )}

        {already.length > 0 && (
          <Typography
            sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 2 }}
          >
            {already.length} already {already.length === 1 ? "has" : "have"}{" "}
            this vendor and will be left alone.
          </Typography>
        )}

        {occupied.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography
              sx={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "warning.main",
                mb: 1,
              }}
            >
              {occupied.length} already{" "}
              {occupied.length === 1 ? "has a" : "have"} vendor
            </Typography>

            <Box sx={{ maxHeight: 180, overflowY: "auto", mb: 1.5 }}>
              {occupied.map((r) => (
                <Stack
                  key={r.contract_site_id}
                  direction="row"
                  spacing={1}
                  sx={{ py: 0.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Typography
                    sx={{ fontSize: "0.78rem", flex: 1, minWidth: 0 }}
                  >
                    {r.site} · {r.service_line}
                  </Typography>
                  <Typography
                    sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                  >
                    {r.vendor}
                  </Typography>
                </Stack>
              ))}
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                />
              }
              label={
                <Typography sx={{ fontSize: "0.82rem" }}>
                  Replace{" "}
                  {occupied.length === 1
                    ? "this vendor"
                    : `these ${occupied.length} vendors`}{" "}
                  too
                </Typography>
              }
            />
            <Typography
              sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}
            >
              Replaced assignments are marked terminated, not deleted — their
              rates and exhibits stay on the record.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={handleClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={replace && occupied.length ? "warning" : "primary"}
          disabled={busy || willTouch === 0}
          onClick={() => {
            onConfirm(replace ? "replace" : "skip");
            setReplace(false);
          }}
        >
          {willTouch === 0
            ? "Nothing to do"
            : `Assign to ${willTouch} service line${willTouch === 1 ? "" : "s"}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Sticky bar that appears once rows are ticked. Picking a vendor here is how
 * you put one vendor onto twenty sites without opening a single panel.
 */
export default function SourcingBulkBar({
  count,
  selectedRows,
  onClear,
  onAssign,
}) {
  const { vendors } = useAssignableVendors();
  const [vendor, setVendor] = useState(null);

  const siteCount = useMemo(
    () => new Set(selectedRows.map((r) => r.site_id)).size,
    [selectedRows],
  );

  if (count === 0) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        px: 2,
        py: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 2,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Box>
        <Typography
          sx={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.2 }}
        >
          {count} service line{count === 1 ? "" : "s"} selected
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
          across {siteCount} site{siteCount === 1 ? "" : "s"}
        </Typography>
      </Box>

      <Autocomplete
        size="small"
        options={vendors ?? []}
        loading={!vendors}
        value={vendor}
        onChange={(_, v) => setVendor(v)}
        getOptionLabel={(o) => o.company ?? ""}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(opts, state) => {
          const t = state.inputValue.trim().toLowerCase();
          const f = t
            ? opts.filter((o) =>
                `${o.company} ${o.contact_name ?? ""} ${o.city ?? ""}`
                  .toLowerCase()
                  .includes(t),
              )
            : opts;
          return f.slice(0, 50);
        }}
        sx={{ width: 260 }}
        renderInput={(params) => (
          <TextField {...params} label="Assign vendor" />
        )}
      />

      <Button
        variant="contained"
        disabled={!vendor}
        onClick={() => {
          onAssign(vendor);
          setVendor(null);
        }}
      >
        Assign
      </Button>

      <Button
        size="small"
        color="inherit"
        startIcon={<CloseIcon sx={{ fontSize: 15 }} />}
        onClick={onClear}
      >
        Clear
      </Button>
    </Paper>
  );
}
