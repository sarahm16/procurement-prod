// components/Tasks/taskUtils.js
//
// Shared by the notes panel and the dashboard.
import axios from "axios";

/** Fired on window whenever a task changes, so other views refresh. */
export const TASKS_CHANGED = "note-tasks-changed";
export const announceTasksChanged = () => window.dispatchEvent(new CustomEvent(TASKS_CHANGED));

export const TASK_COLORS = {
  overdue: "#dc2626",
  today: "#d97706",
  soon: "#2563eb",
  later: "#64748b",
  none: "#94a3b8",
  done: "#16a34a",
};

/** Today as YYYY-MM-DD in the browser's time zone. */
export function todayLocal(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function addDaysIso(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayLocal(dt);
}

const asDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a, b) => Math.round((asDate(b) - asDate(a)) / 86400000);

export const fmtDay = (iso, opts = { month: "short", day: "numeric" }) =>
  iso ? asDate(iso).toLocaleDateString("en-US", opts) : "";

export const fmtStamp = (v) =>
  v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

/**
 * Where a task stands, for chips and grouping.
 *   → { key: overdue|today|soon|later|none|done, label, color, group }
 */
export function dueInfo(task, today = todayLocal()) {
  if (!task) return null;
  if (task.completed_at) {
    return { key: "done", label: `Done ${fmtStamp(task.completed_at)}`, color: TASK_COLORS.done, group: "Done" };
  }
  const due = task.due_date;
  if (!due) return { key: "none", label: "No due date", color: TASK_COLORS.none, group: "No due date" };

  const diff = daysBetween(today, due);
  if (diff < 0) {
    const n = -diff;
    return {
      key: "overdue",
      label: `Overdue ${n === 1 ? "1 day" : `${n} days`}`,
      color: TASK_COLORS.overdue,
      group: "Overdue",
    };
  }
  if (diff === 0) return { key: "today", label: "Due today", color: TASK_COLORS.today, group: "Today" };
  if (diff === 1) return { key: "soon", label: "Due tomorrow", color: TASK_COLORS.soon, group: "This week" };
  if (diff < 7) {
    return {
      key: "soon",
      label: `Due ${fmtDay(due, { weekday: "short" })}`,
      color: TASK_COLORS.soon,
      group: "This week",
    };
  }
  return { key: "later", label: `Due ${fmtDay(due)}`, color: TASK_COLORS.later, group: "Later" };
}

/** Can this user tick the box / change the task? */
export const canComplete = (note, userId) =>
  !!note?.task && !!userId && (userId === note.task.assignee_id || userId === note.author_id);
export const canReassign = (note, userId) => !!note?.task && !!userId && userId === note.author_id;

/** Pull the server's message out of an axios error. */
export const errorText = (err, fallback) => err?.response?.data?.error ?? fallback;

/* ── API ── each resolves to the updated note ── */

export async function setTaskDone(noteId, done, userId) {
  const { data } = await axios.post(`/api/notes/${noteId}/${done ? "complete" : "reopen"}`, {
    user_id: userId,
  });
  announceTasksChanged();
  return data;
}

export async function updateTask(noteId, changes, userId) {
  const { data } = await axios.patch(`/api/notes/${noteId}/task`, { ...changes, user_id: userId });
  announceTasksChanged();
  return data;
}
