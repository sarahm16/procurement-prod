// contract-detail/tabs/ContractHandoffTab.jsx
//
// The handoff as work to get through: submit it, tick off the checklist, and
// keep the production schedule. The fields themselves live on the Details tab.
//
//   ┌ Handoff: submitted / Submit button · progress · key dates ┐
//   ├ Checklist (by group)              ├ Production schedule    ┤
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendIcon from "@mui/icons-material/Send";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { fmtDay, fmtShortDay, todayYmd } from "../format";
import {
  useContractActions,
  useContractChecklist,
  useContractDetails,
  useContractPhases,
  useContractSites,
} from "../ContractDetailProvider";

/** Where a self-ticking item gets its tick, in words. */
const AUTO_SOURCE_LABEL = {
  approved_on: "the Approved date",
  deposit_received_on: "the Deposit received date",
  sub_awarded_on: "the Subcontractor awarded date",
  substantial_completion_on: "the Substantial completion date",
  closed_on: "the Handoff closed date",
  client_accepted_on: "the Client accepted date",
  final_invoiced_on: "the Final invoiced date",
  final_due_on: "the Final due date",
  vendor_w9: "the primary vendors' W-9s",
  vendor_coi: "the primary vendors' COIs",
};

const errorText = (e, fallback) => e?.response?.data?.error ?? fallback;

/** A plain card with a header, matching the InfoCard look. */
function Panel({ title, count, action, children, sx }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        backgroundColor: "background.paper",
        overflow: "hidden",
        ...sx,
      }}
    >
      {title && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.text.primary, 0.02),
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "0.85rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </Typography>
          {count && (
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "text.secondary",
                backgroundColor: alpha(theme.palette.text.primary, 0.06),
                px: 0.85,
                borderRadius: 1,
              }}
            >
              {count}
            </Typography>
          )}
          <Box sx={{ flex: 1 }} />
          {action}
        </Box>
      )}
      {children}
    </Box>
  );
}

// ─── Summary: submit + progress + key dates ──────────────────────────────────

function KeyDate({ label, value, tone }) {
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography
        sx={{
          fontSize: "0.68rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.9rem",
          fontWeight: 600,
          color:
            tone === "bad"
              ? "error.main"
              : value
                ? "text.primary"
                : "text.disabled",
        }}
      >
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function HandoffSummary({ contract: c, checklist }) {
  const { submitHandoff } = useContractActions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submitted = Boolean(c.handoff_on);
  const pct = checklist?.total
    ? Math.round((checklist.done / checklist.total) * 100)
    : 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitHandoff();
      setOpen(false);
    } catch (e) {
      setError(errorText(e, "Couldn't submit the handoff. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
        }}
      >
        {/* Submitted or not */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 240,
          }}
        >
          {submitted ? (
            <>
              <TaskAltIcon sx={{ color: "success.main", fontSize: 30 }} />
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  Handoff submitted
                </Typography>
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                >
                  {fmtDay(c.handoff_on)}
                  {c.handoff_submitted_by_name
                    ? ` by ${c.handoff_submitted_by_name}`
                    : ""}
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>
                  Handoff not submitted
                </Typography>
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                >
                  Needs a value, a scope of work and a site
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
                sx={{ ml: 1, whiteSpace: "nowrap" }}
              >
                Submit handoff
              </Button>
            </>
          )}
        </Box>

        {/* Checklist progress */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>
              Checklist
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
              {checklist ? `${checklist.done} of ${checklist.total}` : "…"}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Key dates */}
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <KeyDate label="Target start" value={fmtDay(c.target_start_on)} />
          <KeyDate label="Planned finish" value={fmtDay(c.planned_finish_on)} />
          <KeyDate
            label="Sub award by"
            value={
              c.sub_awarded_on ? "Awarded" : fmtDay(c.sub_award_deadline_on)
            }
            tone={c.sub_award_overdue ? "bad" : null}
          />
        </Box>
      </Box>

      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Submit the handoff?</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ fontSize: "0.85rem", mb: 1 }}>
            Today becomes the handoff date. Anything still empty is filled in
            from the handoff rules:
          </Typography>
          <Box component="ul" sx={{ fontSize: "0.85rem", pl: 2.5, my: 0 }}>
            {c.handoff_kind === "project" ? (
              <>
                <li>Target start: today + {c.lead_time_days} days</li>
                <li>Production days: value ÷ daily rate</li>
                <li>
                  Planned finish: start + production days, weekends skipped
                </li>
              </>
            ) : (
              <li>Target start: the client's required date</li>
            )}
            <li>Our system of record</li>
            <li>The first and last schedule phases</li>
          </Box>
          <Typography
            sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 1 }}
          >
            Fields you've already filled in aren't changed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit handoff"}
          </Button>
        </DialogActions>
      </Dialog>
    </Panel>
  );
}

