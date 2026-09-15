import axios from "axios";
import { useState, useMemo, useEffect } from "react";
import {
  Alert,
  Autocomplete,
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
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";

import { useClients } from "../../*/hooks/useClients";
import { useTrades } from "../../*/hooks/useTrades";
import { workOrderPriorityConfig } from "../../*/constants/workOrderPriorityConfig";
import { workOrderTypes } from "../../*/constants/workorderTypes";

const priorities = Object.keys(workOrderPriorityConfig);

const emptyService = () => ({
  key: crypto.randomUUID(),
  service_id: "",
  client_price: "",
  vendor_price: "",
});

const entity_type_id = 4;

/* Field readers — adjust to whatever your work order list endpoint returns. */
const woLabel = (w) => {
  if (!w) return "";
  const num =
    w.work_order_number ?? (w.external_id ? `#${w.external_id}` : `WO-${w.id}`);
  const site = w.site ?? w.Site?.store ?? w.store;
  const type = w.type ?? w.Type?.name;
  return [num, site, type].filter(Boolean).join(" · ");
};
const woClientId = (w) =>
  w?.client_id ?? w?.Client?.id ?? w?.Site?.client_id ?? null;
const woClientName = (w) => w?.client ?? w?.Client?.client ?? null;
const woSiteId = (w) => w?.site_id ?? w?.Site?.id ?? null;
const woSiteName = (w) => w?.site ?? w?.Site?.store ?? w?.store ?? null;
const woVendorId = (w) => w?.vendor_id ?? w?.Vendor?.id ?? null;
const woVendorName = (w) => w?.vendor ?? w?.Vendor?.company ?? null;

const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

function CreateWorkorderForm({
  onSubmit,
  onClose,
  submitting = false,
  workOrders = [],
}) {
  const { data: clients = [] } = useClients();
  const { data: trades = [] } = useTrades();

  const [form, setForm] = useState({
    parent_work_order_id: null,
    client_id: "",
    site_id: "",
    type: "",
    start_date: "",
    due_date: "",
    external_id: "",
    software_id: "",
    priority: "Normal",
    scope_of_work: "",
  });
  const [parent, setParent] = useState(null);
  const [services, setServices] = useState([emptyService()]);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [softwares, setSoftwares] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState({});

  const isChild = Boolean(parent);

  useEffect(() => {
    Promise.all([
      axios.get("/api/softwares"),
      axios.get(`/api/roleEntityTypes/${entity_type_id}`),
      axios.get("/api/employees"),
    ])
      .then(([sw, r, emp]) => {
        setSoftwares(sw.data);
        setRoles(r.data);
        setEmployees(emp.data.filter((e) => !e.terminated));
      })
      .catch((e) => console.error("Error loading form refs:", e));
  }, []);

  // Only needed for the standalone cascade — a child's site comes from the parent.
  useEffect(() => {
    if (!form.client_id || isChild) {
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
  }, [form.client_id, isChild]);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onClientChange = (e) =>
    setForm((prev) => ({ ...prev, client_id: e.target.value, site_id: "" }));

  /**
   * A child is the same job at the same site as its parent — that's the whole
   * point of the relationship — so the site is taken from the parent and
   * locked. Type, priority and dates are copied as starting points and stay
   * editable, since each child covers a different scope.
   */
  const onParentChange = (_, w) => {
    setParent(w);
    if (!w) {
      setForm((prev) => ({ ...prev, parent_work_order_id: null }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      parent_work_order_id: w.id,
      client_id: woClientId(w) ?? prev.client_id,
      site_id: woSiteId(w) ?? "",
      type: prev.type || w.type || "",
      priority: w.priority || prev.priority,
      start_date: prev.start_date || toDateInput(w.start_date),
      due_date: prev.due_date || toDateInput(w.due_date),
      software_id: prev.software_id || w.software_id || "",
    }));
  };

  // Only top-level work orders can be parents — the model is one level deep.
  const parentOptions = useMemo(() => {
    const list = workOrders.filter((w) => !w.parent_work_order_id);
    if (!form.client_id || isChild) return list;
    return [...list].sort((a, b) => {
      const aMine = woClientId(a) === Number(form.client_id) ? 0 : 1;
      const bMine = woClientId(b) === Number(form.client_id) ? 0 : 1;
      return aMine - bMine || (b.id ?? 0) - (a.id ?? 0);
    });
  }, [workOrders, form.client_id, isChild]);

  const parentHasVendor = isChild && Boolean(woVendorId(parent));

  const updateService = (key, field, value) =>
    setServices((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    );

  const addService = () => setServices((prev) => [...prev, emptyService()]);
  const removeService = (key) =>
    setServices((prev) =>
      prev.length > 1 ? prev.filter((s) => s.key !== key) : prev,
    );

  const canSubmit = useMemo(() => {
    if (!form.site_id || !form.type) return false;
    if (!isChild && !form.client_id) return false;
    if (!services.some((s) => s.service_id)) return false;
    return true;
  }, [form, services, isChild]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError(null);
    try {
      await onSubmit(form, services, roleAssignments);
    } catch (e) {
      console.error("Error creating work order:", e);
      setError(e.response?.data?.error ?? "Couldn't create the work order.");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 0.5 }}>
      {/* Parent first — it decides the site and flips which price matters */}
      <Autocomplete
        size="small"
        options={parentOptions}
        value={parent}
        onChange={onParentChange}
        getOptionLabel={woLabel}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(opts, state) => {
          const t = state.inputValue.trim().toLowerCase();
          const f = t
            ? opts.filter((o) =>
                `${woLabel(o)} ${woClientName(o) ?? ""}`
                  .toLowerCase()
                  .includes(t),
              )
            : opts;
          return f.slice(0, 50);
        }}
        renderOption={(props, o) => {
          const { key, ...rest } = props;
          return (
            <li key={o.id} {...rest}>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 500 }}>
                  {woLabel(o)}
                </Typography>
                {woClientName(o) && (
                  <Typography
                    sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                  >
                    {woClientName(o)}
                  </Typography>
                )}
              </Box>
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Parent work order"
            placeholder="Leave empty for a standalone work order"
            helperText={
              isChild
                ? "One vendor's share of the parent job."
                : "Optional — pick one when this is a second vendor on a job that already exists"
            }
          />
        )}
      />

      {isChild && (
        <Alert
          severity={parentHasVendor ? "warning" : "info"}
          icon={<AccountTreeOutlinedIcon fontSize="small" />}
          action={
            <Button
              size="small"
              color="inherit"
              onClick={() => onParentChange(null, null)}
            >
              Clear
            </Button>
          }
          sx={{ mt: -1 }}
        >
          {parentHasVendor ? (
            <>
              <strong>{woVendorName(parent) ?? "A vendor"}</strong> is currently
              on {woLabel(parent)}. Creating a child moves the vendor work down
              to the children, so the parent's vendor will be cleared.
            </>
          ) : (
            <>
              Child of {woLabel(parent)} — same site, invoiced together on the
              parent.
            </>
          )}
        </Alert>
      )}

      <Divider />

      {/* Client / site — locked to the parent's when this is a child */}
      {isChild ? (
        <TextField
          label="Site"
          size="small"
          fullWidth
          value={
            [woClientName(parent), woSiteName(parent)]
              .filter(Boolean)
              .join(" — ") || `Site ${form.site_id}`
          }
          InputProps={{ readOnly: true }}
          helperText="Taken from the parent — children are always the same job at the same site"
        />
      ) : (
        <>
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
        </>
      )}

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

      <TextField
        label="External ID"
        size="small"
        value={form.external_id}
        onChange={setField("external_id")}
        fullWidth
      />

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
                backgroundColor: workOrderPriorityConfig[p].color,
                mr: 1,
              }}
            />
            {workOrderPriorityConfig[p].label} -{" "}
            {workOrderPriorityConfig[p].sla}
          </MenuItem>
        ))}
      </TextField>

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

      <TextField
        label={
          isChild
            ? "Scope of Work (this vendor's portion)"
            : "Full Scope of Work"
        }
        value={form.scope_of_work}
        onChange={setField("scope_of_work")}
        fullWidth
        multiline
      />

      {/* Services. Which price leads depends on what's being created: the
          client price lives on the parent, the vendor price on each child. */}
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
          {services.map((s) => {
            const primary = isChild
              ? { field: "vendor_price", label: "Vendor $" }
              : { field: "client_price", label: "Client $" };
            const secondary = isChild
              ? { field: "client_price", label: "Client $" }
              : { field: "vendor_price", label: "Vendor $" };

            return (
              <Box
                key={s.key}
                sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
              >
                <TextField
                  select
                  label="Service"
                  size="small"
                  value={s.service_id}
                  onChange={(e) =>
                    updateService(s.key, "service_id", e.target.value)
                  }
                  sx={{ flex: 1.6 }}
                >
                  {trades.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={primary.label}
                  type="number"
                  size="small"
                  value={s[primary.field]}
                  onChange={(e) =>
                    updateService(s.key, primary.field, e.target.value)
                  }
                  sx={{ flex: 1 }}
                />

                <TextField
                  label={secondary.label}
                  type="number"
                  size="small"
                  value={s[secondary.field]}
                  onChange={(e) =>
                    updateService(s.key, secondary.field, e.target.value)
                  }
                  sx={{
                    flex: 0.85,
                    "& .MuiInputBase-input": { color: "text.secondary" },
                  }}
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
            );
          })}
        </Box>

        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 1 }}>
          {isChild
            ? "Vendor price is what this vendor charges for their portion. The client price usually stays on the parent."
            : "Both are optional and can be added later. If this becomes a parent, the total client price stays here."}
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

      {error && <Alert severity="error">{error}</Alert>}

      <Divider />

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
          {submitting
            ? "Creating…"
            : isChild
              ? "Create Child Work Order"
              : "Create Work Order"}
        </Button>
      </Box>
    </Box>
  );
}

export default CreateWorkorderForm;
