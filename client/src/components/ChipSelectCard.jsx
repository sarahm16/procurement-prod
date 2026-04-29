import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Popover,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  InputAdornment,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

/**
 * ChipSelectCard
 * -----------------------------------------------------------------------------
 * Card-shaped multi-select that mirrors the InfoCard look. Selected items
 * render as deletable chips; the "+" button in the header opens a searchable
 * popover for toggling options on/off. Built to be reusable for trades,
 * tags, categories, capabilities, etc.
 *
 * Usage:
 *
 *   <ChipSelectCard
 *     title="Trades"
 *     icon={<HandymanIcon />}
 *     options={[
 *       { name: "snow",          id: "Snow" },
 *       { name: "snow-hauling",  id: "Snow Hauling" },
 *       { name: "snow-plowing",  id: "Snow Plowing" },
 *       { name: "janitorial",    id: "Janitorial" },
 *       { name: "asphalt",       id: "Asphalt" },
 *     ]}
 *     value={vendor.trades}
 *     onChange={(next) => updateVendor({ trades: next })}
 *     allowCreate
 *     onCreate={(id) => createTrade(id)}
 *   />
 *
 * Props:
 *   title              string     Header label (uppercase, like InfoCard)
 *   icon               node       Optional icon shown to the left of title
 *   options            array      [{name,id}] OR string[]
 *   value              string[]   Currently selected values
 *   onChange           fn         (nextValues: string[]) => void
 *   collapsible        bool       default true
 *   defaultOpen        bool       default true
 *   span               'half'|'full'  Grid span when used in a CSS grid
 *   searchPlaceholder  string     Popover search input placeholder
 *   emptyMessage       string     Shown when nothing is selected
 *   noOptionsMessage   string     Shown when search returns nothing
 *   disabled           bool       Read-only mode (no add, no delete)
 *   allowCreate        bool       Allow typing brand-new options
 *   onCreate           fn         (id: int) => void  (fires when user creates)
 * -----------------------------------------------------------------------------
 */
