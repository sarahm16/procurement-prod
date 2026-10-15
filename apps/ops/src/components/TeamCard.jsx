// components/TeamCard.jsx
//
// Who's on this record, one row per role. Replaces RoleAssignment and sits
// at the top of the side column on every Details tab.
//
// Every role available for the entity type gets a row, even when nobody
// holds it, so an empty "Account Manager" stands out instead of hiding.
// Add someone with the + on the row; remove with the × beside their name.
//
// API (unchanged from RoleAssignment):
//   GET    /api/roleEntityTypes/:entity_type_id            → [{ id, InternalRole: { id, name } }]
//   GET    /api/roleAssignments/:entity_type_id/:entity_id → [{ id, internal_role_id, Role, Employee }]
//   POST   /api/roleAssignments  { user_id, entity_type_id, entity_id, internal_role_id, employee_id }
//   DELETE /api/roleAssignments/:id  { user_id }
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Popover,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";

import SectionCard from "./SectionCard";
import { useEmployees } from "../*/hooks/useEmployees";
import useAuthenticatedUser from "../*/hooks/useAuthenticatedUser";

const initials = (name) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// Same person, same colour, on every page.
const AVATAR_COLORS = [
  "#1E3A5F",
  "#0E7490",
  "#6D28D9",
  "#C2410C",
  "#15803D",
  "#B45309",
  "#BE185D",
  "#4338CA",
];
const colorFor = (key) => {
  const s = String(key ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const roleIdOf = (a) =>
  a.internal_role_id ?? a.Role?.id ?? a.InternalRole?.id ?? null;
const roleNameOf = (a) => a.Role?.name ?? a.InternalRole?.name ?? "Other";

const labelSx = {
  fontFamily: '"Barlow", sans-serif',
  fontWeight: 600,
  fontSize: "0.68rem",
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "text.disabled",
  lineHeight: 1.3,
};

function Person({ assignment, removing, onRemove }) {
  const name = assignment.Employee?.name ?? "Unknown";
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        minHeight: 28,
        "& .remove": { opacity: 0 },
        "&:hover .remove, & .remove:focus-visible": { opacity: 1 },
        "@media (hover: none)": { "& .remove": { opacity: 1 } },
      }}
    >
      <Avatar
        sx={{
          width: 24,
          height: 24,
          fontSize: "0.62rem",
          fontWeight: 700,
          bgcolor: colorFor(
            assignment.employee_id ?? assignment.Employee?.id ?? name,
          ),
        }}
      >
        {initials(name)}
      </Avatar>
      <Typography
        sx={{
          fontSize: "0.85rem",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </Typography>
      <Tooltip title={`Remove ${name}`}>
        <span>
          <IconButton
            className="remove"
            size="small"
            disabled={removing}
            onClick={() => onRemove(assignment)}
            sx={{
              p: 0.25,
              color: "text.disabled",
              transition: "opacity 0.1s",
              "&:hover": { color: "error.main" },
              ...(removing && { opacity: "1 !important" }),
            }}
          >
            {removing ? (
              <CircularProgress size={12} />
            ) : (
              <CloseIcon sx={{ fontSize: 15 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

export default function TeamCard({
  entity_type_id,
  entity_id,
  title = "Team",
}) {
  const theme = useTheme();
  const { user } = useAuthenticatedUser();
  const { data: employees = [] } = useEmployees();

  const [roles, setRoles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [picker, setPicker] = useState(null); // { anchor, roleId, roleName }
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    if (!entity_type_id || !entity_id) return;
    let active = true;
    setLoading(true);
    Promise.all([
      axios.get(`/api/roleEntityTypes/${entity_type_id}`),
      axios.get(`/api/roleAssignments/${entity_type_id}/${entity_id}`),
    ])
      .then(([r, a]) => {
        if (!active) return;
        setRoles(Array.isArray(r.data) ? r.data : []);
        setAssignments(Array.isArray(a.data) ? a.data : []);
      })
      .catch((e) => {
        console.error("Error loading the team:", e);
        if (active) setError("Couldn't load the team.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [entity_type_id, entity_id]);

  // One row per available role, then any role someone holds that's no
  // longer offered for this entity type (so nobody silently disappears).
  const rows = useMemo(() => {
    const list = roles
      .filter((r) => r.InternalRole)
      .map((r) => ({
        roleId: r.InternalRole.id,
        name: r.InternalRole.name,
        people: [],
      }));
    const byId = new Map(list.map((row) => [row.roleId, row]));
    for (const a of assignments) {
      const id = roleIdOf(a);
      let row = byId.get(id);
      if (!row) {
        row = { roleId: id, name: roleNameOf(a), people: [], legacy: true };
        byId.set(id, row);
        list.push(row);
      }
      row.people.push(a);
    }
    return list;
  }, [roles, assignments]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => !e.terminated),
    [employees],
  );

  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    const taken = new Set(
      rows
        .find((r) => r.roleId === picker.roleId)
        ?.people.map((a) => a.employee_id ?? a.Employee?.id),
    );
    return activeEmployees.filter((e) => !taken.has(e.id));
  }, [picker, rows, activeEmployees]);

  const add = async (employee) => {
    if (!employee || !picker) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await axios.post(`/api/roleAssignments`, {
        user_id: user?.id,
        entity_type_id,
        entity_id,
        internal_role_id: picker.roleId,
        employee_id: employee.id,
      });
      // Fill in what the row needs to render if the POST didn't include it.
      setAssignments((prev) => [
        ...prev,
        {
          internal_role_id: picker.roleId,
          employee_id: employee.id,
          ...data,
          Role: data?.Role ?? { id: picker.roleId, name: picker.roleName },
          Employee: data?.Employee ?? { id: employee.id, name: employee.name },
        },
      ]);
      setPicker(null);
    } catch (e) {
      console.error("Error adding to the team:", e);
      setError(e?.response?.data?.error ?? "Couldn't add them. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    setRemovingId(a.id);
    setError(null);
    try {
      await axios.delete(`/api/roleAssignments/${a.id}`, {
        data: { user_id: user?.id },
      });
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      console.error("Error removing from the team:", e);
      setError(e?.response?.data?.error ?? "Couldn't remove them. Try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const openPicker = (e, row) =>
    setPicker({
      anchor: e.currentTarget,
      roleId: row.roleId,
      roleName: row.name,
    });

  return (
    <SectionCard
      title={title}
      icon={<GroupsOutlinedIcon />}
      count={assignments.length}
      disablePadding
    >
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ borderRadius: 0, py: 0 }}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ px: 2, py: 1 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={34} />
          ))}
        </Box>
      ) : rows.length === 0 ? (
        <Typography
          sx={{ px: 2, py: 1.5, fontSize: "0.82rem", color: "text.disabled" }}
        >
          No roles are set up for this kind of record.
        </Typography>
      ) : (
        <Box sx={{ px: 2, containerType: "inline-size" }}>
          {rows.map((row) => (
            <Box
              key={row.roleId ?? row.name}
              sx={{
                display: "grid",
                // Narrow card: role on its own line, people under it.
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gridTemplateAreas: '"label add" "people people"',
                columnGap: 1,
                alignItems: "start",
                py: 0.75,
                "@container (min-width: 320px)": {
                  gridTemplateColumns:
                    "minmax(120px, min(42%, 200px)) minmax(0, 1fr) auto",
                  gridTemplateAreas: '"label people add"',
                },
                borderBottom: `1px solid ${theme.palette.divider}`,
                "&:last-of-type": { borderBottom: "none" },
              }}
            >
              <Typography sx={{ ...labelSx, pt: "7px", gridArea: "label" }}>
                {row.name}
              </Typography>

              <Box sx={{ minWidth: 0, gridArea: "people" }}>
                {row.people.length === 0 ? (
                  <Button
                    size="small"
                    onClick={(e) => openPicker(e, row)}
                    disabled={row.legacy}
                    sx={{
                      px: 0.75,
                      ml: -0.75,
                      minWidth: 0,
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      textTransform: "none",
                      color: "text.disabled",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    Unassigned
                  </Button>
                ) : (
                  row.people.map((a) => (
                    <Person
                      key={a.id}
                      assignment={a}
                      removing={removingId === a.id}
                      onRemove={remove}
                    />
                  ))
                )}
              </Box>

              {!row.legacy && (
                <Tooltip title={`Add ${row.name}`}>
                  <IconButton
                    size="small"
                    onClick={(e) => openPicker(e, row)}
                    sx={{
                      gridArea: "add",
                      mt: "2px",
                      p: 0.25,
                      color: "text.disabled",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Popover
        open={Boolean(picker)}
        anchorEl={picker?.anchor}
        onClose={() => !saving && setPicker(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 1.5, width: 280 } } }}
      >
        <Typography sx={{ ...labelSx, mb: 1 }}>
          Add {picker?.roleName}
        </Typography>
        <Autocomplete
          size="small"
          openOnFocus
          autoHighlight
          options={pickerOptions}
          getOptionLabel={(o) => o.name ?? ""}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          disabled={saving}
          onChange={(_, v) => add(v)}
          noOptionsText="Everyone's already on it"
          renderOption={(props, o) => {
            const { key, ...rest } = props;
            return (
              <Box component="li" key={key} {...rest} sx={{ gap: 1 }}>
                <Avatar
                  sx={{
                    width: 22,
                    height: 22,
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    bgcolor: colorFor(o.id),
                  }}
                >
                  {initials(o.name)}
                </Avatar>
                <Typography sx={{ fontSize: "0.85rem" }}>{o.name}</Typography>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              placeholder="Search people"
              InputProps={{
                ...params.InputProps,
                endAdornment: saving ? (
                  <CircularProgress size={14} />
                ) : (
                  params.InputProps.endAdornment
                ),
              }}
            />
          )}
        />
      </Popover>
    </SectionCard>
  );
}
