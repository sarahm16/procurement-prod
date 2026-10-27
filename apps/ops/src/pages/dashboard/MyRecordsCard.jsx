// Dashboard/MyRecordsCard.jsx
//
// The work orders, sites, clients and vendors the person is on (any role on
// the record's Team card). Work orders come first: open ones, late at the
// top. Each row opens the record.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import SearchIcon from "@mui/icons-material/Search";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";

import { fmtDay } from "../../components/Tasks/taskUtils";

const FONT = '"Barlow", sans-serif';
const SEARCH_FROM = 8;

const TABS = [
  { key: "workorders", label: "Work orders", Icon: AssignmentOutlinedIcon, empty: "work orders" },
  { key: "sites", label: "Sites", Icon: StorefrontOutlinedIcon, empty: "sites" },
  { key: "clients", label: "Clients", Icon: BusinessOutlinedIcon, empty: "clients" },
  { key: "vendors", label: "Vendors", Icon: EngineeringOutlinedIcon, empty: "vendors" },
];

// Site and client statuses come as words from the status views.
const WORD_COLORS = {
  active: "#16a34a",
  upcoming: "#2563eb",
  paused: "#d97706",
  ended: "#64748b",
  contract_ended: "#64748b",
  inactive: "#64748b",
  removed: "#64748b",
};

function useColor() {
  const theme = useTheme();
  return (c) => {
    if (!c) return theme.palette.text.secondary;
    if (c.startsWith("#") || c.startsWith("rgb")) return c;
    return theme.palette[c]?.main ?? WORD_COLORS[c.toLowerCase()] ?? theme.palette.text.secondary;
  };
}

const titleCase = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

