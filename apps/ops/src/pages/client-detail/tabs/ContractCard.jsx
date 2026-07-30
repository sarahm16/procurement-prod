// tabs/ContractCard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Chip,
  Switch,
  TextField,
  MenuItem,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoGrid, { InfoCard, FieldRow } from "../../../components/InfoGrid";
import RoleAssignment from "../../../components/RoleAssignment";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
const toDateInput = (iso) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "";
const fmtMoney = (v) =>
  v == null
    ? "—"
    : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

export default function ContractCard({ contract, employees = [], onSave }) {
  const theme = useTheme();
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [sites, setSites] = useState(null); // null = not yet fetched
  const [loadingSites, setLoadingSites] = useState(false);

  const [serviceTypes, setServiceTypes] = useState([]);

  const handleExpand = (_, isOpen) => {
    setExpanded(isOpen);
    if (isOpen && sites === null) fetchSites();
  };

  const fetchSites = async () => {
    setLoadingSites(true);
    try {
      // TODO: GET /api/contracts/:id/sites → ContractSites with Site included.
      // Shape is provisional until the ContractSites model settles (Wed meeting).
      const { data } = await axios.get(`/api/contracts/${contract.id}/sites`);
      console.log("Fetched contract sites for contract", contract.id, data);
      setSites(data);
    } catch (e) {
      console.error("Error fetching contract sites:", e);
      // setSites([]);
    } finally {
      setLoadingSites(false);
    }
  };

  const empName = (id) => employees.find((e) => e.id === id)?.name ?? "—";

  const serviceTypeName = (id) =>
    serviceTypes.find((st) => st.id === id)?.name ?? "—";

  // Heuristic "placeholder" flag until you add a real status/is_placeholder column
  const isPlaceholder = contract.value == null || Number(contract.value) === 0;

  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const { data } = await axios.get("/api/service-types");
        console.log("Fetched service types:", data);
        setServiceTypes(data);
      } catch (error) {
        console.error("Error fetching service types:", error);
      }
    };

    fetchServiceTypes();
  }, []);

  return (
    <Accordion
      expanded={expanded}
      onChange={handleExpand}
      disableGutters
      sx={{
        mb: 1.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        "&:before": { display: "none" },
        backgroundColor: "background.paper",
        boxShadow: "none",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          borderBottom: expanded
            ? `1px solid ${theme.palette.divider}`
            : "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            pr: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: "1.05rem",
              letterSpacing: "-0.01em",
            }}
          >
            {contract.project_name || "Untitled Contract"}
          </Typography>
          {contract.ServiceLine?.name && (
            <Chip
              label={contract.ServiceLine.name}
              size="small"
              variant="outlined"
              sx={{ height: 20 }}
            />
          )}
          {isPlaceholder && (
            <Chip
              label="Draft"
              size="small"
              sx={{
                height: 20,
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: "warning.main",
              }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {fmtMoney(contract.value)}
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2 }}>
        <InfoGrid>
          {/* ── Contract terms (self-contained fields — fully editable now) ── */}
          <InfoCard
            title="Contract Terms"
            collapsible
            defaultOpen
            editable
            editValues={contract}
            onSave={onSave}
            span="half"
          >
            <FieldRow
              label="Project Name"
              value={contract.project_name}
              fieldKey="project_name"
              fullWidth
            />

            <FieldRow
              label={"Service Type"}
              value={contract.service_type_id}
              fieldKey="service_type_id"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={value ?? ""}
                    onChange={(e) =>
                      onChange("service_type_id", e.target.value || null)
                    }
                  >
                    {serviceTypes.map((stype) => (
                      <MenuItem key={stype.id} value={stype.id}>
                        {stype.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {serviceTypeName(value)}
                  </Typography>
                )
              }
            />

            <FieldRow
              label="Start Date"
              value={contract.start_date}
              fieldKey="start_date"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={toDateInput(value)}
                    onChange={(e) => onChange("start_date", e.target.value)}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {fmtDate(value)}
                  </Typography>
                )
              }
            />

            <FieldRow
              label="End Date"
              value={contract.end_date}
              fieldKey="end_date"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={toDateInput(value)}
                    onChange={(e) => onChange("end_date", e.target.value)}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {fmtDate(value)}
                  </Typography>
                )
              }
            />

            <FieldRow
              label="Value"
              value={contract.value}
              fieldKey="value"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={value ?? ""}
                    onChange={(e) => onChange("value", e.target.value)}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {fmtMoney(value)}
                  </Typography>
                )
              }
            />

            <FieldRow
              label="Annual Increase %"
              value={contract.annual_increase_percent}
              fieldKey="annual_increase_percent"
              type="number"
            />

            <FieldRow
              label="Auto Renew"
              value={contract.auto_renew}
              fieldKey="auto_renew"
              render={(value, editing, { onChange }) =>
                editing ? (
                  <Switch
                    checked={!!value}
                    onChange={(e) => onChange("auto_renew", e.target.checked)}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.85rem" }}>
                    {value ? "Yes" : "No"}
                  </Typography>
                )
              }
            />
          </InfoCard>

          {/* ── Team (needs the employees list — editable via select) ──
          <InfoCard
            title="Team"
            collapsible
            defaultOpen
            editable
            editValues={contract}
            onSave={onSave}
            span="half"
          >
            {[
              ["Sales", "sales_person_id"],
              ["Operations", "operations_person_id"],
            ].map(([label, key]) => (
              <FieldRow
                key={key}
                label={label}
                value={contract[key]}
                fieldKey={key}
                render={(value, editing, { onChange }) =>
                  editing ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={value ?? ""}
                      onChange={(e) => onChange(key, e.target.value || null)}
                    >
                      <MenuItem value="">
                        <em>Unassigned</em>
                      </MenuItem>
                      {employees.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Typography sx={{ fontSize: "0.85rem" }}>
                      {empName(value)}
                    </Typography>
                  )
                }
              />
            ))}
          </InfoCard> */}
          <RoleAssignment entity_type_id={5} entity_id={contract.id} />
        </InfoGrid>

        {/* ── Sites (provisional — light display, links out to site detail) ── */}
        <Box sx={{ mt: 2 }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.disabled",
              mb: 1,
            }}
          >
            Sites {sites ? `(${sites.length})` : ""}
          </Typography>

          {loadingSites && <CircularProgress size={20} />}

          {sites && sites.length === 0 && !loadingSites && (
            <Typography sx={{ color: "text.disabled", fontSize: "0.85rem" }}>
              No sites on this contract.
            </Typography>
          )}

          {sites?.map((cs) => (
            <Box
              key={cs.id}
              onClick={() => navigate(`/sites/${cs.Site?.id ?? cs.site_id}`)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 1,
                px: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                border: `1px solid ${theme.palette.divider}`,
                mb: 0.75,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <Box>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {cs.Site?.store || "Unnamed site"}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                >
                  {[cs.Site?.mailing_city, cs.Site?.mailing_state?.trim()]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </Typography>
              </Box>
              {cs.high_risk && (
                <Chip
                  label="High Risk"
                  size="small"
                  sx={{
                    height: 20,
                    backgroundColor: alpha(theme.palette.error.main, 0.15),
                    color: "error.main",
                  }}
                />
              )}
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                {new Date(cs.Site?.created_at).toLocaleString() || "—"}
              </Typography>
            </Box>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
