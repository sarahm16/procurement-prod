// components/ListFilters/ListFilters.jsx
//
// Building blocks for the filter bars above list pages, in the same style
// as the work order filters:
//
//   <FilterPanel>            the outlined panel
//   <ChipRow>                a labelled row of toggle chips with counts
//   <PeopleFilter>           avatar button → checklist of people
//   <ClearFiltersButton>     "Clear filters (3)"
//
// and the logic that goes with them:
//
//   useSavedFilters(key, empty)   filters that survive a reload
//   passes(tests, row, skip)      run every filter test but one
//   countBy(rows, keysOf)         chip counts
//
// Nothing picked in a group means "all" for that group. Each chip's count is
// worked out with every OTHER group applied, so it shows what a click will do.
import { useEffect, useState } from "react";
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
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOffOutlinedIcon from "@mui/icons-material/PersonOffOutlined";

export const NOBODY = "__none__";
const FALLBACK = "#6b7280";

/* ── logic ────────────────────────────────────────────────────────────── */

/** Filters kept in localStorage, so the list opens the way you left it. */
export function useSavedFilters(key, empty) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return Object.fromEntries(
        Object.entries(empty).map(([k, v]) => [k, Array.isArray(saved?.[k]) ? saved[k] : v]),
      );
    } catch {
      return empty;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private window etc.: filters just won't be remembered */
    }
  }, [key, value]);
  return [value, setValue];
}

export const passes = (tests, row, skip) => Object.entries(tests).every(([k, t]) => k === skip || t(row));

export const countBy = (rows, keysOf) => {
  const m = new Map();
  for (const r of rows) for (const k of keysOf(r)) if (k != null) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

export const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export const activeFilterCount = (value) => Object.values(value).reduce((n, v) => n + (v?.length ?? 0), 0);

/* ── colours ──────────────────────────────────────────────────────────── */

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

/* ── chips ────────────────────────────────────────────────────────────── */

export function FilterChip({ label, color = FALLBACK, icon: Icon, count, selected, onClick, title }) {
  const theme = useTheme();
  const c = safeColor(color);
  const empty = count === 0 && !selected;
  const fg = selected ? theme.palette.getContrastText(c) : theme.palette.mode === "dark" ? c : theme.palette.text.primary;

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
        "&:hover": { bgcolor: selected ? c : safeAlpha(c, 0.15), borderColor: c },
        "&.Mui-focusVisible": { outline: `2px solid ${safeAlpha(c, 0.6)}`, outlineOffset: 2 },
      }}
    >
      {Icon ? (
        <Icon sx={{ fontSize: 15, color: selected ? "inherit" : c }} />
      ) : (
        !selected && (
          <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: c, flexShrink: 0 }} />
        )
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

const RowLabel = ({ children, width }) => (
  <Typography
    sx={{
      width,
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

/**
 * options: [{ value, label, color, icon?, count, title? }]
 * selected: array of values
 */
export function ChipRow({ label, labelWidth = 60, options, selected, onChange, total }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", minWidth: 0 }}>
      <RowLabel width={labelWidth}>{label}</RowLabel>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, minWidth: 0 }}>
        <FilterChip
          label="All"
          color={theme.palette.primary.main}
          selected={selected.length === 0}
          onClick={() => onChange([])}
          count={total}
        />
        {options.map((o) => (
          <FilterChip
            key={o.value}
            label={o.label}
            color={o.color}
            icon={o.icon}
            count={o.count}
            title={o.title}
            selected={selected.includes(o.value)}
            onClick={() => onChange(toggle(selected, o.value))}
          />
        ))}
      </Box>
    </Box>
  );
}

/* ── people ───────────────────────────────────────────────────────────── */

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

