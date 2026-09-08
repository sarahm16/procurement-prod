import {
  Autocomplete,
  Box,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Order matches the grid's checklist columns so the chips read as the header.
export const MISSING_OPTIONS = [
  { key: "vendor", label: "Vendor" },
  { key: "w9", label: "W-9" },
  { key: "coi", label: "COI" },
  { key: "msa", label: "MSA" },
  { key: "ach", label: "ACH" },
  { key: "rates", label: "Rates" },
  { key: "sent", label: "Exhibit" },
  { key: "signed", label: "Signed" },
];

const Label = ({ children }) => (
  <Typography
    variant="overline"
    sx={{
      color: "text.secondary",
      fontSize: "0.65rem",
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </Typography>
);

export default function SourcingToolbar({
  filters,
  onChange,
  clients,
  serviceLines,
  searchText,
  onSearchText,
  onReset,
}) {
  const set = (patch) => onChange({ ...filters, ...patch, page: 1 });

  const toggleIn = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={2.5}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
      >
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => onSearchText(e.target.value)}
          placeholder="Search site or vendor…"
          InputProps={{
            startAdornment: (
              <SearchIcon
                fontSize="small"
                sx={{ mr: 0.75, color: "text.secondary" }}
              />
            ),
          }}
          sx={{ width: 240 }}
        />

        <Autocomplete
          size="small"
          options={clients}
          getOptionLabel={(o) => o.client ?? ""}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          value={clients.find((c) => c.id === filters.clientId) ?? null}
          onChange={(_, v) => set({ clientId: v?.id ?? null })}
          sx={{ width: 220 }}
          renderInput={(params) => <TextField {...params} label="Client" />}
        />

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
        >
          <Label>Service line</Label>
          {serviceLines.map((sl) => {
            const on = filters.serviceLineIds.includes(sl.id);
            return (
              <Chip
                key={sl.id}
                label={sl.name}
                size="small"
                variant={on ? "filled" : "outlined"}
                color={on ? "primary" : "default"}
                onClick={() =>
                  set({
                    serviceLineIds: toggleIn(filters.serviceLineIds, sl.id),
                  })
                }
              />
            );
          })}
        </Stack>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={filters.state}
          onChange={(_, v) => v && set({ state: v })}
        >
          <ToggleButton value="todo">Not sourced</ToggleButton>
          <ToggleButton value="sourced">Sourced</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>

        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
        >
          <Label>Missing</Label>
          {MISSING_OPTIONS.map((m) => {
            const on = filters.missing.includes(m.key);
            return (
              <Chip
                key={m.key}
                label={m.label}
                size="small"
                variant={on ? "filled" : "outlined"}
                color={on ? "error" : "default"}
                onClick={() =>
                  set({ missing: toggleIn(filters.missing, m.key) })
                }
              />
            );
          })}
        </Stack>

        <Button size="small" onClick={onReset} sx={{ ml: "auto" }}>
          Reset
        </Button>
      </Stack>
    </Box>
  );
}
