import { useMemo, useState } from "react";
import dayjs from "dayjs";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Timeline from "@mui/icons-material/Timeline";
import History from "@mui/icons-material/History";
import Search from "@mui/icons-material/Search";
import Clear from "@mui/icons-material/Clear";

import CardComponent from "../CardComponent";

/* ---------- helpers ---------- */

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getActionColor = (action) => {
  switch (action?.toUpperCase()) {
    case "CREATE":
      return "success.main";
    case "UPDATE":
      return "info.main";
    case "DELETE":
      return "error.main";
    case "ASSIGN":
      return "primary.main";
    case "REMOVE":
      return "error.main";
    case "SEND":
      return "secondary.main";
    default:
      return "grey.500";
  }
};

// Turn "status_id" -> "Status", "contact_phone2" -> "Contact Phone 2"
const prettifyFieldName = (field) => {
  if (!field) return "";
  return field
    .replace(/_id$/i, "")
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
};

/**
 * Build the human-readable sentence for a single entry.
 * Kept as a pure function so search can match against the same string the user sees.
 */
const composeMessage = (entry, fieldLabels, valueFormatters) => {
  const action = entry.action?.toUpperCase();
  const label =
    fieldLabels[entry.field_changed] ?? prettifyFieldName(entry.field_changed);
  const formatter = valueFormatters[entry.field_changed];
  const previousValue = formatter
    ? formatter(entry.previous_value)
    : entry.previous_value;
  const value = formatter ? formatter(entry.new_value) : entry.new_value;

  switch (action) {
    case "CREATE":
      return entry.new_value
        ? `Created "${entry.new_value}"`
        : "Created this record";
    case "UPDATE":
      return label
        ? `Changed ${label} from ${previousValue ?? "—"} to ${value ?? "—"}`
        : `Updated to ${value ?? "—"}`;
    case "DELETE":
      return label ? `Removed ${label}` : "Deleted this record";
    default:
      // Fall back gracefully for action types we haven't enumerated
      return label
        ? `${action ?? "Changed"} ${label}${value ? ` → ${value}` : ""}`
        : (action ?? "Activity");
  }
};

/* ---------- subcomponents ---------- */

const ActivityItem = ({ entry, message, isLast }) => (
  <Box sx={{ display: "flex", gap: 2 }}>
    {/* Timeline rail */}
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: "0.75rem",
          fontWeight: 600,
          bgcolor: getActionColor(entry.action),
        }}
      >
        {getInitials(entry.changed_by_name)}
      </Avatar>
      {!isLast && (
        <Box
          sx={{
            width: 2,
            flexGrow: 1,
            bgcolor: "divider",
            my: 1,
            borderRadius: 1,
          }}
        />
      )}
    </Box>

    {/* Content */}
    <Box sx={{ flex: 1, pb: isLast ? 0 : 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 0.5,
          gap: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, color: "text.primary" }}
        >
          {entry.changed_by_name || "System"}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", whiteSpace: "nowrap" }}
        >
          {dayjs(entry.date).format("MMM D, YYYY · h:mm A")}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", lineHeight: 1.5 }}
      >
        {message}
      </Typography>
    </Box>
  </Box>
);

/* ---------- main component ---------- */

/**
 * ActivityLog — reusable activity feed.
 *
 * Props:
 *  - entries:          array of activity records (see shape below)
 *  - fieldLabels:      optional map of db field -> friendly label, e.g.
 *                      { status_id: "Status", contact_phone: "Phone" }
 *  - valueFormatters:  optional map of db field -> (value) => displayString,
 *                      handy for foreign keys: { status_id: (id) => statuses[id]?.name }
 *  - title:            card title (defaults to "Activity Log")
 *  - emptyMessage:     shown when there are no entries at all
 *  - maxHeight:        scroll container max height (px)
 *
 * Expected entry shape:
 *  { id, action, date, changed_by_name, new_value, field_changed }
 */
function ActivityLog({
  entries = [],
  fieldLabels = {},
  valueFormatters = {},
  title = "Activity Log",
  emptyMessage = "Activity will appear here as changes are made",
  maxHeight = 600,
}) {
  const [search, setSearch] = useState("");

  console.log("ActivityLog entries:", entries);

  // Compose messages once per entries/labels change, then sort newest -> oldest.
  // Doing this in a single memo keeps the search filter cheap on each keystroke.
  const prepared = useMemo(() => {
    return entries
      .map((e) => ({
        entry: e,
        message: composeMessage(e, fieldLabels, valueFormatters),
      }))
      .sort(
        (a, b) =>
          new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime(),
      );
  }, [entries, fieldLabels, valueFormatters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prepared;
    return prepared.filter(({ entry, message }) => {
      return (
        message.toLowerCase().includes(q) ||
        entry.changed_by_name?.toLowerCase().includes(q) ||
        entry.action?.toLowerCase().includes(q)
      );
    });
  }, [prepared, search]);

  const hasAnyEntries = prepared.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <CardComponent title={title} icon={<Timeline />}>
      {/* Search — only show when there's something to search */}
      {hasAnyEntries && (
        <TextField
          fullWidth
          size="small"
          placeholder="Search activity…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      )}

      {/* Empty state — no entries at all */}
      {!hasAnyEntries && (
        <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          <History sx={{ fontSize: 56, color: "grey.300", mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
            No activity yet
          </Typography>
          <Typography variant="body2">{emptyMessage}</Typography>
        </Box>
      )}

      {/* Empty state — search returned nothing */}
      {hasAnyEntries && !hasResults && (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography variant="body2">
            No activity matches “{search}”
          </Typography>
        </Box>
      )}

      {/* Timeline */}
      {hasResults && (
        <Box
          sx={{
            maxHeight,
            overflowY: "auto",
            pr: 1,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": {
              bgcolor: "grey.100",
              borderRadius: 3,
            },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "grey.300",
              borderRadius: 3,
              "&:hover": { bgcolor: "grey.400" },
            },
          }}
        >
          {filtered.map(({ entry, message }, index) => (
            <ActivityItem
              key={entry.id}
              entry={entry}
              message={message}
              isLast={index === filtered.length - 1}
            />
          ))}
        </Box>
      )}
    </CardComponent>
  );
}

export default ActivityLog;