/** A stable colour per person so the same person always looks the same. */
const avatarColor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 45%, 46%)`;
};

export const PersonAvatar = ({ name, size = 24 }) => (
  <Avatar sx={{ width: size, height: size, fontSize: size * 0.42, fontWeight: 700, bgcolor: avatarColor(name) }}>
    {initials(name)}
  </Avatar>
);

/**
 * options: [{ name, count, detail? }]  (name NOBODY = nobody assigned)
 * noun: { one: "account manager", many: "account managers" }
 */
export function PeopleFilter({ options, selected, onChange, me, noun = { one: "person", many: "people" } }) {
  const [anchor, setAnchor] = useState(null);
  const theme = useTheme();
  const active = selected.length > 0;
  const picked = selected.filter((n) => n !== NOBODY);
  const mineOnly = Boolean(me) && selected.length === 1 && selected[0] === me;
  const meListed = Boolean(me) && options.some((o) => o.name === me);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const label = !active
    ? `All ${noun.many}`
    : mineOnly
      ? "Mine"
      : selected.length === 1
        ? selected[0] === NOBODY
          ? `No ${noun.one}`
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
          whiteSpace: "nowrap",
          borderColor: active ? undefined : theme.palette.divider,
          color: active ? undefined : "text.secondary",
          bgcolor: active ? alpha(theme.palette.primary.main, 0.06) : undefined,
          pl: picked.length ? 0.75 : 1.25,
        }}
      >
        {picked.length > 0 && (
          <AvatarGroup
            max={3}
            sx={{ mr: 1, "& .MuiAvatar-root": { width: 22, height: 22, fontSize: 10, borderWidth: 1.5 } }}
          >
            {picked.map((n) => (
              <PersonAvatar key={n} name={n} size={22} />
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
        slotProps={{ paper: { sx: { minWidth: 280, maxHeight: 440 } } }}
        MenuListProps={{ dense: true }}
      >
        <MenuItem onClick={() => onChange([])} selected={!active} sx={{ fontWeight: 600 }}>
          All {noun.many}
        </MenuItem>
        {meListed && (
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
        {options.length === 0 && (
          <MenuItem disabled sx={{ fontSize: "0.8rem" }}>
            Nobody is assigned yet
          </MenuItem>
        )}
        {options.map((o) => (
          <MenuItem key={o.name} onClick={() => onChange(toggle(selected, o.name))}>
            <Checkbox size="small" edge="start" checked={selected.includes(o.name)} sx={{ p: 0.5, mr: 1 }} />
            <ListItemIcon sx={{ minWidth: "32px !important" }}>
              {o.name === NOBODY ? (
                <PersonOffOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
              ) : (
                <PersonAvatar name={o.name} />
              )}
            </ListItemIcon>
            <ListItemText
              primary={o.name === NOBODY ? `No ${noun.one}` : o.name}
              secondary={o.detail}
              primaryTypographyProps={{ fontSize: "0.82rem" }}
              secondaryTypographyProps={{ fontSize: "0.7rem" }}
            />
            <Typography
              sx={{ ml: 2, fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
            >
              {o.count}
            </Typography>
          </MenuItem>
        ))}
        {!meListed && me && options.length > 0 && (
          <Typography sx={{ px: 2, py: 1, fontSize: "0.7rem", color: "text.secondary" }}>
            {cap(noun.many)} are set on each record's team.
          </Typography>
        )}
      </Menu>
    </>
  );
}

/* ── panel + clear ────────────────────────────────────────────────────── */

export function FilterPanel({ children }) {
  const theme = useTheme();
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
          theme.palette.mode === "dark" ? alpha(theme.palette.primary.main, 0.05) : alpha(theme.palette.primary.main, 0.015),
      }}
    >
      {children}
    </Paper>
  );
}

export const FilterDivider = () => <Divider flexItem sx={{ borderStyle: "dashed" }} />;

export function ClearFiltersButton({ count, onClear }) {
  if (!count) return null;
  return (
    <Button
      size="small"
      onClick={onClear}
      startIcon={<FilterAltOffOutlinedIcon sx={{ fontSize: 18 }} />}
      sx={{ flexShrink: 0, height: 28, textTransform: "none", fontWeight: 600, color: "text.secondary" }}
    >
      Clear filters ({count})
    </Button>
  );
}
