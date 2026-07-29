// admin/InternalRolesAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  MenuItem,
  TextField,
  Chip,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  useTheme,
  alpha,
} from "@mui/material";
import { ENTITY_TYPES } from "../../../*/constants/entityTypes";

const entityTypes = Object.keys(ENTITY_TYPES).map((key) => ({
  id: ENTITY_TYPES[key],
  name: key,
}));

console.log(entityTypes);

export default function InternalRolesAdmin() {
  const theme = useTheme();

  const [roles, setRoles] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null); // `${entityTypeId}:${roleId}` being saved
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      axios.get("/api/internalRoles"), // adjust to your route
      axios.get("/api/roleEntityTypes"), // all current mappings
    ])
      .then(([rolesRes, mapRes]) => {
        if (!active) return;
        setRoles(rolesRes.data);
        setMappings(mapRes.data);
      })
      .catch((e) => console.error("Error loading role config:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isApplied = (entityTypeId, roleId) =>
    mappings.some(
      (m) => m.entity_type_id === entityTypeId && m.internal_role_id === roleId,
    );

  const toggleRole = async (entityTypeId, roleId, shouldApply) => {
    const key = `${entityTypeId}:${roleId}`;
    setSavingKey(key);
    try {
      if (shouldApply) {
        await axios.post("/api/roleEntityTypes", {
          internal_role_id: roleId,
          entity_type_id: entityTypeId,
        });
        setMappings((prev) => [
          ...prev,
          { internal_role_id: roleId, entity_type_id: entityTypeId },
        ]);
      } else {
        await axios.delete("/api/roleEntityTypes", {
          data: { internal_role_id: roleId, entity_type_id: entityTypeId },
        });
        setMappings((prev) =>
          prev.filter(
            (m) =>
              !(
                m.internal_role_id === roleId &&
                m.entity_type_id === entityTypeId
              ),
          ),
        );
      }
    } catch (e) {
      console.error("Error updating role mapping:", e);
      // await-first (non-optimistic): state only changed after success above
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: '"Barlow Condensed", sans-serif',
          fontWeight: 700,
          fontSize: "1.4rem",
          mb: 0.5,
        }}
      >
        Role Applicability
      </Typography>
      <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", mb: 3 }}>
        Choose which roles can be assigned to each type of record.
      </Typography>

      {/* One card per entity type — mapped, not hardcoded */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {entityTypes.map((et) => {
          const appliedCount = roles.filter((r) =>
            isApplied(et.id, r.id),
          ).length;
          return (
            <Box
              key={et.id}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 2,
                backgroundColor: "background.paper",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "text.secondary",
                  }}
                >
                  {et.name}
                </Typography>
                <Chip
                  label={appliedCount}
                  size="small"
                  sx={{ height: 18, fontSize: "0.65rem" }}
                />
              </Box>

              {roles.length === 0 ? (
                <Typography
                  sx={{ color: "text.disabled", fontSize: "0.85rem" }}
                >
                  No roles defined yet.
                </Typography>
              ) : (
                <FormGroup>
                  {roles.map((role) => {
                    const key = `${et.id}:${role.id}`;
                    return (
                      <FormControlLabel
                        key={role.id}
                        control={
                          <Checkbox
                            checked={isApplied(et.id, role.id)}
                            disabled={savingKey === key}
                            onChange={(e) =>
                              toggleRole(et.id, role.id, e.target.checked)
                            }
                            size="small"
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: "0.9rem" }}>
                            {role.name}
                          </Typography>
                        }
                      />
                    );
                  })}
                </FormGroup>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
