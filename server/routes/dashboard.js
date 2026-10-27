/**
 * The signed-in person's dashboard.
 *
 *   GET /api/dashboard/assignments?user_id=7
 *
 * Every work order, site, client and vendor the person is on through a role
 * assignment (Team card), whatever the role, with the role names, the
 * record's status, and how many open tasks they have on it.
 *
 *   {
 *     today,
 *     counts: { workorders, sites, clients, vendors },   // open work orders only
 *     workorders: [{ id, label, sublabel, path, roles, status: { name, color }, phase,
 *                    start_date, due_date, late, closed, my_open_tasks }],
 *     sites:      [{ id, label, sublabel, path, roles, status, my_open_tasks }],
 *     clients:    [{ … status, paused }],
 *     vendors:    [{ … status: { name, color } }],
 *   }
 *
 * Mount: app.use("/api/dashboard", dashboardRouter(prisma));
 */
import { Router } from "express";
import { entityPath, isoDay, todayIso } from "../services/notes/noteData.js";

const T = { vendors: 1, sites: 2, clients: 3, workorders: 4 };

// Work orders in these statuses are finished and hidden unless asked for.
const CLOSED_STATUSES = ["Closed", "Cancelled"];
// …and in these, the due date no longer matters.
const NOT_LATE_STATUSES = [...CLOSED_STATUSES, "Completed"];

const byLabel = (a, b) => a.label.localeCompare(b.label);
const place = (city, state) => [city, state].filter(Boolean).join(", ") || null;

export default function dashboardRouter(prisma) {
  const router = Router();

  router.get("/assignments", async (req, res) => {
    const userId = Number(req.query.user_id);
    if (!userId) return res.status(400).json({ error: "Missing user_id" });

    try {
      const [assignments, openTasks] = await Promise.all([
        prisma.roleAssignments.findMany({
          where: { employee_id: userId, entity_type_id: { in: Object.values(T) } },
          select: { entity_type_id: true, entity_id: true, Role: { select: { name: true } } },
        }),
        prisma.notes.findMany({
          where: { assignee_id: userId, completed_at: null },
          select: { entity_type_id: true, entity_id: true },
        }),
      ]);

      // entity → role names, and entity → my open task count
      const roles = new Map();
      const ids = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
      for (const a of assignments) {
        const key = `${a.entity_type_id}:${a.entity_id}`;
        if (!roles.has(key)) roles.set(key, new Set());
        if (a.Role?.name) roles.get(key).add(a.Role.name);
        ids[a.entity_type_id].add(a.entity_id);
      }
      const tasks = new Map();
      for (const n of openTasks) {
        const key = `${n.entity_type_id}:${n.entity_id}`;
        tasks.set(key, (tasks.get(key) ?? 0) + 1);
      }
      const extras = (t, id) => ({
        id,
        path: entityPath(t, id),
        roles: [...(roles.get(`${t}:${id}`) ?? [])].sort(),
        my_open_tasks: tasks.get(`${t}:${id}`) ?? 0,
      });
      const list = (t) => [...ids[t]];

      const [workOrders, sites, siteStatus, clients, clientStatus, vendors] = await Promise.all([
        ids[4].size
          ? prisma.workOrders.findMany({
              where: { id: { in: list(4) } },
              select: {
                id: true,
                work_order_number: true,
                phase: true,
                start_date: true,
                due_date: true,
                Status: { select: { name: true, color: true } },
                Site: { select: { store: true, Client: { select: { client: true } } } },
              },
            })
          : [],
        ids[2].size
          ? prisma.sites.findMany({
              where: { id: { in: list(2) } },
              select: {
                id: true,
                store: true,
                mailing_city: true,
                mailing_state: true,
                Client: { select: { client: true } },
              },
            })
          : [],
        ids[2].size ? prisma.siteStatus.findMany({ where: { site_id: { in: list(2) } } }) : [],
        ids[3].size
          ? prisma.clients.findMany({
              where: { id: { in: list(3) } },
              select: { id: true, client: true, mailing_city: true, mailing_state: true },
            })
          : [],
        ids[3].size ? prisma.clientStatus.findMany({ where: { client_id: { in: list(3) } } }) : [],
        ids[1].size
          ? prisma.vendors.findMany({
              where: { id: { in: list(1) } },
              select: {
                id: true,
                company: true,
                mailing_city: true,
                mailing_state: true,
                VendorStatus: { select: { name: true, color: true } },
              },
            })
          : [],
      ]);

      const today = todayIso();

      const workorders = workOrders
        .map((w) => {
          const status = w.Status ? { name: w.Status.name, color: w.Status.color } : null;
          const due = isoDay(w.due_date);
          const closed = CLOSED_STATUSES.includes(status?.name);
          return {
            ...extras(T.workorders, w.id),
            label: `WO ${w.work_order_number}`,
            sublabel: [w.Site?.Client?.client, w.Site?.store].filter(Boolean).join(" · ") || null,
            status,
            phase: w.phase ?? "ops",
            start_date: isoDay(w.start_date),
            due_date: due,
            closed,
            late: Boolean(due && due < today && !NOT_LATE_STATUSES.includes(status?.name)),
          };
        })
        // open first; then late, then soonest due
        .sort(
          (a, b) =>
            Number(a.closed) - Number(b.closed) ||
            Number(b.late) - Number(a.late) ||
            (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
            a.label.localeCompare(b.label),
        );

      const siteStatusById = new Map(siteStatus.map((s) => [s.site_id, s.status]));
      const sitesOut = sites
        .map((s) => ({
          ...extras(T.sites, s.id),
          label: [s.Client?.client, s.store].filter(Boolean).join(" · ") || `Site #${s.id}`,
          sublabel: place(s.mailing_city, s.mailing_state),
          status: siteStatusById.get(s.id) ?? null,
        }))
        .sort(byLabel);

      const clientStatusById = new Map(clientStatus.map((c) => [c.client_id, c]));
      const clientsOut = clients
        .map((c) => {
          const st = clientStatusById.get(c.id);
          return {
            ...extras(T.clients, c.id),
            label: c.client,
            sublabel: place(c.mailing_city, c.mailing_state),
            status: st?.status ?? null,
            paused: Boolean(st?.paused_at),
          };
        })
        .sort(byLabel);

      const vendorsOut = vendors
        .map((v) => ({
          ...extras(T.vendors, v.id),
          label: v.company,
          sublabel: place(v.mailing_city, v.mailing_state),
          status: v.VendorStatus ? { name: v.VendorStatus.name, color: v.VendorStatus.color } : null,
        }))
        .sort(byLabel);

      res.json({
        today,
        counts: {
          workorders: workorders.filter((w) => !w.closed).length,
          sites: sitesOut.length,
          clients: clientsOut.length,
          vendors: vendorsOut.length,
        },
        workorders,
        sites: sitesOut,
        clients: clientsOut,
        vendors: vendorsOut,
      });
    } catch (e) {
      console.error("Error loading dashboard assignments:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
