// components/Tasks/TaskControls.jsx
//
// The pieces a task shows wherever it appears (notes panel, dashboard):
//   <TaskDueChip task={note.task} />
//   <TaskCheckbox note={note} userId={user.id} onChange={replaceNote} onError={showError} />
//   <TaskMenu note={note} userId={user.id} employees={employees} onChange={replaceNote} onError={showError} />
import { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import {
  addDaysIso,
  canComplete,
  canReassign,
  dueInfo,
  errorText,
  setTaskDone,
  todayLocal,
  updateTask,
} from "./taskUtils";
import { employeeOptionProps } from "./employeeOptions";

const FONT = '"Barlow", sans-serif';

export function TaskDueChip({ task, today, sx }) {
  const info = dueInfo(task, today);
  if (!info) return null;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.4,
        fontFamily: FONT,
        fontSize: "0.64rem",
        fontWeight: 700,
        color: info.color,
        bgcolor: alpha(info.color, 0.1),
        border: `1px solid ${alpha(info.color, 0.25)}`,
        borderRadius: "20px",
        px: 0.85,
        py: 0.1,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {info.key !== "done" && <EventOutlinedIcon sx={{ fontSize: 11 }} />}
      {info.label}
    </Box>
  );
}

export function TaskCheckbox({ note, userId, onChange, onError, size = 20 }) {
  const [busy, setBusy] = useState(false);
  const done = Boolean(note.task?.completed_at);
  const allowed = canComplete(note, userId);

  const toggle = async (e) => {
    e.stopPropagation();
    if (!allowed || busy) return;
    setBusy(true);
    try {
      onChange?.(await setTaskDone(note.id, !done, userId));
    } catch (err) {
      onError?.(errorText(err, "Couldn't update the task. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const title = allowed
    ? done
      ? "Mark not done"
      : "Mark done"
    : `Only ${note.task?.assignee_name ?? "the assignee"} or ${note.author_name ?? "the creator"} can change this`;

  if (busy) return <CircularProgress size={size - 4} sx={{ m: "5px", color: "success.main" }} />;
  return (
    <Tooltip title={title} placement="top">
      <span>
        <Checkbox
          checked={done}
          onClick={toggle}
          disabled={!allowed}
          size="small"
          icon={<RadioButtonUncheckedIcon sx={{ fontSize: size }} />}
          checkedIcon={<CheckCircleIcon sx={{ fontSize: size }} />}
          inputProps={{ "aria-label": title }}
          sx={{
            p: 0.5,
            color: "text.disabled",
            "&.Mui-checked": { color: "success.main" },
            "&:hover": { color: allowed ? "success.main" : undefined },
          }}
        />
      </span>
    </Tooltip>
  );
}

/** "Change due date" / "Reassign" / "Reopen", for whoever is allowed. */
export function TaskMenu({ note, userId, employees = [], onChange, onError }) {
  const [anchor, setAnchor] = useState(null);
  const [editor, setEditor] = useState(null); // "due" | "assignee"
  const [editorAnchor, setEditorAnchor] = useState(null);
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState(null);
  const [saving, setSaving] = useState(false);

  const task = note.task;
  if (!task || !canComplete(note, userId)) return null;
  const done = Boolean(task.completed_at);
  const today = todayLocal();

  const openEditor = (kind) => {
    setEditorAnchor(anchor);
    setAnchor(null);
    setEditor(kind);
    setDue(task.due_date ?? "");
    setAssignee(employees.find((e) => e.id === task.assignee_id) ?? null);
  };
  const closeEditor = () => {
    setEditor(null);
    setEditorAnchor(null);
  };

  const save = async (changes) => {
    setSaving(true);
    try {
      onChange?.(await updateTask(note.id, changes, userId));
      closeEditor();
    } catch (err) {
      onError?.(errorText(err, "Couldn't save that change."));
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    setAnchor(null);
    try {
      onChange?.(await setTaskDone(note.id, false, userId));
    } catch (err) {
      onError?.(errorText(err, "Couldn't reopen the task."));
    }
  };

  const people = employees.filter((e) => !e.terminated);

  return (
    <>
      <Tooltip title="Task options">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
          sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "text.primary" } }}
          aria-label="Task options"
        >
          <MoreHorizIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <MenuItem onClick={reopen} sx={{ fontSize: "0.8rem" }}>
            Reopen task
          </MenuItem>
        ) : (
          [
            <MenuItem key="due" onClick={() => openEditor("due")} sx={{ fontSize: "0.8rem" }}>
              Change due date
            </MenuItem>,
            canReassign(note, userId) && (
              <MenuItem key="who" onClick={() => openEditor("assignee")} sx={{ fontSize: "0.8rem" }}>
                Reassign
              </MenuItem>
            ),
          ]
        )}
      </Menu>

      <Popover
        open={!!editor}
        anchorEl={editorAnchor}
        onClose={saving ? undefined : closeEditor}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 1.5, width: 250 }}>
          {editor === "due" ? (
            <>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.8rem", mb: 1 }}>Due date</Typography>
              <TextField
                type="date"
                size="small"
                fullWidth
                value={due}
                onChange={(e) => setDue(e.target.value)}
                inputProps={{ min: today, "aria-label": "Due date" }}
              />
              <QuickDates value={due} onPick={setDue} />
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.25 }}>
                <Button size="small" disabled={saving || !task.due_date} onClick={() => save({ due_date: null })}>
                  No date
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={saving || !due || due === task.due_date || due < today}
                  onClick={() => save({ due_date: due })}
                >
                  Save
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.8rem", mb: 1 }}>Reassign to</Typography>
              <Autocomplete
                size="small"
                options={people}
                value={assignee}
                onChange={(_, v) => setAssignee(v)}
                {...employeeOptionProps(people, userId)}
                renderInput={(params) => <TextField {...params} placeholder="Choose someone" autoFocus />}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.25 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={saving || !assignee || assignee.id === task.assignee_id}
                  onClick={() => save({ assignee_id: assignee.id })}
                >
                  Reassign
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}

/** Today · Tomorrow · Next week */
export function QuickDates({ value, onPick, sx }) {
  const today = todayLocal();
  const options = [
    ["Today", today],
    ["Tomorrow", addDaysIso(today, 1)],
    ["Next week", addDaysIso(today, 7)],
  ];
  return (
    <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, ...sx }}>
      {options.map(([label, iso]) => (
        <Box
          key={label}
          component="button"
          type="button"
          onClick={() => onPick(iso)}
          sx={{
            all: "unset",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: "0.66rem",
            fontWeight: 600,
            px: 0.85,
            py: 0.2,
            borderRadius: "20px",
            border: "1px solid",
            borderColor: value === iso ? "secondary.main" : "divider",
            color: value === iso ? "secondary.main" : "text.secondary",
            "&:hover": { borderColor: "secondary.main", color: "secondary.main" },
            "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.main" },
          }}
        >
          {label}
        </Box>
      ))}
    </Box>
  );
}
