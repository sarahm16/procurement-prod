/**
 * Notes, and tasks on notes.
 *
 *   GET   /api/notes?entity_type_id=4&entity_id=123   a record's notes (oldest first)
 *   GET   /api/notes                                  every note (unchanged)
 *   POST  /api/notes                                  add a note, optionally as a task
 *           { body, priority, entity_type_id, entity_id, author_id,
 *             tagged_user_ids: [], task: { assignee_id, due_date: "YYYY-MM-DD" | null } | null }
 *
 *   GET   /api/notes/tasks?user_id=7&view=assigned|created&status=open|done
 *           tasks across every record, with the record's name and link,
 *           plus counts { open, overdue, due_today, done_this_week }
 *   POST  /api/notes/:id/complete   { user_id }   assignee or creator
 *   POST  /api/notes/:id/reopen     { user_id }   assignee or creator
 *   PATCH /api/notes/:id/task       { user_id, due_date?, assignee_id? }
 *           due date: assignee or creator; reassigning: creator only
 *
 * Emails (tags, assignment, completion) go from here now; the browser no
 * longer sends them. Completing, reopening and reassigning are written to
 * the record's activity log.
 *
 * .env:
 *   OPS_APP_URL     links in emails (falls back to the browser's origin)
 *   APP_TIME_ZONE   what "today" means for due dates (default America/New_York)
 */
import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import serializeLegacyNote from "../serializer/noteSerializer.js";
import { logActivity } from "../utils/logActivity.js";
import {
  ENTITY_SEGMENTS,
  NOTE_INCLUDE,
  PRIORITIES,
  appBase,
  entityLabels,
  isoDay,
  serializeNote,
  todayIso,
} from "../services/notes/noteData.js";
import {
  notifyCompleted,
  notifyNoteCreated,
  notifyReassigned,
} from "../services/notes/noteEmails.js";

const BODY_MAX = 1000;
const PRIORITY_RANK = { High: 0, Normal: 1, Low: 2 };
const DONE_LIMIT = 100;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (s) => DAY_RE.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
const toDbDate = (s) => (s ? new Date(`${s}T00:00:00Z`) : null);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function prismaError(res, error, what) {
  if (error instanceof PrismaClientKnownRequestError) {
    console.error(`Prisma error ${what}:`, error);
    return res.status(400).json({ error: "Database Error", code: error.code, message: error.message });
  }
  console.error(`Error ${what}:`, error);
  return res.status(500).json({ error: "Internal Server Error" });
}

