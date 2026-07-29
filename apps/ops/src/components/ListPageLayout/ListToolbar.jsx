// components/ListPageLayout/ListToolbar.jsx
import { Box, TextField, MenuItem, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

/**
 * filters: [{ label, value, onChange, options: [{ value, label }] }]
 */
export default function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  actions,
}) {
  return (
    <Box
      sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}
    >
      <TextField
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        sx={{ minWidth: 240 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            </InputAdornment>
          ),
        }}
      />
      {filters.map((f) => (
        <TextField
          key={f.label}
          select
          size="small"
          label={f.label}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          sx={{ minWidth: 170 }}
          disabled={f.options.length === 0}
        >
          <MenuItem value="all">All {f.label.toLowerCase()}</MenuItem>
          {f.options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      {actions && (
        <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>{actions}</Box>
      )}
    </Box>
  );
}
