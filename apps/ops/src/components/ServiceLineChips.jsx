// components/ServiceLineChips/ServiceLineChips.jsx
//
// Service lines as chips in their own icon + colour (constants/
// serviceLineConfig), shared by every list so they all look the same.
//
//   <ServiceLineChips lines={[{ name: "Snow" }, { name: "Landscaping",
//                               status_key: "upcoming", starts_on: "2026-11-01" }]} />
//
// A line is { name, status_key?, starts_on?, ends_on? }. Only `name` is
// required; give a status and dates and the chip explains itself on hover.
// Upcoming lines get a dashed outline.
import { Box, Chip, Tooltip, Typography, alpha } from "@mui/material";
// Adjust this path to wherever constants/ lives relative to components/.
import { getServiceLineConfig } from "../*/constants/serviceLineConfig";

/** "2026-11-01" → "Nov 1, 2026" without the timezone shifting the day. */
const fmtDay = (ymd) =>
  ymd
    ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

const lineTooltip = (line) => {
  if (line.status_key === "upcoming") return `Starts ${fmtDay(line.starts_on)}`;
  if (line.ends_on) return `Active · last day ${fmtDay(line.ends_on)}`;
  if (line.status_key === "active") return "Active";
  return line.name;
};

export function ServiceLineChip({ line }) {
  const { color, icon: Icon } = getServiceLineConfig(line.name);
  const upcoming = line.status_key === "upcoming";
  return (
    <Tooltip title={lineTooltip(line)} arrow enterDelay={300}>
      <Chip
        icon={<Icon />}
        label={line.name}
        size="small"
        sx={{
          height: 24,
          fontWeight: 600,
          fontSize: "0.72rem",
          // Dark text: light line colours (Snow's ice blue) aren't readable
          // as text. The colour lives in the icon, tint and border.
          color: "text.primary",
          bgcolor: alpha(color, upcoming ? 0.05 : 0.12),
          border: `1px ${upcoming ? "dashed" : "solid"} ${alpha(color, 0.45)}`,
          opacity: upcoming ? 0.85 : 1,
          "& .MuiChip-icon": { color, fontSize: 15, ml: 0.75 },
        }}
      />
    </Tooltip>
  );
}

/**
 * A row of chips sized for a grid cell: the first `max`, then "+N" with the
 * rest on hover. Shows "—" when there are none.
 */
export default function ServiceLineChips({ lines = [], max = 3 }) {
  if (!lines.length)
    return (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography sx={{ color: "text.disabled", fontSize: "0.8rem" }}>
          —
        </Typography>
      </Box>
    );

  const visible = lines.slice(0, max);
  const rest = lines.slice(max);

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.5,
        alignItems: "center",
        height: "100%",
        flexWrap: "nowrap",
        overflow: "hidden",
      }}
    >
      {visible.map((line, i) => (
        <ServiceLineChip key={line.key ?? `${line.name}-${i}`} line={line} />
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map((l) => l.name).join(", ")} arrow>
          <Chip
            label={`+${rest.length}`}
            size="small"
            sx={{ height: 24, fontWeight: 600, fontSize: "0.72rem" }}
          />
        </Tooltip>
      )}
    </Box>
  );
}

/**
 * The status cell both lists use: a dot in the status colour and its name.
 * `hint` (optional) shows on hover.
 */
export function StatusCell({ name, color, hint }) {
  const cell = (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.75, height: "100%" }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color ?? "#9CA3AF",
          flexShrink: 0,
        }}
      />
      <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>
        {name}
      </Typography>
    </Box>
  );
  return hint ? (
    <Tooltip title={hint} arrow enterDelay={300}>
      {cell}
    </Tooltip>
  ) : (
    cell
  );
}
