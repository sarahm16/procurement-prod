// components/DetailPageLayout/ActivityLog.jsx
//
// A record's Activity tab: who did what, and when, newest first, grouped by
// day. Each entry is { id, action, date, changed_by_name } from the detail
// endpoint's `activity_log` (serializer/activityLogSerializer.js).
//
// Older props (fieldLabels, …) are accepted and ignored, so existing pages
// don't need to change.
import { useMemo, useState } from "react";
import { Avatar, Box, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

function dayLabel(d) {
  const x = new Date(d);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dayKey(x) === dayKey(today)) return "Today";
  if (dayKey(x) === dayKey(yesterday)) return "Yesterday";
  return x.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(x.getFullYear() !== today.getFullYear() && { year: "numeric" }),
  });
}

const timeText = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function ActivityLog({ entries = [] }) {
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = [...entries]
      .filter((e) => !term || `${e.action} ${e.changed_by_name}`.toLowerCase().includes(term))
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
    const out = [];
    for (const e of list) {
      const key = dayKey(e.date);
      if (out[out.length - 1]?.key !== key) out.push({ key, label: dayLabel(e.date), items: [] });
      out[out.length - 1].items.push(e);
    }
    return out;
  }, [entries, q]);

  if (!entries.length) {
    return (
      <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
        <HistoryIcon sx={{ fontSize: 32, opacity: 0.5 }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Nothing has happened here yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {entries.length > 8 && (
        <TextField
          size="small"
          placeholder="Search activity"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2, width: { xs: "100%", sm: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {groups.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
          No activity matches “{q}”.
        </Typography>
      )}

      <Stack spacing={2.5}>
        {groups.map((g) => (
          <Box key={g.key}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}
            >
              {g.label}
            </Typography>
            <Stack spacing={0} sx={{ mt: 0.75 }}>
              {g.items.map((e, i) => (
                <Box
                  key={e.id}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    py: 1.1,
                    borderTop: i ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Avatar
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      color: "primary.main",
                    }}
                  >
                    {initials(e.changed_by_name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                      {e.action}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {e.changed_by_name} · {timeText(e.date)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
