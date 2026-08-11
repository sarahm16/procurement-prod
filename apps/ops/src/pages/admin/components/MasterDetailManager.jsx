// admin/components/MasterDetailManager.jsx
import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";

/**
 * Generic master-detail layout for admin parent-child reference data.
 *
 * Left  (master): a selectable list of parent items, each showing a label and
 *                 an optional count/badge on the flex end.
 * Right (detail): whatever `renderDetail(selectedItem)` returns — typically an
 *                 editable table scoped to the selected parent.
 *
 * Reusable for any parent→children reference data (service lines→services,
 * or e.g. categories→items, regions→locations, etc.).
 *
 * Props:
 *  - items:        array of parent objects
 *  - loading:      boolean — show a spinner in the master list
 *  - getItemId:    (item) => unique id            (default: item.id)
 *  - getItemLabel: (item) => string label         (default: item.name)
 *  - getItemCount: (item) => number | null        (optional badge; null hides it)
 *  - renderDetail: (selectedItem) => ReactNode    (the right panel)
 *  - title:        optional heading above the master list
 *  - emptyMessage: shown in the detail area when nothing is selected
 *  - masterWidth:  px width of the master column (default 260)
 */
export default function MasterDetailManager({
  items = [],
  loading = false,
  getItemId = (i) => i.id,
  getItemLabel = (i) => i.name,
  getItemCount = () => null,
  renderDetail,
  title,
  emptyMessage = "Select an item to manage its details.",
  masterWidth = 260,
}) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState(null);

  // Default to the first item once items load (so the detail panel isn't empty).
  useEffect(() => {
    if (selectedId == null && items.length > 0) {
      setSelectedId(getItemId(items[0]));
    }
    // if the selected item disappeared (deleted), fall back to first
    if (selectedId != null && !items.some((i) => getItemId(i) === selectedId)) {
      setSelectedId(items.length > 0 ? getItemId(items[0]) : null);
    }
  }, [items, selectedId, getItemId]);

  const selectedItem = useMemo(
    () => items.find((i) => getItemId(i) === selectedId) ?? null,
    [items, selectedId, getItemId],
  );

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        height: "100%",
        minHeight: 0,
        alignItems: "stretch",
      }}
    >
      {/* Master list */}
      <Box
        sx={{
          width: masterWidth,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {title && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              {title}
            </Typography>
          </Box>
        )}

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          ) : items.length === 0 ? (
            <Typography
              sx={{ p: 2, fontSize: "0.82rem", color: "text.disabled" }}
            >
              Nothing to show.
            </Typography>
          ) : (
            items.map((item) => {
              const id = getItemId(item);
              const count = getItemCount(item);
              const selected = id === selectedId;
              return (
                <Box
                  key={id}
                  onClick={() => setSelectedId(id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    cursor: "pointer",
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    backgroundColor: selected
                      ? alpha(theme.palette.primary.main, 0.1)
                      : "transparent",
                    borderLeft: selected
                      ? `3px solid ${theme.palette.primary.main}`
                      : "3px solid transparent",
                    "&:hover": {
                      backgroundColor: selected
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      fontWeight: selected ? 600 : 500,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getItemLabel(item)}
                  </Typography>
                  {count != null && (
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.65rem",
                        flexShrink: 0,
                        backgroundColor: alpha(
                          theme.palette.text.primary,
                          0.08,
                        ),
                      }}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Detail panel */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        {selectedItem ? (
          renderDetail(selectedItem)
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
              {emptyMessage}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
