import axios from "axios";
import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { useClients } from "../../*/hooks/useClients";
import { useTrades } from "../../*/hooks/useTrades";
import { workOrderTypes } from "../../*/constants/workorderTypes";

import { priorityConfig } from "../../*/constants/priorityConfig";
// you'll fetch softwares + work-order internal roles + employees

const priorities = Object.keys(priorityConfig); // ["Low", "Normal", "High"]

// Blank line item
const emptyService = () => ({
  key: crypto.randomUUID(),
  service_id: "",
  client_price: "",
  vendor_price: "",
});

const entity_type_id = 4;

function CreateWorkorderForm({ onSubmit, onClose, submitting = false }) {
  const { data: clients = [] } = useClients();
  const { data: trades = [] } = useTrades();

  const [form, setForm] = useState({
    client_id: "",
    site_id: "",
    type: "",
    start_date: "",
    due_date: "",
    external_id: "",
    software_id: "",
    priority: "Normal",
  });
  const [services, setServices] = useState([emptyService()]);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [softwares, setSoftwares] = useState([]);
  const [roles, setRoles] = useState([]); // internal roles applicable to work orders
  const [employees, setEmployees] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState({}); // { [role_id]: [employee_id, ...] }

  useEffect(() => {
    Promise.all([
      axios.get("/api/softwares"),
      axios.get(`/api/roleEntityTypes/${entity_type_id}`), // roles for work orders
      axios.get("/api/employees"),
    ])
      .then(([sw, r, emp]) => {
        setSoftwares(sw.data);
        setRoles(r.data);
        setEmployees(emp.data.filter((e) => !e.terminated)); // active only for assignment
      })
      .catch((e) => console.error("Error loading form refs:", e));
  }, []);

  // Fetch sites for the selected client only (not all sites).
  useEffect(() => {
    if (!form.client_id) {
      setSites([]);
      return;
    }
    let active = true;
    setSitesLoading(true);
    axios
      .get(`/api/clients/${form.client_id}/sites`)
      .then((res) => {
        if (active) setSites(res.data);
      })
      .catch((e) => console.error("Error fetching sites:", e))
      .finally(() => {
        if (active) setSitesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.client_id]);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // When client changes, clear the selected site (it belonged to the old client)
  const onClientChange = (e) => {
    setForm((prev) => ({ ...prev, client_id: e.target.value, site_id: "" }));
  };

  const updateService = (key, field, value) =>
    setServices((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    );

  const addService = () => setServices((prev) => [...prev, emptyService()]);
  const removeService = (key) =>
    setServices((prev) =>
      prev.length > 1 ? prev.filter((s) => s.key !== key) : prev,
    );

  // Valid when the required top-level fields and at least one service are set.
  const canSubmit = useMemo(() => {
    if (!form.site_id || !form.type) return false;
    if (!services.some((s) => s.service_id)) return false;
    return true;
  }, [form, services]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    await onSubmit(form, services, roleAssignments);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 0.5 }}>
      {/* Client → Site cascade */}
      <TextField
        select
        label="Client"
        size="small"
        value={form.client_id}
        onChange={onClientChange}
        fullWidth
      >
        {clients.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.client}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Site"
        size="small"
        value={form.site_id}
        onChange={setField("site_id")}
        fullWidth
        disabled={!form.client_id || sitesLoading}
        helperText={
          !form.client_id
            ? "Select a client first"
            : sitesLoading
              ? "Loading sites…"
              : sites.length === 0
                ? "This client has no sites"
                : " "
        }
      >
        {sites.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.store || `Site ${s.id}`}
            {s.mailing_city ? ` — ${s.mailing_city.trim()}` : ""}
          </MenuItem>
        ))}
      </TextField>

      {/* Type */}
      <TextField
        select
        label="Type"
        size="small"
        value={form.type}
        onChange={setField("type")}
        fullWidth
      >
        {workOrderTypes.map((t) => (
          <MenuItem key={t.name} value={t.name}>
            {t.name}
          </MenuItem>
        ))}
      </TextField>

      {/* External ID */}
      <TextField
        label="External ID"
        size="small"
        value={form.external_id}
        onChange={setField("external_id")}
        fullWidth
      />

      {/* Software */}
      <TextField
        select
        label="Software"
        size="small"
        value={form.software_id}
        onChange={setField("software_id")}
        fullWidth
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {softwares.map((sw) => (
          <MenuItem key={sw.id} value={sw.id}>
            {sw.name}
          </MenuItem>
        ))}
      </TextField>

      {/* Priority */}
      <TextField
        select
        label="Priority"
        size="small"
        value={form.priority}
        onChange={setField("priority")}
        fullWidth
      >
        {priorities.map((p) => (
          <MenuItem key={p} value={p}>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: priorityConfig[p].color,
                mr: 1,
              }}
            />
            {priorityConfig[p].label}
          </MenuItem>
        ))}
      </TextField>

      {/* Dates */}
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={form.start_date}
          onChange={setField("start_date")}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="Due Date"
          type="date"
          size="small"
          value={form.due_date}
          onChange={setField("due_date")}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      <Divider />

      {/* Services (line items) */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Services
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={addService}
          >
            Add service
          </Button>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {services.map((s) => (
            <Box
              key={s.key}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
              }}
            >
              <TextField
                select
                label="Service"
                size="small"
                value={s.service_id}
                onChange={(e) =>
                  updateService(s.key, "service_id", e.target.value)
                }
                sx={{ flex: 1.4 }}
              >
                {trades.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Client $"
                type="number"
                size="small"
                value={s.client_price}
                onChange={(e) =>
                  updateService(s.key, "client_price", e.target.value)
                }
                sx={{ flex: 1 }}
              />

              <IconButton
                size="small"
                onClick={() => removeService(s.key)}
                disabled={services.length === 1}
                sx={{
                  mt: 0.5,
                  color: "text.disabled",
                  "&:hover": { color: "error.main" },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 1 }}>
          Prices are optional and can be added later.
        </Typography>
      </Box>

      <Divider />
      <Box>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "text.secondary",
            mb: 1,
          }}
        >
          Role Assignments
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {roles.map((role) => (
            <TextField
              key={role.id}
              select
              SelectProps={{ multiple: true }}
              label={role.InternalRole?.name ?? role.name}
              size="small"
              value={roleAssignments[role.internal_role_id ?? role.id] ?? []}
              onChange={(e) =>
                setRoleAssignments((prev) => ({
                  ...prev,
                  [role.internal_role_id ?? role.id]: e.target.value,
                }))
              }
              fullWidth
            >
              {employees.map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  {emp.name}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Box>
      </Box>

      {error && (
        <Typography sx={{ fontSize: "0.8rem", color: "error.main" }}>
          {error}
        </Typography>
      )}

      <Divider />

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          startIcon={
            submitting ? <CircularProgress size={14} color="inherit" /> : null
          }
        >
          {submitting ? "Creating…" : "Create Work Order"}
        </Button>
      </Box>
    </Box>
  );
}

export default CreateWorkorderForm;
