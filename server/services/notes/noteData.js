// services/notes/noteData.js
//
// Shared pieces for notes and the tasks that ride on them.
//
// A task is a note with an assignee. It has an optional due date and is done
// once completed_at is set. One person per task; anyone can still be tagged
// on the note just to be kept in the loop.

export const PRIORITIES = ["Low", "Normal", "High"];

/** URL segment for each entity type (matches the frontend's ENTITY_TYPES). */
export const ENTITY_SEGMENTS = {
  1: "vendors",
  2: "sites",
  3: "clients",
  4: "workorders",
  5: "contracts",
};

export const ENTITY_KINDS = {
  1: "Vendor",
  2: "Site",
  3: "Client",
  4: "Work order",
  5: "Contract",
};

const PERSON = { select: { id: true, name: true, email: true } };

export const NOTE_INCLUDE = {
  Author: PERSON,
  NoteTaggedUsers: { include: { TaggedUser: PERSON } },
  Assignee: PERSON,
  CompletedBy: PERSON,
};

/**
 * Today's date as YYYY-MM-DD in the company's time zone, so "due today"
 * and "overdue" don't flip at 7pm Eastern because the server runs on UTC.
 * .env: APP_TIME_ZONE (default America/New_York)
 */
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIME_ZONE || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Date-only column → "YYYY-MM-DD" (no time-zone shift). */
export const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** "2026-10-30" → "Fri, Oct 30" */
export function formatDay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** open | overdue | done */
export function taskStatus(note, today = todayIso()) {
  if (!note.assignee_id) return null;
  if (note.completed_at) return "done";
  const due = isoDay(note.due_date);
  return due && due < today ? "overdue" : "open";
}

export function entityPath(typeId, id) {
  const seg = ENTITY_SEGMENTS[typeId];
  return seg ? `/${seg}/${id}` : null;
}

/** OPS_APP_URL, or the browser's origin for the request as a fallback. */
export function appBase(req) {
  return (process.env.OPS_APP_URL || req?.get?.("origin") || "").replace(/\/+$/, "");
}

/**
 * Names for the records notes are on, e.g. "Costco · Store 307".
 *   items: [{ entity_type_id, entity_id }]
 *   → Map("4:123" → { kind, label, sublabel, path })
 * A type that fails to load falls back to "Work order #123" rather than
 * failing the whole request.
 */
export async function entityLabels(prisma, items) {
  const byType = new Map();
  for (const { entity_type_id: t, entity_id: id } of items) {
    if (!byType.has(t)) byType.set(t, new Set());
    byType.get(t).add(id);
  }

  const loaders = {
    1: (ids) =>
      prisma.vendors
        .findMany({ where: { id: { in: ids } }, select: { id: true, company: true } })
        .then((rows) => rows.map((r) => [r.id, r.company, null])),
    2: (ids) =>
      prisma.sites
        .findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            store: true,
            mailing_city: true,
            mailing_state: true,
            Client: { select: { client: true } },
          },
        })
        .then((rows) =>
          rows.map((r) => [
            r.id,
            [r.Client?.client, r.store].filter(Boolean).join(" · ") || `Site #${r.id}`,
            [r.mailing_city, r.mailing_state].filter(Boolean).join(", ") || null,
          ]),
        ),
    3: (ids) =>
      prisma.clients
        .findMany({ where: { id: { in: ids } }, select: { id: true, client: true } })
        .then((rows) => rows.map((r) => [r.id, r.client, null])),
    4: (ids) =>
      prisma.workOrders
        .findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            work_order_number: true,
            Site: { select: { store: true, Client: { select: { client: true } } } },
          },
        })
        .then((rows) =>
          rows.map((r) => [
            r.id,
            `WO ${r.work_order_number}`,
            [r.Site?.Client?.client, r.Site?.store].filter(Boolean).join(" · ") || null,
          ]),
        ),
    5: (ids) =>
      prisma.contracts
        .findMany({
          where: { id: { in: ids } },
          select: { id: true, project_name: true, Client: { select: { client: true } } },
        })
        .then((rows) => rows.map((r) => [r.id, r.project_name, r.Client?.client ?? null])),
  };

  const out = new Map();
  await Promise.all(
    [...byType].map(async ([t, idSet]) => {
      const ids = [...idSet];
      let rows = [];
      try {
        rows = (await loaders[t]?.(ids)) ?? [];
      } catch (e) {
        console.error(`Couldn't load names for entity type ${t}:`, e.message);
      }
      const found = new Map(rows.map(([id, label, sub]) => [id, { label, sublabel: sub }]));
      for (const id of ids) {
        const f = found.get(id);
        out.set(`${t}:${id}`, {
          kind: ENTITY_KINDS[t] ?? "Record",
          label: f?.label || `${ENTITY_KINDS[t] ?? "Record"} #${id}`,
          sublabel: f?.sublabel ?? null,
          path: entityPath(t, id),
        });
      }
    }),
  );
  return out;
}

/**
 * A note as the notes panel and the dashboard read it. Keeps the fields the
 * panel already used (author_name, date, body, priority, tagged_users) and
 * adds `task` (null for a plain note).
 */
export function serializeNote(note, { today = todayIso(), entity } = {}) {
  const tagged = (note.NoteTaggedUsers ?? []).map((t) => t.TaggedUser).filter(Boolean);
  return {
    id: note.id,
    body: note.body,
    date: note.date ?? note.created_at,
    priority: note.priority,
    entity_type_id: note.entity_type_id,
    entity_id: note.entity_id,
    author_id: note.author_id,
    author_name: note.Author?.name ?? null,
    tagged_users: tagged.map((u) => u.name),
    tagged_user_ids: tagged.map((u) => u.id),
    task: note.assignee_id
      ? {
          assignee_id: note.assignee_id,
          assignee_name: note.Assignee?.name ?? null,
          due_date: isoDay(note.due_date),
          completed_at: note.completed_at ?? null,
          completed_by: note.completed_by ?? null,
          completed_by_name: note.CompletedBy?.name ?? null,
          status: taskStatus(note, today),
        }
      : null,
    ...(entity && { entity }),
  };
}
