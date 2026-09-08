import {
  Box,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import { alpha } from "@mui/material/styles";

/* Column definitions drive both header rows and the body, so they can't drift. */
const CHECK_COLUMNS = [
  { key: "w9", label: "W-9", group: "vendor" },
  { key: "coi", label: "COI", group: "vendor" },
  { key: "msa", label: "MSA", group: "vendor" },
  { key: "ach", label: "ACH", group: "vendor" },
  { key: "rates", label: "Rates", group: "site" },
  { key: "sent", label: "Exhibit", group: "site" },
  { key: "signed", label: "Signed", group: "site" },
];

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      })
    : "";

/**
 * One checklist cell. Three states, because COI is genuinely tri-state:
 * done, needs attention (expired / expiring / unverified), and not started.
 */
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

export default function SourcingGrid({
  rows,
  loading,
  sort,
  dir,
  onSort,
  onOpenRow,
}) {
  const groupedBySite = sort === "site";

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
      <Table stickyHeader size="small" sx={{ minWidth: 1120 }}>
        <TableHead>
          {/* Group row — separates what belongs to the vendor from what belongs to this site. */}
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
                minWidth: 200,
                fontSize: "0.68rem",
              }}
            >
              <TableSortLabel
                active={sort === "site"}
                direction={sort === "site" ? dir : "asc"}
                onClick={() => onSort("site")}
              >
                Site
              </TableSortLabel>
            </TableCell>
            {[
              ["client", "Client", 160],
              ["line", "Service line", 130],
              ["vendor", "Vendor", 190],
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
              sx={{ ...headSx, top: 31, minWidth: 90, fontSize: "0.68rem" }}
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

            // Alternate the tint per site block rather than per row, so a
            // multi-service-line site reads as one thing.
            let band = 0;
            for (let j = 0; j <= i; j++) {
              if (!groupedBySite || rows[j - 1]?.site_id !== rows[j].site_id)
                band++;
            }
            const alt = groupedBySite && band % 2 === 0;

            const rowBg = alt ? "action.hover" : "background.default";

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

                <TableCell sx={{ py: 0.5, fontSize: "0.78rem" }}>
                  {row.vendor || (
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "0.78rem",
                        color: "error.main",
                        fontStyle: "italic",
                      }}
                    >
                      not assigned
                    </Typography>
                  )}
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
