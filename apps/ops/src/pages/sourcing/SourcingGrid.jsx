import { useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { alpha } from "@mui/material/styles";

import { useAssignableVendors, milesBetween } from "./useSourcing";
import { fmtDate } from "../../utils/date";

/* Column definitions drive both header rows and the body, so they can't drift. */
const CHECK_COLUMNS = [
  { key: "w9", label: "W-9" },
  { key: "coi", label: "COI" },
  { key: "msa", label: "MSA" },
  { key: "ach", label: "ACH" },
  { key: "rates", label: "Rates" },
  { key: "sent", label: "Exhibit" },
  { key: "signed", label: "Signed" },
];

function CheckMark({ value, title }) {
  const common = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "inline-grid",
    placeItems: "center",
  };
  let node;
  if (value === null || value === undefined) {
    node = (
      <Box
        component="span"
        sx={{ ...common, color: "text.disabled", fontSize: 14, lineHeight: 1 }}
      >
        ·
      </Box>
    );
  } else if (value === true) {
    node = (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "success.main", color: "common.white" }}
      >
        <CheckIcon sx={{ fontSize: 12 }} />
      </Box>
    );
  } else if (value === "warn") {
    node = (
      <Box
        component="span"
        sx={{ ...common, bgcolor: "warning.main", color: "common.white" }}
      >
        <PriorityHighIcon sx={{ fontSize: 12 }} />
      </Box>
    );
  } else {
    node = (
      <Box
        component="span"
        sx={{
          ...common,
          border: 1.5,
          borderColor: "divider",
          borderStyle: "solid",
        }}
      />
    );
  }
  return title ? (
    <Tooltip title={title} arrow enterDelay={400}>
      {node}
    </Tooltip>
  ) : (
    node
  );
}

const checkTitle = (row, key) => {
  if (!row.vendor_id) return "No vendor assigned";
  const v = row.checks[key];
  switch (key) {
    case "coi":
      if (!row.coi_expiration) return "No COI on file";
      return v === true
        ? `COI valid to ${fmtDate(row.coi_expiration)}`
        : `COI expired or expiring — ${fmtDate(row.coi_expiration)}`;
    case "rates":
      return v
        ? "Rates entered for every service"
        : `${row.priced_count} of ${row.service_count} services priced`;
    case "sent":
      return v
        ? `Exhibit sent ${fmtDate(row.exhibit_sent_at)}`
        : "Exhibit not sent";
    case "signed":
      return v ? `Signed ${fmtDate(row.exhibit_signed_at)}` : "Not signed";
    default:
      return v
        ? `${key.toUpperCase()} on file`
        : `${key.toUpperCase()} missing`;
  }
};

/* ── Inline vendor cell ──────────────────────────────────────────────────
 * Click the vendor cell to edit it in place, Excel style. Options are sorted
 * by distance from THIS row's site, so the nearest vendor is always first.
 */
