import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import axios from "axios";

import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
} from "@mui/material";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import TaskAltIcon from "@mui/icons-material/TaskAlt";

// Constants
import { ENTITY_TYPES } from "../../*/constants/entityTypes";
import { priorityConfig } from "../../*/constants/priorityConfig";

// Hooks
import { useEmployees } from "../../*/hooks/useEmployees";
import useAuthenticatedUser from "../../*/hooks/useAuthenticatedUser";

// Local Components
import ComposeNote from "./ComposeNote";
import { TaskCheckbox, TaskDueChip, TaskMenu } from "../Tasks/TaskControls";
import { TASKS_CHANGED, announceTasksChanged, errorText, todayLocal } from "../Tasks/taskUtils";

const PANEL_WIDTH = 300;
const FONT = '"Barlow", sans-serif';

/**
 * NotesPanel
 *
 * Persistent collapsible notes panel on the right side of every detail page.
 * It loads and saves the record's notes itself (GET/POST /api/notes), so
 * tasks can be ticked off here and on the dashboard and both stay current.
 * The record comes from the URL (/vendors/12 → vendor 12).
 *
 * A note can be a task: assigned to one person, with an optional due date.
 * The assignee or the person who created it can mark it done.
 *
 * Props:
 *   entityName  {string}  shown nowhere yet; kept for compatibility
 *   notes, loading, onAddNote — no longer used (the panel loads its own)
 */