// ─── Checklist ───────────────────────────────────────────────────────────────

function ChecklistItem({ item, onToggle, onEdit, busy }) {
  const meta = [
    item.done_on && fmtDay(item.done_on),
    item.done_by_name,
    item.note,
  ].filter(Boolean);

  const box = (
    <Checkbox
      size="small"
      checked={item.done}
      disabled={item.auto || busy}
      onChange={() => onToggle(item)}
      sx={{ p: 0.5, mt: -0.25 }}
    />
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        px: 2,
        py: 0.75,
      }}
    >
      {item.auto ? (
        <Tooltip
          title={`Ticks itself from ${AUTO_SOURCE_LABEL[item.auto_source] ?? item.auto_source}`}
          arrow
        >
          <span>{box}</span>
        </Tooltip>
      ) : (
        box
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: item.done ? "text.secondary" : "text.primary",
            textDecoration: item.done ? "line-through" : "none",
            textDecorationColor: "rgba(0,0,0,0.25)",
          }}
        >
          {item.label}
          {item.auto && (
            <AutoModeIcon
              sx={{
                fontSize: 13,
                ml: 0.5,
                verticalAlign: "-2px",
                color: "text.disabled",
              }}
            />
          )}
        </Typography>
        {(meta.length > 0 || item.detail) && (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            {item.detail ?? meta.join(" · ")}
          </Typography>
        )}
      </Box>
      {!item.auto && item.done && (
        <IconButton
          size="small"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.label}`}
        >
          <EditOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
}

function Checklist({ checklist }) {
  const theme = useTheme();
  const { setChecklistItem } = useContractActions();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null); // { item, done_on, note }

  const save = async (item, body) => {
    setBusyId(item.id);
    setError(null);
    try {
      await setChecklistItem(item.id, body);
      return true;
    } catch (e) {
      setError(errorText(e, `Couldn't update "${item.label}".`));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  if (!checklist)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {checklist.groups.map((g) => (
        <Panel
          key={g.key}
          title={g.label}
          count={`${g.done}/${g.items.length}`}
        >
          <Box sx={{ py: 0.75 }}>
            {g.items.map((item, i) => (
              <Box
                key={item.id}
                sx={{
                  borderTop: i ? `1px solid ${theme.palette.divider}` : "none",
                }}
              >
                <ChecklistItem
                  item={item}
                  busy={busyId === item.id}
                  onToggle={(it) => save(it, { done: !it.done })}
                  onEdit={(it) =>
                    setEdit({
                      item: it,
                      done_on: it.done_on ?? todayYmd(),
                      note: it.note ?? "",
                    })
                  }
                />
              </Box>
            ))}
          </Box>
        </Panel>
      ))}

      <Dialog
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{edit?.item.label}</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "8px !important",
          }}
        >
          <TextField
            label="Done on"
            type="date"
            size="small"
            value={edit?.done_on ?? ""}
            onChange={(e) =>
              setEdit((x) => ({ ...x, done_on: e.target.value }))
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Note"
            size="small"
            multiline
            minRows={2}
            value={edit?.note ?? ""}
            onChange={(e) => setEdit((x) => ({ ...x, note: e.target.value }))}
            inputProps={{ maxLength: 300 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="error"
            onClick={async () =>
              (await save(edit.item, { done: false })) && setEdit(null)
            }
            sx={{ mr: "auto" }}
          >
            Untick
          </Button>
          <Button color="inherit" onClick={() => setEdit(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!edit?.done_on}
            onClick={async () =>
              (await save(edit.item, {
                done: true,
                done_on: edit.done_on,
                note: edit.note,
              })) && setEdit(null)
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Production schedule ─────────────────────────────────────────────────────

function PhaseDialog({ phase, sites, onClose, onSave }) {
  const [draft, setDraft] = useState(phase);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => setDraft(phase), [phase]);
  if (!phase) return null;
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <Dialog open onClose={() => !busy && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {phase.id ? "Edit phase" : "Add a phase"}
      </DialogTitle>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          pt: "8px !important",
        }}
      >
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Label"
          size="small"
          value={draft?.label ?? ""}
          onChange={set("label")}
          placeholder="e.g. Day 2"
          inputProps={{ maxLength: 50 }}
          autoFocus
        />
        <TextField
          label="What happens"
          size="small"
          multiline
          minRows={2}
          value={draft?.description ?? ""}
          onChange={set("description")}
          placeholder="Work area + quantity"
          inputProps={{ maxLength: 500 }}
        />
        <TextField
          label="Planned date"
          type="date"
          size="small"
          value={draft?.planned_on ?? ""}
          onChange={set("planned_on")}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Site"
          size="small"
          value={draft?.site_id ?? ""}
          onChange={set("site_id")}
          helperText="Only if this phase is at one site"
        >
          <MenuItem value="">
            <em>All sites</em>
          </MenuItem>
          {sites.map((s) => (
            <MenuItem key={s.site_id} value={s.site_id}>
              {s.store || "Unnamed site"}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={busy || !draft?.label?.trim()}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onSave({
                label: draft.label,
                description: draft.description ?? null,
                planned_on: draft.planned_on || null,
                site_id: draft.site_id === "" ? null : (draft.site_id ?? null),
              });
              onClose();
            } catch (e) {
              setError(errorText(e, "Couldn't save the phase."));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Schedule({ phases }) {
  const theme = useTheme();
  const sites = useContractSites();
  const { loadSites, addPhase, updatePhase, deletePhase, reorderPhases } =
    useContractActions();
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sites === null) loadSites().catch(() => {});
  }, [sites, loadSites]);
  const currentSites = useMemo(
    () => (sites ?? []).filter((s) => s.is_current),
    [sites],
  );

  const run = async (fn) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e, "Couldn't update the schedule."));
    }
  };

  const move = (i, dir) => {
    const ids = phases.map((p) => p.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderPhases(ids));
  };

  return (
    <Panel
      title="Production schedule"
      count={phases ? String(phases.length) : null}
      action={
        <Tooltip title="Add a phase">
          <IconButton
            size="small"
            onClick={() =>
              setEditing({
                label: "",
                description: "",
                planned_on: "",
                site_id: "",
              })
            }
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      }
    >
      {error && (
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ borderRadius: 0 }}
        >
          {error}
        </Alert>
      )}
      {phases === null ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={22} />
        </Box>
      ) : phases.length === 0 ? (
        <Typography
          sx={{ px: 2.5, py: 2, fontSize: "0.82rem", color: "text.disabled" }}
        >
          No phases yet. Submitting the handoff adds the first and last day.
        </Typography>
      ) : (
        phases.map((p, i) => (
          <Box
            key={p.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2.5,
              py: 1.25,
              borderTop: i ? `1px solid ${theme.palette.divider}` : "none",
              "&:hover .phase-actions": { opacity: 1 },
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "primary.main",
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="div"
                sx={{ fontSize: "0.86rem", fontWeight: 600 }}
              >
                {p.label}
                {p.site && (
                  <Chip
                    label={p.site}
                    size="small"
                    sx={{ ml: 1, height: 18, fontSize: "0.68rem" }}
                  />
                )}
              </Typography>
              {p.description && (
                <Typography
                  sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                >
                  {p.description}
                </Typography>
              )}
            </Box>
            <Typography
              sx={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: p.planned_on ? "text.primary" : "text.disabled",
                whiteSpace: "nowrap",
              }}
            >
              {fmtShortDay(p.planned_on) ?? "No date"}
            </Typography>
            <Box
              className="phase-actions"
              sx={{
                display: "flex",
                opacity: { xs: 1, md: 0.35 },
                transition: "opacity .15s",
              }}
            >
              <IconButton
                size="small"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Move up"
              >
                <ArrowUpwardIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                disabled={i === phases.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Move down"
              >
                <ArrowDownwardIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setEditing({ ...p, site_id: p.site_id ?? "" })}
                aria-label={`Edit ${p.label}`}
              >
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => run(() => deletePhase(p.id))}
                aria-label={`Delete ${p.label}`}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        ))
      )}

      <PhaseDialog
        phase={editing}
        sites={currentSites}
        onClose={() => setEditing(null)}
        onSave={(body) =>
          editing?.id ? updatePhase(editing.id, body) : addPhase(body)
        }
      />
    </Panel>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function ContractHandoffTab() {
  const contract = useContractDetails();
  const checklist = useContractChecklist();
  const phases = useContractPhases();
  const { loadChecklist, loadPhases } = useContractActions();

  useEffect(() => {
    if (checklist === null) loadChecklist().catch((e) => console.error(e));
  }, [checklist, loadChecklist]);
  useEffect(() => {
    if (phases === null) loadPhases().catch((e) => console.error(e));
  }, [phases, loadPhases]);

  if (!contract)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 4 },
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <HandoffSummary contract={contract} checklist={checklist} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0,1fr)",
            lg: "minmax(0,7fr) minmax(0,5fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Checklist checklist={checklist} />
        <Schedule phases={phases} />
      </Box>
    </Box>
  );
}
