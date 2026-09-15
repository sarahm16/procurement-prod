import { useCallback, useMemo } from "react";
import { Box, Typography, useTheme, alpha } from "@mui/material";
import { DataGridPro } from "@mui/x-data-grid-pro";

/**
 * ListDataGrid
 *
 * A DataGridPro wrapper that fills the remaining vertical height of the page
 * and scrolls only within the grid itself.
 *
 * Usage:
 *   <ListDataGrid
 *     rows={rows}
 *     columns={columns}
 *     loading={isLoading}
 *     onRowClick={(row) => navigate(`/sites/${row.id}`)}
 *     initialState={{ pinnedColumns: { left: ["work_order_number"] } }}
 *   />
 *
 * All additional DataGridPro props are spread onto the grid.
 */

/**
 * Striping has to come from getRowClassName, not a CSS :nth-child rule. The
 * grid virtualizes and recycles row elements while you scroll, so DOM order
 * doesn't track data order and nth-child bands visibly crawl.
 * `indexRelativeToCurrentPage` is the row's index among the rows currently
 * rendered, so the banding stays put through scrolling, sorting and filtering.
 */
const defaultGetRowClassName = (params) =>
  params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd";

/** Tree-data grouping column — the one holding the expand/collapse chevrons. */
export const TREE_GROUP_FIELD = "__tree_data_group__";

