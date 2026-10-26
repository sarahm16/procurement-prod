// Notices/Forms/NoticeLinePicker.jsx
//
// Which of the vendor's sites — and which service lines at each — a notice
// is about. The site search is SiteTerminationAutocomplete (select all,
// search, "N of M"); under it, each picked site lists its lines, all ticked,
// to untick any that aren't part of it.
//
// Used by the termination and warning forms. The form owns the state:
//   const [selectedSites, setSelectedSites] = useState([]);
//   const [excluded, setExcluded] = useState(new Set());   // assignment ids
//   const chosen = chosenLines(selectedSites, excluded);
import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import SiteTerminationAutocomplete from "./SiteTerminationAutocomplete";

/** Picked sites with only their ticked lines; sites with none ticked drop out. */
export const chosenLines = (selectedSites, excluded) =>
  selectedSites
    .map((s) => ({ ...s, lines: s.lines.filter((l) => !excluded.has(l.assignment_id)) }))
    .filter((s) => s.lines.length);

/** Toggle one assignment id in a Set held in state. */
export const toggleIn = (setExcluded, id) =>
  setExcluded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

export default function NoticeLinePicker({
  sites,
  selectedSites,
  setSelectedSites,
  excluded,
  setExcluded,
  label,
  untickHint = "Untick a service line to leave it out.",
}) {
  const chosen = chosenLines(selectedSites, excluded);
  const lineCount = chosen.reduce((n, s) => n + s.lines.length, 0);

  return (
    <Box>
      <SiteTerminationAutocomplete
        sites={sites}
        selectedSites={selectedSites}
        setSelectedSites={setSelectedSites}
        label={label}
      />

      {selectedSites.length > 0 && (
        <Box
          sx={{
            mt: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1.5,
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {selectedSites.map((s, i) => (
            <Box
              key={s.site_id}
              sx={{
                px: 1.5,
                py: 0.75,
                borderTop: i ? 1 : 0,
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ minWidth: 150, flex: "1 1 150px" }}>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }} noWrap>
                  {s.store}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }} noWrap>
                  {s.client}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1 }}>
                {s.lines.map((l) => (
                  <FormControlLabel
                    key={l.assignment_id}
                    sx={{ mr: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={!excluded.has(l.assignment_id)}
                        onChange={() => toggleIn(setExcluded, l.assignment_id)}
                        sx={{ p: 0.5 }}
                      />
                    }
                    label={
                      <Typography sx={{ fontSize: "0.8rem" }}>
                        {l.service_line}
                        {!l.is_primary && (
                          <Box component="span" sx={{ color: "text.secondary" }}>
                            {" "}
                            (backup)
                          </Box>
                        )}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.75 }}>
        {lineCount} service line{lineCount === 1 ? "" : "s"} at {chosen.length} site
        {chosen.length === 1 ? "" : "s"}.{selectedSites.length ? ` ${untickHint}` : ""}
      </Typography>
    </Box>
  );
}
