// contract-detail/tabs/ContractHandoffTab.jsx
//
// The handoff from sales to ops, before any work order exists: submit it and
// tick off what has to be true first. Doing the work is tracked on the work
// orders, not here.
//
//   ┌ Handoff: submitted / Submit button · checklist progress · key dates ┐
//   └ Checklist                                                            ┘
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendIcon from "@mui/icons-material/Send";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

import { fmtDay, todayYmd } from "../format";
import { BILLING_TRIGGER_OPTIONS } from "./ContractDetailsTab";
import {
  useContractActions,
  useContractChecklist,
  useContractDetails,
} from "../ContractDetailProvider";

/** Where a self-ticking item gets its tick, in words. */
const AUTO_SOURCE_LABEL = {
  approved_on: "the Approved date (Details → Contract term)",
};

const errorText = (e, fallback) => e?.response?.data?.error ?? fallback;

/** A plain card with a header, matching the InfoCard look. */
function Panel({ title, count, children }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 4,
        backgroundColor: "background.paper",
        overflow: "hidden",
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
        </Box>
      )}
      {children}
    </Box>
  );
}

// ─── Summary: submit + progress + key dates ──────────────────────────────────

function KeyDate({ label, value, sub, tone }) {
  return (
    <Box sx={{ minWidth: 120 }}>
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
      {sub && (
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          {sub}
        </Typography>
      )}
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
  const billing = BILLING_TRIGGER_OPTIONS.find(
    (o) => o.id === c.billing_trigger,
  )?.name;

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
                  Needs a value, scope, invoicing and a site
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
        <Box sx={{ flex: 1, minWidth: 180 }}>
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
          <KeyDate
            label="Source by"
            value={fmtDay(c.source_by_on)}
            sub={
              c.sites_total
                ? `${c.sites_sourced} of ${c.sites_total} sites sourced`
                : null
            }
            tone={c.source_by_overdue ? "bad" : null}
          />
          <KeyDate label="Complete by" value={fmtDay(c.complete_by_on)} />
          <KeyDate label="Invoicing" value={billing} />
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
          <Typography sx={{ fontSize: "0.85rem" }}>
            Today becomes the handoff date, and ops can start sourcing and
            creating work orders. If our system of record is empty, it's set to{" "}
            {c.handoff_kind === "planned_maintenance"
              ? "UtilizeCore"
              : "Sarlacc"}
            .
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
        {meta.length > 0 && (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            {meta.join(" · ")}
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

// ─── Tab ─────────────────────────────────────────────────────────────────────

export default function ContractHandoffTab() {
  const contract = useContractDetails();
  const checklist = useContractChecklist();
  const { loadChecklist } = useContractActions();

  useEffect(() => {
    if (checklist === null) loadChecklist().catch((e) => console.error(e));
  }, [checklist, loadChecklist]);

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
        maxWidth: 1100,
      }}
    >
      <HandoffSummary contract={contract} checklist={checklist} />
      <Checklist checklist={checklist} />
    </Box>
  );
}