export default function ListDataGrid({
  rows = [],
  columns = [],
  loading = false,
  onRowClick,
  noRowsMessage = "No records found",
  toolbar,
  // Density. The defaults are deliberately tighter than MUI's — these grids
  // are scanned, and fitting more rows on screen is the point.
  rowHeight = 38,
  columnHeaderHeight = 40,
  striped = true,
  initialState,
  getRowClassName,
  ...rest
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  /**
   * Merged, not replaced. A caller passing `initialState={{ pinnedColumns }}`
   * through ...rest would otherwise wipe out the pagination default and
   * silently reset page size to 100.
   */
  const mergedInitialState = useMemo(
    () => ({
      pagination: { paginationModel: { pageSize: 50 } },
      ...initialState,
    }),
    [initialState],
  );

  /**
   * Normalized so callers get the row first — `(row) => navigate(...)` — which
   * is how every page already uses this. Auto-generated tree grouping rows
   * carry a synthetic string id and aren't real records, so they don't fire.
   */
  const handleRowClick = useCallback(
    (params, event, details) => {
      if (!onRowClick) return;
      if (
        typeof params.id === "string" &&
        params.id.startsWith("auto-generated-row")
      )
        return;
      onRowClick(params.row, params, event, details);
    },
    [onRowClick],
  );

  const stripe = isDark
    ? alpha("#FFFFFF", 0.022)
    : alpha(theme.palette.primary.main, 0.028);
  const hover = isDark
    ? alpha(theme.palette.primary.main, 0.1)
    : alpha(theme.palette.primary.main, 0.055);
  const selected = isDark
    ? alpha(theme.palette.primary.main, 0.18)
    : alpha(theme.palette.primary.main, 0.1);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        "& .MuiDataGrid-root": {
          border: "none",
          fontFamily: '"Barlow", sans-serif',
          fontSize: "0.82rem",
          color: theme.palette.text.primary,

          // ── Column headers ───────────────────────────────────────
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.primary.main, 0.05),
            borderBottom: `2px solid ${theme.palette.divider}`,
            borderRadius: 0,
          },
          "& .MuiDataGrid-columnHeader": {
            "&:focus, &:focus-within": { outline: "none" },
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 700,
            fontSize: "0.68rem",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: theme.palette.text.secondary,
          },
          "& .MuiDataGrid-sortIcon": { color: theme.palette.primary.main },
          "& .MuiDataGrid-columnSeparator": { color: theme.palette.divider },

          // ── Rows ────────────────────────────────────────────────
          "& .MuiDataGrid-row": {
            cursor: onRowClick ? "pointer" : "default",
            transition: "background-color 0.1s ease",
          },

          // Striping. Listed before hover/selected so those win — the banding
          // selectors are equally specific, so order decides.
          ...(striped && {
            "& .MuiDataGrid-row.row-even": { backgroundColor: "transparent" },
            "& .MuiDataGrid-row.row-odd": { backgroundColor: stripe },
          }),

          "& .MuiDataGrid-row:hover, & .MuiDataGrid-row.row-even:hover, & .MuiDataGrid-row.row-odd:hover":
            { backgroundColor: hover },

          "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.row-even.Mui-selected, & .MuiDataGrid-row.row-odd.Mui-selected":
            {
              backgroundColor: selected,
              "&:hover": { backgroundColor: selected },
            },

          // ── Cells ────────────────────────────────────────────────
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${theme.palette.divider}`,
            paddingTop: 0,
            paddingBottom: 0,
            "&:focus, &:focus-within": { outline: "none" },
          },

          // ── Pinned columns ───────────────────────────────────────
          // `inherit` is the important bit: a solid background here would sit
          // on top of the striping and the pinned columns would read as a
          // separate, un-banded table.
          "& .MuiDataGrid-cell--pinnedLeft, & .MuiDataGrid-cell--pinnedRight": {
            backgroundColor: "inherit",
            backgroundImage: "none",
          },
          "& .MuiDataGrid-columnHeader--pinnedLeft, & .MuiDataGrid-columnHeader--pinnedRight":
            {
              backgroundColor: isDark
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.primary.main, 0.05),
            },
          // v5-era class names, harmless on newer versions.
          "& .MuiDataGrid-pinnedColumns": {
            backgroundColor: "transparent",
            boxShadow: isDark
              ? `4px 0 8px ${alpha("#000", 0.4)}`
              : `4px 0 8px ${alpha("#000", 0.06)}`,
          },
          "& .MuiDataGrid-pinnedColumnHeaders": {
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.1)
              : alpha(theme.palette.primary.main, 0.05),
            boxShadow: isDark
              ? `4px 0 8px ${alpha("#000", 0.4)}`
              : `4px 0 8px ${alpha("#000", 0.06)}`,
          },

          // ── Tree data grouping column ────────────────────────────
          "& .MuiDataGrid-groupingCriteriaCell": { paddingLeft: 0 },
          "& .MuiDataGrid-treeDataGroupingCellToggle": {
            marginRight: theme.spacing(0.5),
            "& .MuiIconButton-root": { padding: 2 },
            "& svg": {
              fontSize: "1.05rem",
              color: theme.palette.text.secondary,
            },
          },

          // ── Footer / pagination ──────────────────────────────────
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.04)
              : alpha(theme.palette.primary.main, 0.02),
            minHeight: 44,
          },
          "& .MuiTablePagination-root": {
            fontFamily: '"Barlow", sans-serif',
            fontSize: "0.78rem",
            color: theme.palette.text.secondary,
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
            {
              fontFamily: '"Barlow", sans-serif',
              fontSize: "0.76rem",
            },

          // ── Toolbar ──────────────────────────────────────────────
          "& .MuiDataGrid-toolbarContainer": {
            padding: "8px 16px",
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: "background.paper",
          },

          "& .MuiDataGrid-overlay": { backgroundColor: "transparent" },

          // ── Scrollbars ───────────────────────────────────────────
          "& ::-webkit-scrollbar": { width: 8, height: 8 },
          "& ::-webkit-scrollbar-track": { backgroundColor: "transparent" },
          "& ::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
            borderRadius: 4,
            "&:hover": {
              backgroundColor: isDark
                ? alpha("#fff", 0.25)
                : alpha("#000", 0.25),
            },
          },
        },
      }}
    >
      <DataGridPro
        rows={rows}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        disableRowSelectionOnClick
        autoHeight={false}
        rowHeight={rowHeight}
        columnHeaderHeight={columnHeaderHeight}
        getRowClassName={
          getRowClassName ?? (striped ? defaultGetRowClassName : undefined)
        }
        pagination
        pageSizeOptions={[25, 50, 100, 250]}
        initialState={mergedInitialState}
        slots={{
          toolbar: toolbar ?? null,
          noRowsOverlay: () => (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontFamily: '"Barlow", sans-serif',
                  fontWeight: 500,
                }}
              >
                {noRowsMessage}
              </Typography>
            </Box>
          ),
        }}
        sx={{ flex: 1, minHeight: 0 }}
        {...rest}
      />
    </Box>
  );
}
