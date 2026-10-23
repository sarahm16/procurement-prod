// pages/Workorders/WorkOrderFilters.jsx
//
// The filter bar above the work order grid.
//
//   Phase   Ops | Finance: which side of the job you're looking at. Each
//           phase has its own statuses, so the Status row changes with it.
//   Type    colour-coded chips, pick any number
//   Status  colour-coded chips in workflow order, pick any number
//   PM      avatar button → checklist (with "Mine" and "No PM")
//
// Nothing picked in a group means "all" for that group. Every chip shows how
// many work orders it would match given the OTHER filters, so you can see
// what a click will do before making it.
import { useState } from "react";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";

export const NO_PM = "__none__";

const FALLBACK = "#6b7280";

/** alpha() throws on anything it can't parse; a bad DB colour shouldn't. */
const safeAlpha = (c, a) => {
  try {
    return alpha(c, a);
  } catch {
    return alpha(FALLBACK, a);
  }
};
const safeColor = (c) => {
  try {
    alpha(c, 1);
    return c;
  } catch {
    return FALLBACK;
  }
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** A stable colour per person so the same PM always looks the same. */
const avatarColor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 45%, 46%)`;
};

const PmAvatar = ({ name, size = 24 }) => (
  <Avatar
    sx={{
      width: size,
      height: size,
      fontSize: size * 0.42,
      fontWeight: 700,
      bgcolor: avatarColor(name),
    }}
  >
    {initials(name)}
  </Avatar>
);

/* ── Chips ────────────────────────────────────────────────────────────── */

function FilterChip({ label, color = FALLBACK, count, selected, onClick, title }) {
  const theme = useTheme();
  const c = safeColor(color);
  const empty = count === 0 && !selected;
  const fg = selected ? theme.palette.getContrastText(c) : c;

  const chip = (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        height: 28,
        px: 1.25,
        gap: 0.75,
        borderRadius: 14,
        fontFamily: "inherit",
        fontSize: "0.78rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: fg,
        bgcolor: selected ? c : safeAlpha(c, 0.07),
        border: `1px solid ${selected ? c : safeAlpha(c, 0.35)}`,
        opacity: empty ? 0.45 : 1,
        transition: "background-color .12s, border-color .12s, box-shadow .12s",
        boxShadow: selected ? `0 1px 3px ${safeAlpha(c, 0.4)}` : "none",
        "&:hover": {
          bgcolor: selected ? c : safeAlpha(c, 0.15),
          borderColor: c,
        },
        "&.Mui-focusVisible": {
          outline: `2px solid ${safeAlpha(c, 0.6)}`,
          outlineOffset: 2,
        },
      }}
    >
      {!selected && (
        <Box
          component="span"
          sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: c, flexShrink: 0 }}
        />
      )}
      {label}
      {count != null && (
        <Box
          component="span"
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            px: 0.75,
            minWidth: 20,
            lineHeight: "18px",
            textAlign: "center",
            borderRadius: 9,
            bgcolor: selected ? "rgba(255,255,255,0.25)" : safeAlpha(c, 0.12),
          }}
        >
          {count}
        </Box>
      )}
    </ButtonBase>
  );
  return title ? <Tooltip title={title}>{chip}</Tooltip> : chip;
}

/** The neutral "All" chip at the start of each row. */
function AllChip({ selected, onClick, count }) {
  const theme = useTheme();
  return (
    <FilterChip
      label="All"
      color={theme.palette.primary.main}
      selected={selected}
      onClick={onClick}
      count={count}
    />
  );
}

const RowLabel = ({ children }) => (
  <Typography
    sx={{
      width: 52,
      flexShrink: 0,
      pt: "6px",
      fontSize: "0.66rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "text.secondary",
    }}
  >
    {children}
  </Typography>
);

const toggle = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

function ChipRow({ label, options, selected, onChange, total }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
      <RowLabel>{label}</RowLabel>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, minWidth: 0 }}>
        <AllChip
          selected={selected.length === 0}
          onClick={() => onChange([])}
          count={total}
        />
        {options.map((o) => (
          <FilterChip
            key={o.name}
            label={o.name}
            color={o.color}
            count={o.count}
            title={o.description}
            selected={selected.includes(o.name)}
            onClick={() => onChange(toggle(selected, o.name))}
          />
        ))}
      </Box>
    </Box>
  );
}

/* ── Project manager picker ───────────────────────────────────────────── */

function PmFilter({ options, selected, onChange, me }) {
  const [anchor, setAnchor] = useState(null);
  const theme = useTheme();
  const active = selected.length > 0;
  const picked = selected.filter((n) => n !== NO_PM);
  const mineOnly = Boolean(me) && selected.length === 1 && selected[0] === me;
  const iAmAPm = Boolean(me) && options.some((o) => o.name === me);

  const label = !active
    ? "All PMs"
    : mineOnly
      ? "My work orders"
      : selected.length === 1
        ? selected[0] === NO_PM
          ? "No PM"
          : selected[0]
        : `${selected.length} selected`;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color={active ? "primary" : "inherit"}
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          height: 32,
          textTransform: "none",
          fontWeight: 600,
          borderColor: active ? undefined : theme.palette.divider,
          color: active ? undefined : "text.secondary",
          bgcolor: active ? alpha(theme.palette.primary.main, 0.06) : undefined,
          pl: picked.length ? 0.75 : 1.25,
        }}
      >
        {picked.length > 0 && (
          <AvatarGroup
            max={3}
            sx={{
              mr: 1,
              "& .MuiAvatar-root": {
                width: 22,
                height: 22,
                fontSize: 10,
                borderWidth: 1.5,
              },
            }}
          >
            {picked.map((n) => (
              <PmAvatar key={n} name={n} size={22} />
            ))}
          </AvatarGroup>
        )}
        {label}
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 260, maxHeight: 420 } } }}
        MenuListProps={{ dense: true }}
      >
        <MenuItem
          onClick={() => onChange([])}
          selected={!active}
          sx={{ fontWeight: 600 }}
        >
          All project managers
        </MenuItem>
        {iAmAPm && (
          <MenuItem
            onClick={() => {
              onChange(mineOnly ? [] : [me]);
              setAnchor(null);
            }}
            selected={mineOnly}
            sx={{ fontWeight: 600 }}
          >
            Only mine
          </MenuItem>
        )}
        <Divider />
        {options.map((o) => (
          <MenuItem key={o.name} onClick={() => onChange(toggle(selected, o.name))}>
            <Checkbox
              size="small"
              edge="start"
              checked={selected.includes(o.name)}
              sx={{ p: 0.5, mr: 1 }}
            />
            <ListItemIcon sx={{ minWidth: "32px !important" }}>
              {o.name === NO_PM ? (
                <PersonOffOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
              ) : (
                <PmAvatar name={o.name} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={o.name === NO_PM ? "No PM assigned" : o.name}
              primaryTypographyProps={{ fontSize: "0.82rem" }}
            />
            <Typography
              sx={{
                ml: 2,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "text.secondary",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {o.count}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/* ── Phase switch ─────────────────────────────────────────────────────── */

const PHASES = [
  { value: "ops", label: "Ops", Icon: EngineeringOutlinedIcon, hint: "Work orders still being worked" },
  { value: "finance", label: "Finance", Icon: AccountBalanceOutlinedIcon, hint: "Completed jobs with accounting" },
];

function PhaseSwitch({ phase, onChange, counts = {} }) {
  const theme = useTheme();
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={phase}
      // null = the active one clicked again; keep one selected.
      onChange={(_, v) => v && onChange(v)}
      sx={{
        bgcolor: "background.paper",
        "& .MuiToggleButton-root": {
          px: 1.75,
          py: 0.5,
          gap: 0.75,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.85rem",
          color: "text.secondary",
          "&.Mui-selected": {
            color: "primary.contrastText",
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          },
        },
      }}
    >
      {PHASES.map(({ value, label, Icon, hint }) => (
        <Tooltip key={value} title={hint} enterDelay={500}>
          <ToggleButton value={value} aria-label={label}>
            <Icon sx={{ fontSize: 18 }} />
            {label}
            <Box
              component="span"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                px: 0.75,
                minWidth: 22,
                borderRadius: 9,
                lineHeight: "18px",
                bgcolor:
                  phase === value
                    ? "rgba(255,255,255,0.22)"
                    : alpha(theme.palette.text.primary, 0.08),
              }}
            >
              {counts[value] ?? 0}
            </Box>
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}

/* ── The bar ──────────────────────────────────────────────────────────── */

export default function WorkOrderFilters({
  types,
  statuses,
  pms,
  value, // { types: [], statuses: [], pms: [] }
  onChange,
  totals, // { types, statuses } — counts behind each row's "All"
  phase = "ops",
  onPhaseChange,
  phaseCounts, // { ops, finance }
  me,
  actions,
}) {
  const theme = useTheme();
  const activeCount =
    value.types.length + value.statuses.length + value.pms.length;

  const set = (key) => (next) => onChange({ ...value, [key]: next });

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        bgcolor:
          theme.palette.mode === "dark"
            ? alpha(theme.palette.primary.main, 0.05)
            : alpha(theme.palette.primary.main, 0.015),
      }}
    >
      {/* Header: which phase, then who and the page actions. */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {onPhaseChange && (
          <PhaseSwitch phase={phase} onChange={onPhaseChange} counts={phaseCounts} />
        )}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexShrink: 0,
            ml: "auto",
          }}
        >
          <PmFilter
            options={pms}
            selected={value.pms}
            onChange={set("pms")}
            me={me}
          />
          {actions}
        </Box>
      </Box>

      <Divider flexItem sx={{ borderStyle: "dashed" }} />

      <ChipRow
        label="Type"
        options={types}
        selected={value.types}
        onChange={set("types")}
        total={totals.types}
      />

      <Divider flexItem sx={{ borderStyle: "dashed" }} />

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ChipRow
            label="Status"
            options={statuses}
            selected={value.statuses}
            onChange={set("statuses")}
            total={totals.statuses}
          />
        </Box>
        {activeCount > 0 && (
          <Button
            size="small"
            onClick={() => onChange({ types: [], statuses: [], pms: [] })}
            startIcon={<FilterAltOffOutlinedIcon sx={{ fontSize: 18 }} />}
            sx={{
              flexShrink: 0,
              height: 28,
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            }}
          >
            Clear filters ({activeCount})
          </Button>
        )}
      </Box>
    </Paper>
  );
}
