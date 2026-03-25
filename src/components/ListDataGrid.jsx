import { useRef } from "react";
import { Box, Typography, useTheme, alpha } from "@mui/material";
import { DataGridPro } from "@mui/x-data-grid-pro";

/**
 * AppDataGrid
 *
 * A reusable DataGrid Pro wrapper that fills the remaining vertical
 * height of the page and scrolls only within the grid itself.
 *
 * Usage:
 *   <AppDataGrid
 *     rows={rows}
 *     columns={columns}
 *     loading={isLoading}
 *     onRowClick={({ row }) => navigate(`/sites/${row.id}`)}
 *   />
 *
 * All additional DataGridPro props are spread onto the grid.
 */
export default function ListDataGrid({
  rows = [],
  columns = [],
  loading = false,
  onRowClick,
  noRowsMessage = "No records found",
  // Toolbar slot — pass a custom toolbar component if needed
  toolbar,
  ...rest
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);

  return (
    <Box
      ref={containerRef}
      sx={{
        flex: 1, // fills remaining height in parent flex column
        minHeight: 0, // critical — allows flex child to shrink below content size
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        "& .MuiDataGrid-root": {
          border: "none",
          fontFamily: '"Barlow", sans-serif',
          fontSize: "0.85rem",
          color: theme.palette.text.primary,

          // ── Column headers ───────────────────────────────────────
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.primary.main, 0.04),
            borderBottom: `2px solid ${theme.palette.divider}`,
            borderRadius: 0,
          },
          "& .MuiDataGrid-columnHeader": {
            "&:focus, &:focus-within": { outline: "none" },
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 700,
            fontSize: "0.72rem",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: theme.palette.text.secondary,
          },
          "& .MuiDataGrid-sortIcon": {
            color: theme.palette.primary.main,
          },

          // ── Rows ────────────────────────────────────────────────
          "& .MuiDataGrid-row": {
            cursor: onRowClick ? "pointer" : "default",
            transition: "background-color 0.1s ease",
            "&:hover": {
              backgroundColor: isDark
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.primary.main, 0.04),
            },
            "&.Mui-selected": {
              backgroundColor: isDark
                ? alpha(theme.palette.primary.main, 0.16)
                : alpha(theme.palette.primary.main, 0.08),
              "&:hover": {
                backgroundColor: isDark
                  ? alpha(theme.palette.primary.main, 0.22)
                  : alpha(theme.palette.primary.main, 0.12),
              },
            },
          },

          // ── Cells ────────────────────────────────────────────────
          "& .MuiDataGrid-cell": {
            borderBottom: `1px solid ${theme.palette.divider}`,
            "&:focus, &:focus-within": { outline: "none" },
          },

          // ── Footer / pagination ──────────────────────────────────
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: isDark
              ? alpha(theme.palette.primary.main, 0.04)
              : alpha(theme.palette.primary.main, 0.02),
            minHeight: 48,
          },
          "& .MuiTablePagination-root": {
            fontFamily: '"Barlow", sans-serif',
            fontSize: "0.8rem",
            color: theme.palette.text.secondary,
          },
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows":
            {
              fontFamily: '"Barlow", sans-serif',
              fontSize: "0.78rem",
            },

          // ── Toolbar ──────────────────────────────────────────────
          "& .MuiDataGrid-toolbarContainer": {
            padding: "8px 16px",
            gap: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: "background.paper",
          },

          // ── Overlay ──────────────────────────────────────────────
          "& .MuiDataGrid-overlay": {
            backgroundColor: "transparent",
          },

          // ── Scrollbar styling ────────────────────────────────────
          "& ::-webkit-scrollbar": {
            width: 6,
            height: 6,
          },
          "& ::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "& ::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? alpha("#fff", 0.15) : alpha("#000", 0.15),
            borderRadius: 3,
            "&:hover": {
              backgroundColor: isDark
                ? alpha("#fff", 0.25)
                : alpha("#000", 0.25),
            },
          },

          // ── Pin columns (DataGrid Pro) ───────────────────────────
          "& .MuiDataGrid-pinnedColumns, & .MuiDataGrid-pinnedColumnHeaders": {
            backgroundColor: isDark
              ? theme.palette.background.paper
              : "#ffffff",
            boxShadow: isDark
              ? `2px 0 8px ${alpha("#000", 0.4)}`
              : `2px 0 8px ${alpha("#000", 0.08)}`,
          },
        },
      }}
    >
      <DataGridPro
        rows={rows}
        columns={columns}
        loading={loading}
        onRowClick={onRowClick}
        disableRowSelectionOnClick
        autoHeight={false} // must be false to fill height
        pagination
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
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
