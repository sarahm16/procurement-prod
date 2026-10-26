// Notices/Forms/SiteTerminationAutocomplete.jsx
//
// Pick any number of the vendor's sites. Ported from the old app: "Select
// all" applies to what the search is showing, and the count underneath says
// how many are picked.
//
// sites: [{ site_id, client, store, address, lines: [{ service_line, … }] }]
import { useMemo, useRef } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { Box, Checkbox, Chip, TextField, Typography } from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

// Sentinel row for "Select all" inside the list.
const SELECT_ALL = { site_id: "__select_all__" };

const filter = createFilterOptions({
  stringify: (s) =>
    `${s.client} ${s.store} ${s.address} ${(s.lines ?? []).map((l) => l.service_line).join(" ")}`,
});

export default function SiteTerminationAutocomplete({
  sites = [],
  selectedSites,
  setSelectedSites,
  label = "Sites to terminate",
  disabled = false,
}) {
  // What the list is currently showing, so "Select all" applies to the
  // search results when there's a search.
  const visibleRef = useRef(sites);

  const selectedIds = useMemo(
    () => new Set(selectedSites.map((s) => s.site_id)),
    [selectedSites],
  );

  const handleChange = (event, newValue, reason, details) => {
    if (details?.option?.site_id === SELECT_ALL.site_id) {
      const pool = visibleRef.current;
      const allVisibleSelected = pool.length > 0 && pool.every((s) => selectedIds.has(s.site_id));
      if (allVisibleSelected) {
        const poolIds = new Set(pool.map((s) => s.site_id));
        setSelectedSites(selectedSites.filter((s) => !poolIds.has(s.site_id)));
      } else {
        setSelectedSites([...selectedSites, ...pool.filter((s) => !selectedIds.has(s.site_id))]);
      }
      return;
    }
    setSelectedSites(newValue.filter((s) => s.site_id !== SELECT_ALL.site_id));
  };

  return (
    <Autocomplete
      multiple
      size="small"
      disabled={disabled}
      disableCloseOnSelect
      options={sites}
      value={selectedSites}
      onChange={handleChange}
      isOptionEqualToValue={(o, v) => o.site_id === v.site_id}
      getOptionLabel={(s) =>
        s.site_id === SELECT_ALL.site_id ? "Select all" : `${s.client} — ${s.store} — ${s.address}`
      }
      filterOptions={(options, params) => {
        const filtered = filter(options, params);
        visibleRef.current = filtered;
        return filtered.length > 0 ? [SELECT_ALL, ...filtered] : filtered;
      }}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;

        if (option.site_id === SELECT_ALL.site_id) {
          const pool = visibleRef.current;
          const count = pool.filter((s) => selectedIds.has(s.site_id)).length;
          const all = pool.length > 0 && count === pool.length;
          return (
            <li key="select-all" {...optionProps}>
              <Checkbox size="small" sx={{ mr: 1 }} checked={all} indeterminate={count > 0 && !all} />
              <Typography variant="body2" fontWeight={600}>
                {all ? "Deselect all" : "Select all"}
                {pool.length !== sites.length ? ` (${pool.length} shown)` : ""}
              </Typography>
            </li>
          );
        }

        const lines = option.lines ?? [];
        return (
          <li key={option.site_id} {...optionProps}>
            <Checkbox size="small" icon={icon} checkedIcon={checkedIcon} sx={{ mr: 1 }} checked={selected} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" noWrap>
                {option.client} — {option.store}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {option.address || "No address"} · {lines.map((l) => l.service_line).join(", ")}
              </Typography>
            </Box>
          </li>
        );
      }}
      limitTags={4}
      ChipProps={{ size: "small" }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          placeholder={selectedSites.length ? "" : "Search sites…"}
          helperText={`${selectedSites.length} of ${sites.length} site${sites.length === 1 ? "" : "s"} selected`}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index });
          return <Chip key={key} size="small" label={option.store} {...tagProps} />;
        })
      }
    />
  );
}