function VendorCell({ row, vendors, editing, onStartEdit, onPick, onCancel }) {
  const options = useMemo(() => {
    if (!vendors) return [];
    return vendors
      .map((v) => ({
        ...v,
        mi: milesBetween({ lat: row.site_lat, lng: row.site_lng }, v),
      }))
      .sort((a, b) => (a.mi ?? 1e9) - (b.mi ?? 1e9));
  }, [vendors, row.site_lat, row.site_lng]);

  if (!editing) {
    return (
      <Box
        onClick={(e) => {
          e.stopPropagation();
          onStartEdit();
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          cursor: "text",
          borderRadius: 0.5,
          px: 0.5,
          mx: -0.5,
          "&:hover": { bgcolor: "action.hover", "& .editIcon": { opacity: 1 } },
        }}
      >
        {row.vendor ? (
          <Typography
            sx={{
              fontSize: "0.78rem",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {row.vendor}
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: "0.78rem",
              color: "error.main",
              fontStyle: "italic",
            }}
          >
            not assigned
          </Typography>
        )}
        <EditOutlinedIcon
          className="editIcon"
          sx={{
            fontSize: 13,
            color: "text.disabled",
            opacity: 0,
            transition: "opacity .12s",
            ml: "auto",
          }}
        />
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Autocomplete
        open
        autoHighlight
        openOnFocus
        size="small"
        options={options}
        loading={!vendors}
        getOptionLabel={(o) => o.company ?? ""}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(opts, state) => {
          const t = state.inputValue.trim().toLowerCase();
          const filtered = t
            ? opts.filter((o) =>
                `${o.company} ${o.contact_name ?? ""} ${o.city ?? ""}`
                  .toLowerCase()
                  .includes(t),
              )
            : opts;
          return filtered.slice(0, 50);
        }}
        onChange={(_, v) => v && onPick(v)}
        onBlur={onCancel}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
        renderOption={(props, o) => {
          const { key, ...rest } = props;
          return (
            <li key={o.id} {...rest}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
                  {o.company}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                >
                  {[
                    o.mi != null ? `${o.mi.toFixed(1)} mi` : "no coordinates",
                    o.city,
                    o.contact_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus
            placeholder="Search vendors…"
            variant="standard"
          />
        )}
        sx={{ minWidth: 170 }}
      />
    </Box>
  );
}

export default function SourcingGrid({
  rows,
  loading,
  sort,
  dir,
  onSort,
  onOpenRow,
  selected,
  onToggleRow,
  onToggleAll,
  onAssignInline,
}) {
  const { vendors } = useAssignableVendors();
  const [editingId, setEditingId] = useState(null);
  const groupedBySite = sort === "site";

  const allSelected =
    rows.length > 0 && rows.every((r) => selected.has(r.contract_site_id));
  const someSelected =
    rows.some((r) => selected.has(r.contract_site_id)) && !allSelected;

  const headSx = {
    bgcolor: "background.paper",
    borderBottom: 1,
    borderColor: "divider",
    fontFamily: '"Barlow Condensed", sans-serif',
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    py: 0.75,
  };

  const stickyLeft = (bg) => ({
    position: "sticky",
    left: 0,
    zIndex: 2,
    bgcolor: bg,
    borderRight: 1,
    borderColor: "divider",
  });

  return (
    <TableContainer sx={{ maxHeight: "calc(100vh - 210px)" }}>
      <Table stickyHeader size="small" sx={{ minWidth: 1160 }}>
        <TableHead>
          <TableRow>
            <TableCell
              colSpan={5}
              sx={{
                ...headSx,
                ...stickyLeft("background.paper"),
                fontSize: "0.6rem",
                top: 0,
              }}
            />
            <TableCell
              colSpan={4}
              align="center"
              sx={(t) => ({
                ...headSx,
                top: 0,
                fontSize: "0.6rem",
                color: "primary.main",
                bgcolor: alpha(
                  t.palette.primary.main,
                  t.palette.mode === "dark" ? 0.16 : 0.06,
                ),
              })}
            >
              Vendor compliance
            </TableCell>
            <TableCell
              colSpan={3}
              align="center"
              sx={(t) => ({
                ...headSx,
                top: 0,
                fontSize: "0.6rem",
                bgcolor: alpha(
                  t.palette.text.primary,
                  t.palette.mode === "dark" ? 0.08 : 0.04,
                ),
              })}
            >
              This site
            </TableCell>
            <TableCell sx={{ ...headSx, top: 0 }} />
          </TableRow>

          <TableRow>
            <TableCell
              sortDirection={sort === "site" ? dir : false}
              sx={{
                ...headSx,
                ...stickyLeft("background.paper"),
                top: 31,
                minWidth: 230,
                fontSize: "0.68rem",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onToggleAll}
                  sx={{ p: 0.25 }}
                />
                <TableSortLabel
                  active={sort === "site"}
                  direction={sort === "site" ? dir : "asc"}
                  onClick={() => onSort("site")}
                >
                  Site
                </TableSortLabel>
              </Box>
            </TableCell>

            {[
              ["client", "Client", 150],
              ["line", "Service line", 125],
              ["vendor", "Vendor", 195],
            ].map(([key, label, w]) => (
              <TableCell
                key={key}
                sx={{ ...headSx, top: 31, minWidth: w, fontSize: "0.68rem" }}
              >
                <TableSortLabel
                  active={sort === key}
                  direction={sort === key ? dir : "asc"}
                  onClick={() => onSort(key)}
                >
                  {label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell
              sx={{ ...headSx, top: 31, minWidth: 84, fontSize: "0.68rem" }}
            >
              Services
            </TableCell>

            {CHECK_COLUMNS.map((c) => (
              <TableCell
                key={c.key}
                align="center"
                sx={{
                  ...headSx,
                  top: 31,
                  width: 54,
                  px: 0.5,
                  fontSize: "0.68rem",
                }}
              >
                <TableSortLabel
                  active={sort === c.key}
                  direction={sort === c.key ? dir : "asc"}
                  onClick={() => onSort(c.key)}
                >
                  {c.label}
                </TableSortLabel>
              </TableCell>
            ))}

            <TableCell
              align="right"
              sx={{ ...headSx, top: 31, width: 96, fontSize: "0.68rem" }}
            >
              <TableSortLabel
                active={sort === "done"}
                direction={sort === "done" ? dir : "asc"}
                onClick={() => onSort("done")}
              >
                Status
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {loading &&
            rows.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell colSpan={13}>
                  <Skeleton height={22} />
                </TableCell>
              </TableRow>
            ))}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={13}>
                <Typography
                  sx={{ py: 6, textAlign: "center", color: "text.secondary" }}
                >
                  Nothing matches these filters. Hit Reset to start over.
                </Typography>
              </TableCell>
            </TableRow>
          )}

          {rows.map((row, i) => {
            const prev = rows[i - 1];
            const newSite = !groupedBySite || prev?.site_id !== row.site_id;
            const continued = groupedBySite && !newSite;
            const isSelected = selected.has(row.contract_site_id);

            let band = 0;
            for (let j = 0; j <= i; j++) {
              if (!groupedBySite || rows[j - 1]?.site_id !== rows[j].site_id)
                band++;
            }
            const alt = groupedBySite && band % 2 === 0;
            const rowBg = isSelected
              ? "action.selected"
              : alt
                ? "action.hover"
                : "background.default";

            return (
              <TableRow
                key={row.contract_site_id}
                hover
                onClick={() => onOpenRow(row)}
                sx={{
                  cursor: "pointer",
                  bgcolor: rowBg,
                  ...(newSite &&
                    i > 0 && {
                      "& td": { borderTop: 2, borderTopColor: "divider" },
                    }),
                }}
              >
                <TableCell sx={{ ...stickyLeft(rowBg), py: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleRow(row.contract_site_id)}
                      sx={{ p: 0.25 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      {!continued && (
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            lineHeight: 1.3,
                          }}
                        >
                          {row.site}
                        </Typography>
                      )}
                      {!continued && row.city && (
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            color: "text.secondary",
                            lineHeight: 1.3,
                          }}
                        >
                          {row.city}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>

                <TableCell
                  sx={{ py: 0.5, fontSize: "0.78rem", color: "text.secondary" }}
                >
                  {continued ? "" : row.client || "—"}
                </TableCell>

                <TableCell
                  sx={{ py: 0.5, fontSize: "0.78rem", fontWeight: 500 }}
                >
                  {row.service_line}
                </TableCell>

                <TableCell sx={{ py: 0.25 }}>
                  <VendorCell
                    row={row}
                    vendors={vendors}
                    editing={editingId === row.contract_site_id}
                    onStartEdit={() => setEditingId(row.contract_site_id)}
                    onCancel={() => setEditingId(null)}
                    onPick={(vendor) => {
                      setEditingId(null);
                      onAssignInline(row, vendor);
                    }}
                  />
                </TableCell>

                <TableCell
                  sx={{
                    py: 0.5,
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.priced_count}/{row.service_count}
                </TableCell>

                {CHECK_COLUMNS.map((c) => (
                  <TableCell
                    key={c.key}
                    align="center"
                    sx={{ py: 0.5, px: 0.5 }}
                  >
                    <CheckMark
                      value={row.checks[c.key]}
                      title={checkTitle(row, c.key)}
                    />
                  </TableCell>
                ))}

                <TableCell align="right" sx={{ py: 0.5 }}>
                  {row.is_sourced ? (
                    <Chip
                      label="Sourced"
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.completed_steps}/7
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