export default function NotesPanel() {
  const { id } = useParams();
  const { user } = useAuthenticatedUser();
  const { data: employees = [] } = useEmployees();

  const location = useLocation();
  const entityType = location.pathname.split("/").filter(Boolean)[0];
  const entityTypeId = ENTITY_TYPES[entityType];
  const entityId = Number(id);

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(true);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState("all"); // all | tasks | mine
  const [toast, setToast] = useState("");
  const scrollRef = useRef(null);
  const scrollNext = useRef(true); // scroll to the bottom after the next render

  // ── Load ──
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(
    async ({ quiet } = {}) => {
      if (!entityTypeId || !entityId) return;
      if (!quiet) setLoading(true);
      try {
        const { data } = await axios.get("/api/notes", {
          params: { entity_type_id: entityTypeId, entity_id: entityId },
        });
        setNotes(data);
        setLoadError("");
      } catch (e) {
        console.error("Error loading notes:", e);
        setLoadError("Couldn't load notes.");
      } finally {
        setLoading(false);
      }
    },
    [entityTypeId, entityId],
  );

  useEffect(() => {
    scrollNext.current = true;
    setNotes([]);
    load();
  }, [load]);

  // A task changed elsewhere (dashboard, another note): refresh quietly.
  useEffect(() => {
    const onChange = () => load({ quiet: true });
    window.addEventListener(TASKS_CHANGED, onChange);
    return () => window.removeEventListener(TASKS_CHANGED, onChange);
  }, [load]);

  useEffect(() => {
    if (open && scrollRef.current && scrollNext.current && !loading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      scrollNext.current = false;
    }
  }, [notes, open, loading]);

  const replaceNote = (updated) => setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

  const handleSubmit = async ({ draft, taggedUsers, priority, task }) => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { data } = await axios.post("/api/notes", {
        body: draft.trim(),
        tagged_user_ids: taggedUsers.map((u) => u.id),
        priority,
        author_id: user?.id,
        entity_id: entityId,
        entity_type_id: entityTypeId,
        task,
      });
      scrollNext.current = true;
      setNotes((prev) => [...prev, data]);
      if (task) {
        announceTasksChanged();
        if (filter === "mine" && task.assignee_id !== user?.id) setFilter("tasks");
      }
      setComposing(false);
    } catch (e) {
      console.error("Error saving note:", e);
      setSaveError(errorText(e, "Couldn't save the note. Try again."));
    } finally {
      setSaving(false);
    }
  };

  // ── Counts and filtering ──
  const today = todayLocal();
  const tasks = notes.filter((n) => n.task);
  const openTasks = tasks.filter((n) => !n.task.completed_at);
  const myOpen = openTasks.filter((n) => n.task.assignee_id === user?.id);
  const myOverdue = myOpen.some((n) => n.task.due_date && n.task.due_date < today);

  const shown = useMemo(() => {
    if (filter === "tasks") return notes.filter((n) => n.task);
    if (filter === "mine") return notes.filter((n) => n.task && !n.task.completed_at && n.task.assignee_id === user?.id);
    return notes;
  }, [notes, filter, user?.id]);

  // Nothing left under "Mine" after ticking the last one: show all tasks.
  useEffect(() => {
    if (filter === "mine" && myOpen.length === 0 && !loading) setFilter(tasks.length ? "tasks" : "all");
    if (filter === "tasks" && tasks.length === 0 && !loading) setFilter("all");
  }, [filter, myOpen.length, tasks.length, loading]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  };

  const getNotePriority = (note) => {
    if (!note.priority) return "Low";
    if (note.priority === "Medium") return "Normal";
    return note.priority;
  };

  // ── Collapsed strip ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <Box
        sx={{
          width: 44,
          flexShrink: 0,
          borderLeft: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 2,
          gap: 1.5,
          backgroundColor: isDark ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
          transition: "width 0.2s ease",
        }}
      >
        <Tooltip title="Open notes" placement="left">
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            sx={{ color: "text.secondary", "&:hover": { color: "secondary.main" } }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Notes" placement="left">
          <Box sx={{ position: "relative", display: "flex" }}>
            <NoteAltOutlinedIcon
              sx={{ fontSize: 18, color: notes.length > 0 ? "secondary.main" : "text.disabled" }}
            />
            {notes.length > 0 && <CountDot n={notes.length} color={theme.palette.secondary.main} />}
          </Box>
        </Tooltip>

        {myOpen.length > 0 && (
          <Tooltip
            title={`${myOpen.length} open task${myOpen.length === 1 ? "" : "s"} for you${myOverdue ? ", some overdue" : ""}`}
            placement="left"
          >
            <Box
              sx={{ position: "relative", display: "flex", cursor: "pointer" }}
              onClick={() => {
                setFilter("mine");
                setOpen(true);
              }}
            >
              <TaskAltIcon sx={{ fontSize: 18, color: myOverdue ? "error.main" : "secondary.main" }} />
              <CountDot n={myOpen.length} color={myOverdue ? theme.palette.error.main : theme.palette.secondary.main} />
            </Box>
          </Tooltip>
        )}
      </Box>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        width: PANEL_WIDTH,
        flexShrink: 0,
        borderLeft: `1px solid ${theme.palette.divider}`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: isDark ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <Box sx={{ flexShrink: 0, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NoteAltOutlinedIcon sx={{ fontSize: 16, color: "secondary.main" }} />
            <Typography
              sx={{
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: "0.78rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Notes
            </Typography>
            {notes.length > 0 && <Pill n={notes.length} color={theme.palette.secondary.main} />}
          </Box>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Add note or task">
              <span>
                <IconButton
                  size="small"
                  onClick={() => setComposing(true)}
                  disabled={composing}
                  aria-label="Add note or task"
                  sx={{ color: "text.secondary", "&:hover": { color: "secondary.main" } }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Collapse">
              <IconButton
                size="small"
                onClick={() => setOpen(false)}
                sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                <ChevronRightIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Filter, once there are tasks */}
        {tasks.length > 0 && (
          <Box sx={{ px: 2, pb: 1.25 }}>
            <ToggleButtonGroup
              value={filter}
              exclusive
              fullWidth
              size="small"
              onChange={(_, v) => v && setFilter(v)}
              sx={{
                height: 26,
                "& .MuiToggleButton-root": {
                  fontFamily: FONT,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  textTransform: "none",
                  color: "text.secondary",
                  py: 0,
                  "&.Mui-selected": {
                    color: "secondary.main",
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  },
                },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="tasks" title={`${openTasks.length} open of ${tasks.length}`}>
                Tasks · {openTasks.length}
              </ToggleButton>
              <ToggleButton value="mine" disabled={myOpen.length === 0}>
                Mine{myOpen.length ? ` · ${myOpen.length}` : ""}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </Box>

      {/* Notes list */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 2,
          },
        }}
      >
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={20} color="secondary" />
          </Box>
        )}

        {!loading && loadError && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography sx={{ fontFamily: FONT, fontSize: "0.78rem", color: "error.main" }}>{loadError}</Typography>
            <Typography
              onClick={() => load()}
              sx={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: "secondary.main", cursor: "pointer" }}
            >
              Try again
            </Typography>
          </Box>
        )}

        {!loading && !loadError && notes.length === 0 && !composing && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
              px: 2,
              gap: 1,
            }}
          >
            <NoteAltOutlinedIcon sx={{ fontSize: 32, color: "text.disabled" }} />
            <Typography sx={{ fontSize: "0.78rem", color: "text.disabled", fontFamily: FONT, textAlign: "center" }}>
              No notes yet
            </Typography>
            <Typography
              onClick={() => setComposing(true)}
              sx={{
                fontSize: "0.72rem",
                color: "secondary.main",
                fontFamily: FONT,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Add the first one
            </Typography>
          </Box>
        )}

        {!loading &&
          shown.map((note, i) => (
            <Box key={note.id ?? i}>
              <NoteItem
                note={note}
                priority={priorityConfig[getNotePriority(note)] ?? priorityConfig.Low}
                userId={user?.id}
                employees={employees}
                today={today}
                formatDate={formatDate}
                onChange={replaceNote}
                onError={setToast}
                theme={theme}
              />
              {i < shown.length - 1 && <Divider sx={{ borderColor: theme.palette.divider }} />}
            </Box>
          ))}
      </Box>

      {/* Compose area */}
      {composing && (
        <ComposeNote
          employees={employees}
          saving={saving}
          error={saveError}
          onSubmit={handleSubmit}
          onCancel={() => {
            setComposing(false);
            setSaveError("");
          }}
          theme={theme}
          isDark={isDark}
          currentUserId={user?.id}
        />
      )}

      {/* Footer add button when not composing and has notes */}
      {!composing && notes.length > 0 && (
        <Box sx={{ flexShrink: 0, borderTop: `1px solid ${theme.palette.divider}`, px: 2, py: 1 }}>
          <Typography
            onClick={() => setComposing(true)}
            sx={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "text.disabled",
              cursor: "pointer",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              "&:hover": { color: "secondary.main" },
              transition: "color 0.15s",
            }}
          >
            + Add note or task
          </Typography>
        </Box>
      )}

      <Snackbar open={!!toast} autoHideDuration={6000} onClose={() => setToast("")}>
        <Alert severity="error" onClose={() => setToast("")} sx={{ fontSize: "0.8rem" }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ── One note ─────────────────────────────────────────────────────────── */

function NoteItem({ note, priority, userId, employees, today, formatDate, onChange, onError, theme }) {
  const { label, color } = priority;
  const task = note.task;
  const done = Boolean(task?.completed_at);
  const mineOpen = task && !done && task.assignee_id === userId;

  return (
    <Box
      sx={{
        px: 2,
        py: 1.75,
        borderLeft: "3px solid",
        borderLeftColor: mineOpen ? "secondary.main" : "transparent",
        bgcolor: mineOpen ? alpha(theme.palette.secondary.main, 0.035) : "transparent",
      }}
    >
      {/* Note header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75, alignItems: "baseline" }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 600, fontSize: "0.72rem", color: "text.primary" }}>
          {note.author_name ?? note.changed_by ?? "Unknown"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "0.62rem",
              fontWeight: 600,
              color,
              backgroundColor: alpha(color, 0.1),
              border: `1px solid ${alpha(color, 0.25)}`,
              borderRadius: "20px",
              px: 0.85,
              py: 0.15,
              lineHeight: 1.6,
            }}
          >
            {label}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: "0.65rem", color: "text.disabled", flexShrink: 0 }}>
            {formatDate(note.date ?? note.changed_at)}
          </Typography>
        </Box>
      </Box>

      {/* Task line */}
      {task && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: 0.75,
            ml: -0.5,
            flexWrap: "wrap",
          }}
        >
          <TaskCheckbox note={note} userId={userId} onChange={onChange} onError={onError} size={18} />
          <Typography
            sx={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: done ? "text.disabled" : "text.primary",
              flex: 1,
              minWidth: 0,
            }}
            noWrap
            title={task.assignee_email ?? undefined}
          >
            {done
              ? `Done by ${task.completed_by_name ?? "someone"}`
              : task.assignee_id === userId
                ? "Task for you"
                : `Task for ${task.assignee_name}`}
          </Typography>
          <TaskDueChip task={task} today={today} />
          <TaskMenu note={note} userId={userId} employees={employees} onChange={onChange} onError={onError} />
        </Box>
      )}

      {/* Note body */}
      <Typography
        sx={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: done ? "text.disabled" : "text.secondary",
          textDecoration: done ? "line-through" : "none",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {note.body ?? note.new_value}
      </Typography>

      {/* Tagged users */}
      {note.tagged_users?.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
          {note.tagged_users.map((name, i) => (
            <Typography
              key={note.tagged_user_ids?.[i] ?? name}
              title={note.tagged_user_emails?.[i] ?? undefined}
              sx={{
                fontFamily: FONT,
                fontSize: "0.68rem",
                color: "primary.main",
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                borderRadius: "4px",
                px: 0.75,
                py: 0.25,
                lineHeight: 1.5,
              }}
            >
              @{name}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Pill({ n, color }) {
  return (
    <Box
      sx={{
        px: 0.75,
        py: 0.1,
        borderRadius: "99px",
        backgroundColor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.25)}`,
      }}
    >
      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color }}>{n}</Typography>
    </Box>
  );
}

function CountDot({ n, color }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: -4,
        right: -5,
        width: 14,
        height: 14,
        borderRadius: "50%",
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography sx={{ fontSize: "0.5rem", color: "#fff", fontWeight: 700 }}>{n > 9 ? "9+" : n}</Typography>
    </Box>
  );
}