function StatusChip({ name, color }) {
  if (!name) return null;
  return (
    <Box
      component="span"
      sx={{
        fontFamily: FONT,
        fontSize: "0.62rem",
        fontWeight: 700,
        color,
        bgcolor: alpha(color, 0.1),
        border: `1px solid ${alpha(color, 0.25)}`,
        borderRadius: "20px",
        px: 0.8,
        py: 0.05,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </Box>
  );
}

function RecordRow({ item, kind }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const colorOf = useColor();

  let status = null;
  if (kind === "workorders" || kind === "vendors") {
    if (item.status) status = { name: item.status.name, color: colorOf(item.status.color) };
  } else if (item.paused) {
    status = { name: "Paused", color: WORD_COLORS.paused };
  } else if (item.status) {
    status = { name: titleCase(item.status), color: colorOf(item.status) };
  }

  const dateBits = [];
  if (kind === "workorders" && !item.closed) {
    if (item.start_date) dateBits.push(`Starts ${fmtDay(item.start_date)}`);
    if (item.due_date) dateBits.push(item.late ? `Was due ${fmtDay(item.due_date)}` : `Due ${fmtDay(item.due_date)}`);
  }

  return (
    <Box
      role="link"
      tabIndex={0}
      onClick={() => navigate(item.path)}
      onKeyDown={(e) => e.key === "Enter" && navigate(item.path)}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        px: 1.5,
        py: 1,
        cursor: "pointer",
        borderTop: `1px solid ${theme.palette.divider}`,
        "&:first-of-type": { borderTop: 0 },
        opacity: item.closed ? 0.6 : 1,
        borderLeft: "3px solid",
        borderLeftColor: item.late ? "error.main" : "transparent",
        "&:hover": { bgcolor: "action.hover" },
        "&:focus-visible": { outline: `2px solid ${theme.palette.secondary.main}`, outlineOffset: -2 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Typography sx={{ fontFamily: FONT, fontSize: "0.86rem", fontWeight: 600 }}>{item.label}</Typography>
          {status && <StatusChip {...status} />}
          {kind === "workorders" && item.phase === "finance" && !item.closed && (
            <StatusChip name="Finance" color="#1B3A5C" />
          )}
        </Box>
        <Typography
          sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}
          noWrap
          title={[item.sublabel, item.roles.join(", ")].filter(Boolean).join(" · ")}
        >
          {[item.sublabel, item.roles.join(", ")].filter(Boolean).join(" · ")}
        </Typography>
        {dateBits.length > 0 && (
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "0.7rem",
              color: item.late ? "error.main" : "text.disabled",
              fontWeight: item.late ? 600 : 400,
              mt: 0.1,
            }}
          >
            {dateBits.join(" · ")}
          </Typography>
        )}
      </Box>
      {item.my_open_tasks > 0 && (
        <Tooltip title={`${item.my_open_tasks} open task${item.my_open_tasks === 1 ? "" : "s"} for you here`}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
              mt: 0.2,
              fontFamily: FONT,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "secondary.main",
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              borderRadius: "20px",
              px: 0.75,
              py: 0.1,
              flexShrink: 0,
            }}
          >
            <TaskAltIcon sx={{ fontSize: 12 }} />
            {item.my_open_tasks}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}

export default function MyRecordsCard({ data, loading, error }) {
  const theme = useTheme();
  const [tab, setTab] = useState("workorders");
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState("");

  const all = data?.[tab] ?? [];
  const closedCount = tab === "workorders" ? all.filter((w) => w.closed).length : 0;
  const lateCount = (data?.workorders ?? []).filter((w) => w.late).length;

  const shown = useMemo(() => {
    let rows = tab === "workorders" && !showClosed ? all.filter((w) => !w.closed) : all;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.label, r.sublabel, r.roles.join(" "), r.status?.name ?? r.status].some((v) =>
          String(v ?? "").toLowerCase().includes(q),
        ),
      );
    }
    return rows;
  }, [all, tab, showClosed, search]);

  const tabLabel = (t) => {
    const n = data?.counts?.[t.key] ?? 0;
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        {t.label}
        {n > 0 && (
          <Box
            component="span"
            sx={{
              fontSize: "0.62rem",
              fontWeight: 700,
              px: 0.7,
              borderRadius: "99px",
              bgcolor: t.key === "workorders" && lateCount ? alpha(theme.palette.error.main, 0.12) : alpha(theme.palette.primary.main, 0.08),
              color: t.key === "workorders" && lateCount ? "error.main" : "primary.main",
            }}
          >
            {n}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, pt: 1.25 }}>
        <FolderSharedOutlinedIcon sx={{ fontSize: 18, color: "secondary.main" }} />
        <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.9rem" }}>My records</Typography>
        <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.disabled" }}>
          wherever you're on the team
        </Typography>
      </Box>
      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v);
          setSearch("");
        }}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          px: 1,
          minHeight: 40,
          borderBottom: `1px solid ${theme.palette.divider}`,
          "& .MuiTab-root": {
            minHeight: 40,
            minWidth: 0,
            fontFamily: FONT,
            fontSize: "0.78rem",
            textTransform: "none",
            fontWeight: 600,
            px: 1,
          },
        }}
      >
        {TABS.map((t) => (
          <Tab key={t.key} value={t.key} label={tabLabel(t)} />
        ))}
      </Tabs>

      {(all.length >= SEARCH_FROM || closedCount > 0) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {all.length >= SEARCH_FROM && (
            <TextField
              size="small"
              placeholder={`Search ${TABS.find((t) => t.key === tab).empty}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, "& .MuiInputBase-root": { fontSize: "0.8rem", height: 32 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
            />
          )}
          {closedCount > 0 && (
            <FormControlLabel
              control={<Switch size="small" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />}
              label={
                <Typography sx={{ fontFamily: FONT, fontSize: "0.72rem", color: "text.secondary" }}>
                  Closed ({closedCount})
                </Typography>
              }
              sx={{ ml: "auto", mr: 0 }}
            />
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 1.5, fontSize: "0.8rem" }}>
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={22} color="secondary" />
        </Box>
      ) : shown.length === 0 ? (
        <Typography
          sx={{ fontFamily: FONT, fontSize: "0.8rem", color: "text.secondary", textAlign: "center", py: 4, px: 3 }}
        >
          {search
            ? `No ${TABS.find((t) => t.key === tab).empty} match "${search}".`
            : all.length
              ? "No open work orders. Turn on Closed to see the rest."
              : `You're not on the team for any ${TABS.find((t) => t.key === tab).empty}.`}
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 560, overflowY: "auto" }}>
          {shown.map((item) => (
            <RecordRow key={item.id} item={item} kind={tab} />
          ))}
        </Box>
      )}
    </Box>
  );
}
