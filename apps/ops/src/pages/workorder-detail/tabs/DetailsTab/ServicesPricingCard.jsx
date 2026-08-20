// workorder-details/tabs/DetailsTab/ServicesPricingCard.jsx
import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmDialog from "../../../../components/ConfirmDialog";

const money = (n) =>
  n == null || n === ""
    ? "—"
    : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ServicesPricingCard({
  services = [],
  scopeOfWork,
  onAddService,
  onUpdateService,
  onDeleteService,
  onSaveScope,
}) {
  const theme = useTheme();
  const [allServices, setAllServices] = useState([]);

  // scope edit state
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState(scopeOfWork ?? "");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // per-row price edit state
  const [editingRow, setEditingRow] = useState(null); // service id being edited
  const [rowDraft, setRowDraft] = useState({
    client_price: "",
    vendor_price: "",
  });

  // add-row state
  const [adding, setAdding] = useState(false);
  const [newService, setNewService] = useState({
    service_id: "",
    client_price: "",
    vendor_price: "",
  });

  useEffect(() => {
    axios
      .get("/api/trades")
      .then((res) => setAllServices(res.data))
      .catch((e) => console.error("Error fetching services:", e));
  }, []);

  useEffect(() => setScopeDraft(scopeOfWork ?? ""), [scopeOfWork]);

  const serviceName = (id) =>
    allServices.find((s) => s.id === id)?.name ?? "Unknown service";

  const totals = useMemo(() => {
    let client = 0;
    let vendor = 0;
    for (const s of services) {
      client += Number(s.client_price) || 0;
      vendor += Number(s.vendor_price) || 0;
    }
    return { client, vendor, margin: client - vendor };
  }, [services]);

  const startEditRow = (s) => {
    setEditingRow(s.id);
    setRowDraft({
      client_price: s.client_price ?? "",
      vendor_price: s.vendor_price ?? "",
    });
  };

  const saveRow = async (s) => {
    await onUpdateService?.(s.id, {
      client_price:
        rowDraft.client_price === "" ? null : Number(rowDraft.client_price),
      vendor_price:
        rowDraft.vendor_price === "" ? null : Number(rowDraft.vendor_price),
    });
    setEditingRow(null);
  };

  const submitNewService = async () => {
    console.log("new service to add", newService);
    if (!newService.service_id) return;
    await onAddService?.({
      service_id: Number(newService.service_id),
      client_price:
        newService.client_price === "" ? null : Number(newService.client_price),
      vendor_price:
        newService.vendor_price === "" ? null : Number(newService.vendor_price),
    });
    setNewService({ service_id: "", client_price: "", vendor_price: "" });
    setAdding(false);
  };

  const handleConfirmDelete = async () => {
    if (confirmDelete) await onDeleteService?.(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <>
      {" "}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: "background.paper",
          overflow: "hidden",
          gridColumn: "1 / -1", // full width in the InfoGrid
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
            Scope & Pricing
          </Typography>
        </Box>

        {/* Scope of work */}
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "text.disabled",
              }}
            >
              Scope of Work
            </Typography>
            {!editingScope ? (
              <IconButton size="small" onClick={() => setEditingScope(true)}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <Box>
                <IconButton
                  size="small"
                  onClick={async () => {
                    console.log("scopeDraft", scopeDraft);
                    await onSaveScope?.({ scope_of_work: scopeDraft });
                    setEditingScope(false);
                  }}
                  sx={{ color: "success.main" }}
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setScopeDraft(scopeOfWork ?? "");
                    setEditingScope(false);
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            )}
          </Box>
          {editingScope ? (
            <TextField
              multiline
              minRows={3}
              fullWidth
              size="small"
              value={scopeDraft}
              onChange={(e) => setScopeDraft(e.target.value)}
              placeholder="Describe the work to be performed…"
            />
          ) : (
            <Typography
              sx={{
                fontSize: "0.85rem",
                whiteSpace: "pre-wrap",
                color: scopeOfWork ? "text.primary" : "text.disabled",
              }}
            >
              {scopeOfWork || "No scope of work entered."}
            </Typography>
          )}
        </Box>

        {/* Line items */}
        <Box sx={{ px: 2, py: 1.5 }}>
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
                fontSize: "0.68rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "text.disabled",
              }}
            >
              Services
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setAdding(true)}
            >
              Add
            </Button>
          </Box>

          {/* Column headers */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1fr 40px",
              gap: 1,
              px: 1,
              pb: 0.5,
            }}
          >
            {["Service", "Client Price", "Vendor Price", ""].map((h, i) => (
              <Typography
                key={i}
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "text.disabled",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          {services.length === 0 && !adding && (
            <Typography
              sx={{ fontSize: "0.82rem", color: "text.disabled", py: 1, px: 1 }}
            >
              No services added yet.
            </Typography>
          )}

          {services.map((s) => {
            const isEditing = editingRow === s.id;
            return (
              <Box
                key={s.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 40px",
                  gap: 1,
                  alignItems: "center",
                  px: 1,
                  py: 0.75,
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography sx={{ fontSize: "0.85rem" }}>{s?.name}</Typography>

                {isEditing ? (
                  <>
                    <TextField
                      size="small"
                      type="number"
                      value={rowDraft.client_price}
                      onChange={(e) =>
                        setRowDraft((p) => ({
                          ...p,
                          client_price: e.target.value,
                        }))
                      }
                    />
                    <TextField
                      size="small"
                      type="number"
                      value={rowDraft.vendor_price}
                      onChange={(e) =>
                        setRowDraft((p) => ({
                          ...p,
                          vendor_price: e.target.value,
                        }))
                      }
                    />
                    <Box sx={{ display: "flex" }}>
                      <IconButton
                        size="small"
                        onClick={() => saveRow(s)}
                        sx={{ color: "success.main" }}
                      >
                        <CheckIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setEditingRow(null)}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: "0.85rem" }}>
                      {money(s.client_price)}
                    </Typography>
                    <Typography sx={{ fontSize: "0.85rem" }}>
                      {money(s.vendor_price)}
                    </Typography>
                    <Box sx={{ display: "flex" }}>
                      <IconButton size="small" onClick={() => startEditRow(s)}>
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDelete(s)} // was onDeleteService?.(s.id)
                        sx={{
                          color: "text.disabled",
                          "&:hover": { color: "error.main" },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </>
                )}
              </Box>
            );
          })}

          {/* Add row */}
          {adding && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr 1fr 40px",
                gap: 1,
                alignItems: "center",
                px: 1,
                py: 0.75,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <TextField
                select
                size="small"
                value={newService.service_id}
                onChange={(e) =>
                  setNewService((p) => ({ ...p, service_id: e.target.value }))
                }
                displayEmpty
              >
                <MenuItem value="" disabled>
                  <em>Service</em>
                </MenuItem>
                {allServices.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                type="number"
                placeholder="Client $"
                value={newService.client_price}
                onChange={(e) =>
                  setNewService((p) => ({ ...p, client_price: e.target.value }))
                }
              />
              <TextField
                size="small"
                type="number"
                placeholder="Vendor $"
                value={newService.vendor_price}
                onChange={(e) =>
                  setNewService((p) => ({ ...p, vendor_price: e.target.value }))
                }
              />
              <Box sx={{ display: "flex" }}>
                <IconButton
                  size="small"
                  onClick={submitNewService}
                  disabled={!newService.service_id}
                  sx={{ color: "success.main" }}
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => setAdding(false)}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Totals */}
          {services.length > 0 && (
            <>
              <Divider sx={{ mt: 1 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 40px",
                  gap: 1,
                  px: 1,
                  pt: 1,
                }}
              >
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  Total
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  {money(totals.client)}
                </Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>
                  {money(totals.vendor)}
                </Typography>
                <Box />
              </Box>
              <Box sx={{ px: 1, pt: 0.25 }}>
                <Typography
                  sx={{ fontSize: "0.72rem", color: "text.secondary" }}
                >
                  Margin: {money(totals.margin)}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete service?"
        message={
          confirmDelete
            ? `Remove "${confirmDelete.name}" from this work order? This will also remove its pricing.`
            : ""
        }
        confirmLabel="Delete"
      />
    </>
  );
}
