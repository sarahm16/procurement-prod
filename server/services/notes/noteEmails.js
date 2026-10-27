// services/notes/noteEmails.js
//
// Emails for notes and tasks, sent from the server (they used to go from the
// browser). One email per person, never to the person who did the thing.
//
//   tagged        "Sarah tagged you in a note on Costco · Store 307"
//   assigned      "Sarah assigned you a task on WO 10452 · due Fri, Oct 30"
//   reassigned    same email, to the new assignee
//   completed     "Mike completed your task on …" to the creator
//                 (or "Sarah closed your task …" to the assignee)
//
// Call without awaiting so a mail problem never fails the save:
//   notifyNoteCreated(...).catch((e) => console.error("Note email failed:", e));
import { sendMail } from "../mail.js";
import { formatDay } from "./noteData.js";

const PRIORITY_STYLE = {
  Low: { color: "#4caf50", bg: "#f1f8f1" },
  Normal: { color: "#ff9800", bg: "#fff8f0" },
  High: { color: "#f44336", bg: "#fdf1f0" },
};

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/** Same look as the old browser-sent note email. */
function layout({ kind, label, intro, priority, body, facts = [], link, linkText, footer }) {
  const p = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.Low;
  const factRows = facts
    .map(
      ([k, v]) => `
              <tr>
                <td style="padding:4px 12px 4px 0;font-size:12px;color:#6b7280;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
                <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${v}</td>
              </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1a1a2e;padding:20px 28px;">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:1px;color:#9a9ab0;text-transform:uppercase;">${esc(kind)}</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#ffffff;">${esc(label)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">${intro}</p>
            <p style="margin:0 0 20px;">
              <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;color:${p.color};background:${p.bg};border:1px solid ${p.color}33;">
                ${esc(priority || "Low")} Priority
              </span>
            </p>
            ${
              factRows
                ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${factRows}</table>`
                : ""
            }
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 6px 6px 0;padding:14px 16px;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap;">${esc(body)}</p>
                </td>
              </tr>
            </table>
            ${
              link
                ? `<table cellpadding="0" cellspacing="0" style="margin-top:24px;">
              <tr>
                <td style="background:#1976d2;border-radius:6px;">
                  <a href="${esc(link)}" style="display:inline-block;padding:10px 22px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(linkText)} →</a>
                </td>
              </tr>
            </table>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:14px 28px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">${esc(footer)} Do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const dueText = (iso) => (iso ? formatDay(iso) : "No due date");

/** Send to each person once, skipping blanks; resolves to { sent, failed }. */
async function sendEach(messages) {
  const seen = new Set();
  const list = messages.filter((m) => {
    const key = m.to?.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const results = await Promise.allSettled(list.map((m) => sendMail(m)));
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.error("Note email failed:", r.reason?.message ?? r.reason));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, failed: results.length - sent };
}

const withPriority = (subject, priority) => (priority === "High" ? `[High] ${subject}` : subject);

function assignedEmail({ note, actor, entity, link }) {
  const t = note.task;
  return {
    to: note._assigneeEmail,
    subject: withPriority(
      `${actor.name} assigned you a task on ${entity.label}${t.due_date ? ` · due ${formatDay(t.due_date)}` : ""}`,
      note.priority,
    ),
    html: layout({
      kind: entity.kind,
      label: entity.label,
      intro: `<strong style="color:#111827;">${esc(actor.name)}</strong> assigned you a task`,
      priority: note.priority,
      body: note.body,
      facts: [["Due", esc(dueText(t.due_date))]],
      link,
      linkText: `Open ${entity.kind.toLowerCase()}`,
      footer: "You received this because a task was assigned to you.",
    }),
  };
}

/**
 * After a note is saved: tag emails, plus the assignment email if it's a task.
 *   note:  serialized note (serializeNote) with _assigneeEmail and _tagged [{name,email,id}]
 *   actor: { id, name }
 */
export function notifyNoteCreated({ note, actor, entity, link }) {
  const messages = [];
  const assigneeId = note.task?.assignee_id;

  if (assigneeId && assigneeId !== actor.id) messages.push(assignedEmail({ note, actor, entity, link }));

  for (const u of note._tagged ?? []) {
    if (u.id === actor.id || u.id === assigneeId) continue; // the assignee already got the task email
    messages.push({
      to: u.email,
      subject: withPriority(`${actor.name} tagged you in a note on ${entity.label}`, note.priority),
      html: layout({
        kind: entity.kind,
        label: entity.label,
        intro: `<strong style="color:#111827;">${esc(actor.name)}</strong> tagged you in a note${
          note.task ? ` (a task for ${esc(note.task.assignee_name)})` : ""
        }`,
        priority: note.priority,
        body: note.body,
        link,
        linkText: `View ${entity.kind.toLowerCase()}`,
        footer: "You received this because you were tagged in a note.",
      }),
    });
  }
  return sendEach(messages);
}

/** Task moved to someone new. */
export function notifyReassigned({ note, actor, entity, link }) {
  if (note.task.assignee_id === actor.id) return Promise.resolve({ sent: 0, failed: 0 });
  return sendEach([assignedEmail({ note, actor, entity, link })]);
}

/**
 * Task marked done. Whoever of creator / assignee didn't close it hears about it.
 *   people: { author: {id,name,email}, assignee: {id,name,email} }
 */
export function notifyCompleted({ note, actor, people, entity, link }) {
  const byAssignee = actor.id === people.assignee.id;
  const to = byAssignee ? people.author : people.assignee;
  if (!to || to.id === actor.id) return Promise.resolve({ sent: 0, failed: 0 });

  return sendEach([
    {
      to: to.email,
      subject: byAssignee
        ? `${actor.name} completed your task on ${entity.label}`
        : `${actor.name} closed your task on ${entity.label}`,
      html: layout({
        kind: entity.kind,
        label: entity.label,
        intro: byAssignee
          ? `<strong style="color:#111827;">${esc(actor.name)}</strong> completed the task you assigned`
          : `<strong style="color:#111827;">${esc(actor.name)}</strong> marked your task as done, so there's nothing more you need to do`,
        priority: note.priority,
        body: note.body,
        facts: [
          ["Assigned to", esc(people.assignee.name)],
          ["Was due", esc(dueText(note.task.due_date))],
        ],
        link,
        linkText: `Open ${entity.kind.toLowerCase()}`,
        footer: byAssignee
          ? "You received this because you assigned this task."
          : "You received this because this task was assigned to you.",
      }),
    },
  ]);
}