export function ChipSelectCard({
  title,
  icon,
  options = [],
  value = [],
  onChange,
  collapsible = true,
  defaultOpen = true,
  span = "half",
  searchPlaceholder = "Search...",
  emptyMessage = "Nothing selected yet",
  noOptionsMessage = "No matches",
  disabled = false,
  allowCreate = false,
  onCreate,

  onDelete, // (value) => void  (fires when user deletes a chip)
  onAdd, // (value) => void  (fires when user adds a chip, either by toggling or creating)
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [open, setOpen] = useState(defaultOpen);
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState("");

  const optionMap = useMemo(() => {
    const map = new Map();
    options.forEach((opt) => map.set(opt.name, opt));
    return map;
  }, [options]);

  // Fall back to the raw value if it's not in the options list
  const labelFor = (val) => optionMap.get(val)?.name ?? val;

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [options, search]);

  const isSelected = (val) => {
    return value.some((v) => v.id === val.id);
  };

  const toggle = (val) => {
    if (isSelected(val)) {
      onDelete?.(val);
    } else {
      console.log("Toggling on value:", val);
      onAdd?.(val);
    }
  };

  const remove = (val) => {
    console.log("Removing value:", val);
    onDelete?.(val);
    onChange?.(value.filter((v) => v.id !== val.id));
  };

  const handleAddClick = (e) => {
    e.stopPropagation(); // don't toggle collapse
    setAnchorEl(e.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSearch("");
  };

  const trimmedSearch = search.trim();
  const showCreateOption =
    allowCreate &&
    trimmedSearch.length > 0 &&
    !options.some(
      (opt) => opt.name.toLowerCase() === trimmedSearch.toLowerCase(),
    );

  const handleCreate = () => {
    if (!trimmedSearch) return;
    onCreate?.(trimmedSearch);
    if (!value.includes(trimmedSearch)) {
      onChange?.([...value, { name: trimmedSearch, id: trimmedSearch }]);
    }
    setSearch("");
  };

  return (
    <Box
      sx={{
        gridColumn: span === "full" ? "1 / -1" : undefined,
        backgroundColor: "background.paper",
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        transition: "box-shadow 0.15s ease",
        "&:hover": {
          boxShadow: isDark
            ? `0 2px 12px ${alpha("#000", 0.3)}`
            : `0 2px 12px ${alpha("#000", 0.06)}`,
        },
      }}
    >
      {/* Header — matches InfoCard exactly */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: isDark
            ? alpha(theme.palette.primary.main, 0.06)
            : alpha(theme.palette.primary.main, 0.03),
          borderBottom: open ? `1px solid ${theme.palette.divider}` : "none",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              fontFamily: '"Barlow", sans-serif',
              fontWeight: 600,
              fontSize: "0.78rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {title}
            {value.length > 0 && (
              <Box
                component="span"
                sx={{
                  ml: 1,
                  fontWeight: 500,
                  color: "text.disabled",
                  letterSpacing: 0,
                }}
              >
                {value.length}
              </Box>
            )}
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!disabled && (
            <Tooltip title="Add">
              <IconButton
                size="small"
                onClick={handleAddClick}
                sx={{
                  color: "text.disabled",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {collapsible && (
            <Box sx={{ color: "text.disabled", display: "flex", ml: 0.5 }}>
              {open ? (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Body — chips wrap area */}
      <Collapse in={open}>
        <Box sx={{ px: 2, py: 1.5 }}>
          {value.length === 0 ? (
            <Typography
              sx={{
                fontSize: "0.85rem",
                color: "text.disabled",
                fontStyle: "italic",
                py: 0.25,
              }}
            >
              {emptyMessage}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.75,
              }}
            >
              {value.map((val) => {
                return (
                  <Chip
                    key={val.id}
                    label={val.name}
                    onDelete={disabled ? undefined : () => remove(val)}
                    color="primary"
                    size="small"
                    sx={{
                      fontFamily: '"Barlow", sans-serif',
                      fontWeight: 500,
                      fontSize: "0.8rem",
                      height: 26,
                      "& .MuiChip-deleteIcon": {
                        fontSize: 16,
                        color: alpha("#fff", 0.7),
                        "&:hover": { color: "#fff" },
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Add/Toggle popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 0.5,
            width: 280,
            maxHeight: 360,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: isDark
              ? `0 4px 20px ${alpha("#000", 0.5)}`
              : `0 4px 20px ${alpha("#000", 0.1)}`,
          },
        }}
      >
        <Box
          sx={{
            p: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption) {
                e.preventDefault();
                handleCreate();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiInputBase-input": {
                fontSize: "0.85rem",
                fontFamily: '"Barlow", sans-serif',
              },
            }}
          />
        </Box>

        <List
          dense
          disablePadding
          sx={{
            overflowY: "auto",
            flex: 1,
          }}
        >
          {filteredOptions.length === 0 && !showCreateOption && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontStyle: "italic" }}
              >
                {noOptionsMessage}
              </Typography>
            </Box>
          )}

          {filteredOptions.map((opt) => {
            const selected = isSelected(opt);
            return (
              <ListItemButton
                key={opt.name}
                onClick={() => toggle(opt)}
                sx={{
                  py: 0.5,
                  px: 1.5,
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                  },
                }}
              >
                <Checkbox
                  edge="start"
                  size="small"
                  checked={selected}
                  tabIndex={-1}
                  disableRipple
                  sx={{ mr: 1, p: 0.5 }}
                />
                <ListItemText
                  primary={opt.name}
                  primaryTypographyProps={{
                    fontSize: "0.85rem",
                    fontFamily: '"Barlow", sans-serif',
                    fontWeight: selected ? 600 : 400,
                  }}
                />
              </ListItemButton>
            );
          })}

          {showCreateOption && (
            <ListItemButton
              onClick={handleCreate}
              sx={{
                py: 0.75,
                px: 1.5,
                borderTop:
                  filteredOptions.length > 0
                    ? `1px solid ${theme.palette.divider}`
                    : "none",
                color: "primary.main",
              }}
            >
              <AddIcon sx={{ fontSize: 16, mr: 1 }} />
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  fontFamily: '"Barlow", sans-serif',
                  fontWeight: 500,
                }}
              >
                Create &ldquo;{trimmedSearch}&rdquo;
              </Typography>
            </ListItemButton>
          )}
        </List>
      </Popover>
    </Box>
  );
}