/** Open tasks: overdue and soonest first, then High priority, then oldest. */
function sortOpen(a, b) {
  const da = a.task.due_date ?? "9999-12-31";
  const db = b.task.due_date ?? "9999-12-31";
  if (da !== db) return da < db ? -1 : 1;
  const pa = PRIORITY_RANK[a.priority] ?? 3;
  const pb = PRIORITY_RANK[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  return new Date(a.date) - new Date(b.date);
}

export default function notesRouter(prisma) {
  const router = Router();

  const loadNote = (id) => prisma.notes.findUnique({ where: { id }, include: NOTE_INCLUDE });

  const entityFor = async (note) =>
    (await entityLabels(prisma, [note])).get(`${note.entity_type_id}:${note.entity_id}`);

  const logTask = (note, userId, newValue, previousValue = null) =>
    logActivity(prisma, {
      entityTypeId: note.entity_type_id,
      entityId: note.entity_id,
      fieldChanged: "task",
      previousValue: previousValue ? String(previousValue).slice(0, 255) : null,
      newValue: String(newValue).slice(0, 255),
      changedBy: userId,
      action: "UPDATE",
    }).catch((e) => console.error("Task activity log failed:", e));

  const snippet = (body) => (body.length > 80 ? `${body.slice(0, 77)}…` : body);

  // ── A record's notes, or every note ──
  router.get("/", async (req, res) => {
    const typeId = Number(req.query.entity_type_id);
    const entityId = Number(req.query.entity_id);
    try {
      if (!typeId || !entityId) {
        // Unchanged: everything, in the old shape.
        const notes = await prisma.notes.findMany({
          include: {
            Author: true,
            NoteTaggedUsers: { include: { TaggedUser: true } },
            Replies: {
              include: { Author: true, NoteTaggedUsers: { select: { TaggedUser: true } } },
            },
          },
        });
        return res.json(notes.map(serializeLegacyNote));
      }

      const notes = await prisma.notes.findMany({
        where: { entity_type_id: typeId, entity_id: entityId, parent_note_id: null },
        include: NOTE_INCLUDE,
        orderBy: { date: "asc" },
      });
      const today = todayIso();
      res.json(notes.map((n) => serializeNote(n, { today })));
    } catch (error) {
      prismaError(res, error, "fetching notes");
    }
  });

  // ── Tasks across every record (the dashboard) ──
  router.get("/tasks", async (req, res) => {
    const userId = Number(req.query.user_id);
    const view = req.query.view === "created" ? "created" : "assigned";
    const status = ["open", "done"].includes(req.query.status) ? req.query.status : "open";
    if (!userId) return res.status(400).json({ error: "Missing user_id" });

    const who =
      view === "assigned"
        ? { assignee_id: userId }
        : { author_id: userId, assignee_id: { not: null } };
    const today = todayIso();
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    try {
      const [rows, openDue, doneThisWeek] = await Promise.all([
        prisma.notes.findMany({
          where: { ...who, completed_at: status === "open" ? null : { not: null } },
          include: NOTE_INCLUDE,
          ...(status === "done" && { orderBy: { completed_at: "desc" }, take: DONE_LIMIT }),
        }),
        prisma.notes.findMany({
          where: { ...who, completed_at: null },
          select: { due_date: true },
        }),
        prisma.notes.count({ where: { ...who, completed_at: { gte: weekAgo } } }),
      ]);

      const labels = await entityLabels(prisma, rows);
      const tasks = rows.map((n) =>
        serializeNote(n, { today, entity: labels.get(`${n.entity_type_id}:${n.entity_id}`) }),
      );
      if (status === "open") tasks.sort(sortOpen);

      const dues = openDue.map((n) => isoDay(n.due_date));
      res.json({
        view,
        status,
        today,
        tasks,
        counts: {
          open: dues.length,
          overdue: dues.filter((d) => d && d < today).length,
          due_today: dues.filter((d) => d === today).length,
          due_this_week: dues.filter((d) => d && d >= today && d <= addDays(today, 6)).length,
          done_this_week: doneThisWeek,
        },
      });
    } catch (error) {
      prismaError(res, error, "fetching tasks");
    }
  });

  // ── Add a note (or a task) ──
  router.post("/", async (req, res) => {
    const b = req.body ?? {};
    const body = typeof b.body === "string" ? b.body.trim() : "";
    const priority = b.priority === "Medium" ? "Normal" : b.priority || "Low";
    const typeId = Number(b.entity_type_id);
    const entityId = Number(b.entity_id);
    const authorId = Number(b.author_id);
    const taggedIds = [...new Set((b.tagged_user_ids ?? []).map(Number))].filter(Number.isInteger);
    const task = b.task ?? null;
    const assigneeId = task ? Number(task.assignee_id) : null;
    const dueDate = task?.due_date || null;

    if (!body) return res.status(400).json({ error: "Write something first" });
    if (body.length > BODY_MAX) return res.status(400).json({ error: `Keep notes under ${BODY_MAX} characters` });
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "Unknown priority" });
    if (!ENTITY_SEGMENTS[typeId] || !entityId) return res.status(400).json({ error: "Which record is this note on?" });
    if (!authorId) return res.status(400).json({ error: "Missing who's writing the note" });
    if (task && !assigneeId) return res.status(400).json({ error: "Choose who the task is for" });
    if (dueDate && !validDay(dueDate)) return res.status(400).json({ error: "The due date isn't a valid date" });
    if (dueDate && dueDate < todayIso()) return res.status(400).json({ error: "The due date is in the past" });

    try {
      const people = await prisma.employees.findMany({
        where: { id: { in: [authorId, ...taggedIds, ...(assigneeId ? [assigneeId] : [])] } },
        select: { id: true, name: true, email: true, terminated: true },
      });
      const byId = new Map(people.map((p) => [p.id, p]));
      const author = byId.get(authorId);
      if (!author) return res.status(400).json({ error: "Unknown author" });
      if (assigneeId) {
        const a = byId.get(assigneeId);
        if (!a) return res.status(400).json({ error: "Unknown assignee" });
        if (a.terminated) return res.status(400).json({ error: `${a.name} no longer works here` });
      }
      const tagged = taggedIds.map((id) => byId.get(id)).filter(Boolean);

      const created = await prisma.notes.create({
        data: {
          body,
          priority,
          entity_type_id: typeId,
          entity_id: entityId,
          author_id: authorId,
          NoteTaggedUsers: { create: tagged.map((u) => ({ tagged_user_id: u.id })) },
          ...(assigneeId && { assignee_id: assigneeId, due_date: toDbDate(dueDate) }),
        },
        include: NOTE_INCLUDE,
      });

      const note = serializeNote(created);
      res.status(201).json(note);

      // After answering, so a slow or failed email never holds up the save.
      const entity = await entityFor(created);
      notifyNoteCreated({
        note: { ...note, _assigneeEmail: created.Assignee?.email, _tagged: tagged },
        actor: author,
        entity,
        link: `${appBase(req)}${entity.path}`,
      }).catch((e) => console.error("Note email failed:", e));
    } catch (error) {
      if (!res.headersSent) prismaError(res, error, "creating note");
      else console.error("After creating note:", error);
    }
  });

  // ── Complete / reopen ──
  const setDone = (done) => async (req, res) => {
    const id = Number(req.params.id);
    const userId = Number(req.body?.user_id);
    if (!userId) return res.status(400).json({ error: "Missing who's doing this" });

    try {
      const note = await loadNote(id);
      if (!note) return res.status(404).json({ error: "Note not found" });
      if (!note.assignee_id) return res.status(400).json({ error: "This note isn't a task" });
      if (userId !== note.assignee_id && userId !== note.author_id) {
        return res.status(403).json({
          error: `Only ${note.Assignee.name} or ${note.Author.name} can ${done ? "complete" : "reopen"} this task`,
        });
      }
      if (done === Boolean(note.completed_at)) {
        return res.json(serializeNote(note)); // already that way (e.g. two tabs open)
      }

      const updated = await prisma.notes.update({
        where: { id },
        data: done
          ? { completed_at: new Date(), completed_by: userId }
          : { completed_at: null, completed_by: null },
        include: NOTE_INCLUDE,
      });
      const out = serializeNote(updated);
      res.json(out);

      const actor = [note.Author, note.Assignee].find((p) => p.id === userId);
      logTask(note, userId, `${done ? "Completed" : "Reopened"} task: ${snippet(note.body)}`);
      if (done) {
        const entity = await entityFor(note);
        notifyCompleted({
          note: out,
          actor,
          people: { author: note.Author, assignee: note.Assignee },
          entity,
          link: `${appBase(req)}${entity.path}`,
        }).catch((e) => console.error("Task email failed:", e));
      }
    } catch (error) {
      if (!res.headersSent) prismaError(res, error, done ? "completing task" : "reopening task");
      else console.error("After updating task:", error);
    }
  };
  router.post("/:id/complete", setDone(true));
  router.post("/:id/reopen", setDone(false));

  // ── Change the due date or reassign ──
  router.patch("/:id/task", async (req, res) => {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const userId = Number(b.user_id);
    const changingDue = "due_date" in b;
    const dueDate = b.due_date || null;
    const newAssigneeId = b.assignee_id != null ? Number(b.assignee_id) : null;

    if (!userId) return res.status(400).json({ error: "Missing who's doing this" });
    if (!changingDue && !newAssigneeId) return res.status(400).json({ error: "Nothing to change" });
    if (dueDate && !validDay(dueDate)) return res.status(400).json({ error: "The due date isn't a valid date" });

    try {
      const note = await loadNote(id);
      if (!note) return res.status(404).json({ error: "Note not found" });
      if (!note.assignee_id) return res.status(400).json({ error: "This note isn't a task" });
      if (note.completed_at) return res.status(400).json({ error: "Reopen the task before changing it" });
      if (userId !== note.assignee_id && userId !== note.author_id) {
        return res.status(403).json({ error: `Only ${note.Assignee.name} or ${note.Author.name} can change this task` });
      }
      const reassigning = newAssigneeId && newAssigneeId !== note.assignee_id;
      if (reassigning && userId !== note.author_id) {
        return res.status(403).json({ error: `Only ${note.Author.name}, who created the task, can reassign it` });
      }
      const oldDue = isoDay(note.due_date);
      if (changingDue && dueDate && dueDate < todayIso() && dueDate !== oldDue) {
        return res.status(400).json({ error: "The due date is in the past" });
      }

      let newAssignee = null;
      if (reassigning) {
        newAssignee = await prisma.employees.findUnique({
          where: { id: newAssigneeId },
          select: { id: true, name: true, email: true, terminated: true },
        });
        if (!newAssignee) return res.status(400).json({ error: "Unknown assignee" });
        if (newAssignee.terminated) return res.status(400).json({ error: `${newAssignee.name} no longer works here` });
      }

      const updated = await prisma.notes.update({
        where: { id },
        data: {
          ...(changingDue && { due_date: toDbDate(dueDate) }),
          ...(reassigning && { assignee_id: newAssigneeId }),
        },
        include: NOTE_INCLUDE,
      });
      const out = serializeNote(updated);
      res.json(out);

      if (changingDue && dueDate !== oldDue) {
        logTask(note, userId, `Task due date: ${dueDate ?? "none"} (${snippet(note.body)})`, oldDue ?? "none");
      }
      if (reassigning) {
        logTask(note, userId, `Task reassigned to ${newAssignee.name} (${snippet(note.body)})`, note.Assignee.name);
        const entity = await entityFor(note);
        notifyReassigned({
          note: { ...out, _assigneeEmail: newAssignee.email },
          actor: note.Author,
          entity,
          link: `${appBase(req)}${entity.path}`,
        }).catch((e) => console.error("Task email failed:", e));
      }
    } catch (error) {
      if (!res.headersSent) prismaError(res, error, "updating task");
      else console.error("After updating task:", error);
    }
  });

  return router;
}
