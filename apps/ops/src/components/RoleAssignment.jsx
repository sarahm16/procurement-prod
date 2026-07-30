import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Select,
  MenuItem,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// Hooks
import { useEmployees } from "../*/hooks/useEmployees";

function RoleAssignment({ entity_type_id, entity_id }) {
  const theme = useTheme();

  const [availableRoles, setAvailableRoles] = useState([]); // global (cache later)
  const [roleAssignments, setRoleAssignments] = useState([]); // per-record
  const [loading, setLoading] = useState(true);

  const { data: employees = [] } = useEmployees();
  const activeEmployees = employees.filter((e) => !e.terminated);

  // the "add assignment" draft
  const [adding, setAdding] = useState(false);
  const [draftRole, setDraftRole] = useState("");
  const [draftEmployee, setDraftEmployee] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      // available roles for THIS entity type (global config → cache later)
      axios.get(`/api/roleEntityTypes/${entity_type_id}`),
      // assignments for THIS specific record (per-record → always fresh)
      axios.get(`/api/roleAssignments/${entity_type_id}/${entity_id}`),
    ])
      .then(([rolesRes, assignRes]) => {
        if (!active) return;
        console.log("available roles", rolesRes.data);
        setAvailableRoles(rolesRes.data);
        setRoleAssignments(assignRes.data);
      })
      .catch((e) => console.error("Error loading role assignments:", e))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [entity_type_id, entity_id]);

  const startAdd = () => {
    setDraftRole("");
    setDraftEmployee("");
    setAdding(true);
  };

  const cancelAdd = () => {
    setAdding(false);
    setDraftRole("");
    setDraftEmployee("");
  };

  const handleAdd = async () => {
    if (!draftRole || !draftEmployee) return;
    setSaving(true);
    try {
      const { data } = await axios.post(`/api/roleAssignments`, {
        entity_type_id,
        entity_id,
        internal_role_id: draftRole,
        employee_id: draftEmployee,
      });
      // POST should return the new row WITH InternalRole + Employee included,
      // so it renders immediately without a refetch.
      setRoleAssignments((prev) => [...prev, data]);
      cancelAdd();
    } catch (e) {
      console.error("Error adding assignment:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignment) => {
    setRemovingId(assignment.id);
    try {
      await axios.delete(`/api/roleAssignments/${assignment.id}`);
      setRoleAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    } catch (e) {
      console.error("Error removing assignment:", e);
    } finally {
      setRemovingId(null);
    }
  };

  // Group existing assignments by role so the display reads
  // "Account Manager: Jane, Bob" rather than a flat list.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const a of roleAssignments) {
      const roleName = a.Role?.name ?? "Unknown role";
      if (!map.has(roleName)) map.set(roleName, []);
      map.get(roleName).push(a);
    }
    return [...map.entries()]; // [ [roleName, [assignments...]], ... ]
  }, [roleAssignments]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Barlow", sans-serif',
            fontWeight: 600,
            fontSize: "0.78rem",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Role Assignments
        </Typography>
        <Tooltip title="Add assignment">
          <span>
            <IconButton
              size="small"
              onClick={startAdd}
              disabled={adding}
              sx={{
                color: "text.disabled",
                "&:hover": { color: "primary.main" },
              }}
            >
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box sx={{ px: 2, py: 1.5 }}>
        {/* existing assignments, grouped by role */}
        {grouped.length === 0 && !adding && (
          <Typography
            sx={{ color: "text.disabled", fontSize: "0.85rem", py: 1 }}
          >
            No one assigned yet.
          </Typography>
        )}

        {grouped.map(([roleName, assignments]) => (
          <Box key={roleName} sx={{ mb: 1.5 }}>
            <Typography
              sx={{
                fontSize: "0.62rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.disabled",
                mb: 0.5,
              }}
            >
              {roleName}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {assignments.map((a) => (
                <Chip
                  key={a.id}
                  label={a.Employee?.name ?? "Unknown"}
                  size="small"
                  onDelete={() => handleRemove(a)}
                  deleteIcon={
                    removingId === a.id ? (
                      <CircularProgress size={14} />
                    ) : (
                      <DeleteOutlineIcon />
                    )
                  }
                  sx={{ height: 26 }}
                />
              ))}
            </Box>
          </Box>
        ))}

        {/* add-assignment row */}
        {adding && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              mt: 1.5,
              pt: 1.5,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Select
              size="small"
              displayEmpty
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              sx={{ minWidth: 160, fontSize: "0.85rem" }}
            >
              <MenuItem value="" disabled>
                <em>Select role</em>
              </MenuItem>
              {availableRoles.map((r) => (
                <MenuItem key={r.id} value={r.InternalRole?.id}>
                  {r.InternalRole?.name}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              displayEmpty
              value={draftEmployee}
              onChange={(e) => setDraftEmployee(e.target.value)}
              sx={{ minWidth: 180, fontSize: "0.85rem" }}
            >
              <MenuItem value="" disabled>
                <em>Select employee</em>
              </MenuItem>
              {activeEmployees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MenuItem>
              ))}
            </Select>

            <Button
              size="small"
              variant="contained"
              onClick={handleAdd}
              disabled={!draftRole || !draftEmployee || saving}
            >
              {saving ? "Adding…" : "Add"}
            </Button>
            <Button
              size="small"
              onClick={cancelAdd}
              disabled={saving}
              sx={{ color: "text.secondary" }}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default RoleAssignment;
