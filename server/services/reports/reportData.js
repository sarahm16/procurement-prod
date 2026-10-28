// services/reports/reportData.js
//
// The numbers behind the Reports page. Everything is worked out here from
// the work orders, the sourcing view and the activity log, so the page
// needs no new tables.
//
// Definitions (kept in one place so the page and this file agree):
//   service date    a work order's due date; date ranges filter on it
//   done            status Completed, or any finance-phase status
//   cancelled       status Cancelled
//   open            anything else
//   completed on    the vendor's latest check-out on the work order
//   on time         done, and completed on or before the due date
//   late (open)     open, and the due date has passed
//   reopened        sent back from finance to ops at least once (activity log)
//   revenue / cost  sum of the work order's service client / vendor prices
//   margin %        (revenue − cost) / revenue, priced work orders only,
//                   cancelled ones left out
//   sandbox sites   left out everywhere
import { todayIso } from "../notes/noteData.js";

const WORK_ORDER_TYPE_ID = 4;
export const DONE_STATUS = "Completed";
export const CANCELLED_STATUS = "Cancelled";
export const CLOSED_STATUS = "Closed";

const DAY_MS = 86400000;
const num = (v) => (v == null ? 0 : Number(v));
const round1 = (n) => Math.round(n * 10) / 10;
export const pct = (part, whole) => (whole > 0 ? round1((part / whole) * 100) : null);
const marginPct = (rev, cost) => (rev > 0 ? round1(((rev - cost) / rev) * 100) : null);

/** A timestamp → YYYY-MM-DD in the company's time zone. */
export const dayOf = (d) => (d ? todayIso(new Date(d)) : null);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const WO_SELECT = {
  id: true,
  work_order_number: true,
  type: true,
  phase: true,
  due_date: true,
  created_at: true,
  vendor_id: true,
  Status: { select: { id: true, name: true, phase: true } },
  Site: { select: { id: true, store: true, client_id: true, Client: { select: { client: true } } } },
  Vendor: { select: { company: true } },
  Services: { select: { client_price: true, vendor_price: true } },
  VendorUpdates: { select: { check_out: true } },
};

/** Work orders with everything the reports derive from them. */
function shape(w, today) {
  const status = w.Status?.name ?? null;
  const cancelled = status === CANCELLED_STATUS;
  const done = !cancelled && (status === DONE_STATUS || w.Status?.phase === "finance" || w.phase === "finance");
  const due = dayOf(w.due_date);
  const checkOuts = (w.VendorUpdates ?? []).map((u) => u.check_out).filter(Boolean);
  const completedOn = checkOuts.length ? dayOf(new Date(Math.max(...checkOuts.map((d) => new Date(d).getTime())))) : null;
  const revenue = (w.Services ?? []).reduce((s, x) => s + num(x.client_price), 0);
  const cost = (w.Services ?? []).reduce((s, x) => s + num(x.vendor_price), 0);
  return {
    id: w.id,
    number: w.work_order_number,
    label: `WO ${w.work_order_number}`,
    path: `/workorders/${w.id}`,
    type: w.type || "Unspecified",
    phase: w.phase ?? "ops",
    status,
    status_id: w.Status?.id ?? null,
    due,
    month: due?.slice(0, 7) ?? null,
    client_id: w.Site?.client_id ?? null,
    client: w.Site?.Client?.client ?? "No client",
    site: [w.Site?.Client?.client, w.Site?.store].filter(Boolean).join(" · "),
    vendor_id: w.vendor_id,
    vendor: w.Vendor?.company ?? null,
    revenue,
    cost,
    priced: revenue > 0,
    state: cancelled ? "cancelled" : done ? "done" : "open",
    completed_on: completedOn,
    on_time: done && completedOn && due ? completedOn <= due : null,
    days_late: done && completedOn && due && completedOn > due ? daysBetween(due, completedOn) : 0,
    late_open: !done && !cancelled && Boolean(due && due < today),
    days_overdue: !done && !cancelled && due && due < today ? daysBetween(due, today) : 0,
  };
}

export async function loadWorkOrders(prisma, where, today = todayIso()) {
  const rows = await prisma.workOrders.findMany({
    where: { ...where, Site: { sandbox: false } },
    select: WO_SELECT,
  });
  return rows.map((w) => shape(w, today));
}

/** Work orders whose due date falls in [from, to] (inclusive, YYYY-MM-DD). */
export const inRange = (from, to) => ({
  due_date: { gte: new Date(`${from}T00:00:00Z`), lt: new Date(`${addDays(to, 1)}T00:00:00Z`) },
});

/** id → { reopened: n, finance_since: Date } from phase changes in the activity log. */
async function phaseHistory(prisma, ids) {
  const out = new Map();
  if (!ids.length) return out;
  const logs = await prisma.activityLog.findMany({
    where: { entity_type_id: WORK_ORDER_TYPE_ID, field_changed: "phase", entity_id: { in: ids } },
    select: { entity_id: true, new_value: true, changed_at: true },
  });
  for (const l of logs) {
    const h = out.get(l.entity_id) ?? { reopened: 0, finance_since: null };
    if (l.new_value?.startsWith("ops")) h.reopened += 1;
    if (l.new_value?.startsWith("finance") && (!h.finance_since || l.changed_at > h.finance_since)) {
      h.finance_since = l.changed_at;
    }
    out.set(l.entity_id, h);
  }
  return out;
}

/* ── Margin ─────────────────────────────────────────────────────────── */

function moneyRow(key, list) {
  const priced = list.filter((w) => w.priced && w.state !== "cancelled");
  const revenue = priced.reduce((s, w) => s + w.revenue, 0);
  const cost = priced.reduce((s, w) => s + w.cost, 0);
  return {
    key,
    work_orders: list.filter((w) => w.state !== "cancelled").length,
    priced: priced.length,
    revenue: Math.round(revenue * 100) / 100,
    cost: Math.round(cost * 100) / 100,
    profit: Math.round((revenue - cost) * 100) / 100,
    margin_pct: marginPct(revenue, cost),
  };
}

const groupBy = (list, keyFn) => {
  const m = new Map();
  for (const x of list) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};

/** Every month from `from` to `to`, so empty months show as gaps, not missing bars. */
function monthsBetween(from, to) {
  const out = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ey, em] = to.slice(0, 7).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 60) break;
  }
  return out;
}

function margin(wos, from, to, sourcing) {
  const byMonth = groupBy(wos, (w) => w.month);
  const byType = groupBy(wos, (w) => w.type);
  const byClient = groupBy(wos, (w) => w.client);

  const clients = [...byClient].map(([k, l]) => moneyRow(k, l)).filter((r) => r.revenue > 0);
  clients.sort((a, b) => b.revenue - a.revenue);
  const TOP = 12;
  const topClients = clients.slice(0, TOP);
  if (clients.length > TOP) {
    const rest = clients.slice(TOP);
    const revenue = rest.reduce((s, r) => s + r.revenue, 0);
    const cost = rest.reduce((s, r) => s + r.cost, 0);
    topClients.push({
      key: `Other (${rest.length} clients)`,
      work_orders: rest.reduce((s, r) => s + r.work_orders, 0),
      priced: rest.reduce((s, r) => s + r.priced, 0),
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      profit: Math.round((revenue - cost) * 100) / 100,
      margin_pct: marginPct(revenue, cost),
      other: true,
    });
  }

  // Projected margin on contract lines, from the sourcing view's price totals.
  const lines = groupBy(
    sourcing.filter((r) => num(r.client_price_total) > 0 && num(r.vendor_price_total) > 0),
    (r) => r.service_line,
  );
  const contractLines = [...lines]
    .map(([service_line, rows]) => {
      const part = (status) => {
        const rs = rows.filter((r) => r.line_status === status);
        const rev = rs.reduce((s, r) => s + num(r.client_price_total), 0);
        const cost = rs.reduce((s, r) => s + num(r.vendor_price_total), 0);
        return { lines: rs.length, margin_pct: marginPct(rev, cost) };
      };
      return { service_line, active: part("active"), upcoming: part("upcoming") };
    })
    .sort((a, b) => a.service_line.localeCompare(b.service_line));

  return {
    totals: { ...moneyRow("All", wos), unpriced: wos.filter((w) => !w.priced && w.state !== "cancelled").length },
    by_month: monthsBetween(from, to).map((m) => moneyRow(m, byMonth.get(m) ?? [])),
    by_type: [...byType].map(([k, l]) => moneyRow(k, l)).sort((a, b) => b.revenue - a.revenue),
    by_client: topClients,
    contract_lines: contractLines,
  };
}

/* ── Fulfillment ────────────────────────────────────────────────────── */

function fulfillmentRow(key, list, history) {
  const done = list.filter((w) => w.state === "done");
  const timed = done.filter((w) => w.on_time !== null);
  const onTime = timed.filter((w) => w.on_time);
  const lateDone = timed.filter((w) => !w.on_time);
  const cancelled = list.filter((w) => w.state === "cancelled");
  return {
    key,
    total: list.length,
    done: done.length,
    open: list.filter((w) => w.state === "open").length,
    late_open: list.filter((w) => w.late_open).length,
    cancelled: cancelled.length,
    cancelled_pct: pct(cancelled.length, list.length),
    with_checkout: timed.length,
    no_checkout: done.length - timed.length,
    on_time: onTime.length,
    on_time_pct: pct(onTime.length, timed.length),
    avg_days_late: lateDone.length ? round1(lateDone.reduce((s, w) => s + w.days_late, 0) / lateDone.length) : null,
    reopened: list.filter((w) => (history.get(w.id)?.reopened ?? 0) > 0).length,
  };
}

function fulfillment(wos, history) {
  const byType = groupBy(wos, (w) => w.type);
  return {
    totals: fulfillmentRow("All", wos, history),
    by_type: [...byType].map(([k, l]) => fulfillmentRow(k, l, history)).sort((a, b) => b.total - a.total),
    late_open: wos
      .filter((w) => w.late_open)
      .sort((a, b) => b.days_overdue - a.days_overdue)
      .slice(0, 25)
      .map(({ id, label, path, type, status, site, vendor, due, days_overdue }) => ({
        id,
        label,
        path,
        type,
        status,
        site,
        vendor,
        due,
        days_overdue,
      })),
  };
}

/* ── Sourcing ───────────────────────────────────────────────────────── */

function sourcingReport(rows, today) {
  const soon = addDays(today, 30);
  const stage = (r) => (r.is_sourced ? "sourced" : r.assignment_id ? "in_progress" : "no_vendor");
  const count = (rs) => {
    const c = { total: rs.length, sourced: 0, in_progress: 0, no_vendor: 0, needs_resourcing: 0, starting_soon_unsourced: 0 };
    for (const r of rs) {
      c[stage(r)] += 1;
      if (r.needs_resourcing) c.needs_resourcing += 1;
      if (!r.is_sourced && r.line_status === "upcoming" && r.starts_on && dayOf(r.starts_on) <= soon) {
        c.starting_soon_unsourced += 1;
      }
    }
    c.sourced_pct = pct(c.sourced, c.total);
    return c;
  };

  const bySl = groupBy(rows, (r) => r.service_line);
  const serviceLines = [...bySl]
    .map(([service_line, rs]) => ({
      service_line,
      active: count(rs.filter((r) => r.line_status === "active")),
      upcoming: count(rs.filter((r) => r.line_status === "upcoming")),
    }))
    .sort((a, b) => b.upcoming.total + b.active.total - (a.upcoming.total + a.active.total));

  const unsourcedUpcoming = rows.filter((r) => r.line_status === "upcoming" && !r.is_sourced);
  const byClient = [...groupBy(unsourcedUpcoming, (r) => r.client ?? "No client")]
    .map(([client, rs]) => ({ client, unsourced: rs.length, no_vendor: rs.filter((r) => !r.assignment_id).length }))
    .sort((a, b) => b.unsourced - a.unsourced)
    .slice(0, 12);

  const next = unsourcedUpcoming
    .slice()
    .sort((a, b) => (dayOf(a.starts_on) ?? "9999").localeCompare(dayOf(b.starts_on) ?? "9999"))
    .slice(0, 40)
    .map((r) => ({
      contract_site_id: r.contract_site_id,
      site_id: r.site_id,
      path: `/sites/${r.site_id}`,
      site: [r.client, r.store].filter(Boolean).join(" · "),
      place: [r.mailing_city, r.mailing_state].filter(Boolean).join(", "),
      service_line: r.service_line,
      starts_on: dayOf(r.starts_on),
      vendor: r.company ?? null,
      steps: r.completed_steps ?? 0,
      needs_resourcing: Boolean(r.needs_resourcing),
    }));

  return {
    totals: {
      active: count(rows.filter((r) => r.line_status === "active")),
      upcoming: count(rows.filter((r) => r.line_status === "upcoming")),
    },
    service_lines: serviceLines,
    unsourced_by_client: byClient,
    next_unsourced: next,
  };
}

/* ── Vendors ────────────────────────────────────────────────────────── */

/** notices: false → only vendors with work orders get a row (used for one work order type). */
async function vendorReport(prisma, wos, from, to, { notices: noticeRows = true } = {}) {
  const [notices, live] = await Promise.all([
    prisma.vendorWarnings.findMany({
      where: {
        date_sent: { gte: new Date(`${from}T00:00:00Z`), lt: new Date(`${addDays(to, 1)}T00:00:00Z`) },
        status: { not: "voided" },
      },
      select: { vendor_id: true, notice_type: true, Vendor: { select: { company: true } } },
    }),
    prisma.vendorContractSites.groupBy({
      by: ["vendor_id"],
      where: { VendorSiteStatus: { category: { not: "closed" } } },
      _count: { _all: true },
    }),
  ]);
  const liveBy = new Map(live.map((l) => [l.vendor_id, l._count._all]));

  const rows = new Map();
  const row = (id, company) => {
    if (!rows.has(id)) {
      rows.set(id, {
        vendor_id: id,
        vendor: company,
        path: `/vendors/${id}`,
        wos: [],
        warnings: 0,
        compliance: 0,
        terminations: 0,
      });
    }
    return rows.get(id);
  };
  for (const w of wos) if (w.vendor_id) row(w.vendor_id, w.vendor).wos.push(w);
  for (const n of notices) {
    if (!noticeRows && !rows.has(n.vendor_id)) continue;
    const r = row(n.vendor_id, n.Vendor?.company);
    if (n.notice_type === "warning") r.warnings += 1;
    else if (n.notice_type === "compliance") r.compliance += 1;
    else if (n.notice_type === "termination") r.terminations += 1;
  }

  return [...rows.values()]
    .map(({ wos: list, ...r }) => {
      const f = fulfillmentRow(r.vendor, list, new Map());
      const m = moneyRow(r.vendor, list);
      return {
        ...r,
        live_lines: liveBy.get(r.vendor_id) ?? 0,
        work_orders: f.total,
        done: f.done,
        late_open: f.late_open,
        cancelled: f.cancelled,
        on_time_pct: f.on_time_pct,
        with_checkout: f.with_checkout,
        revenue: m.revenue,
        margin_pct: m.margin_pct,
      };
    })
    .sort((a, b) => b.work_orders - a.work_orders || b.warnings + b.compliance - (a.warnings + a.compliance));
}

/* ── Finance pipeline ───────────────────────────────────────────────── */

/** Finance-phase parents not yet Closed, with days in finance. */
async function loadFinance(prisma, today) {
  const [statuses, wos] = await Promise.all([
    prisma.workOrderStatuses.findMany({
      where: { phase: "finance" },
      select: { id: true, name: true, color: true },
      orderBy: { id: "asc" },
    }),
    loadWorkOrders(prisma, { phase: "finance", parent_work_order_id: null }, today),
  ]);
  const history = await phaseHistory(
    prisma,
    wos.map((w) => w.id),
  );
  const open = wos
    .filter((w) => w.status !== CLOSED_STATUS)
    .map((w) => {
      const since = history.get(w.id)?.finance_since;
      return { ...w, days_in_finance: since ? daysBetween(dayOf(since), today) : null };
    });
  return { statuses, open };
}

function financeReport({ statuses, open }) {
  const byStatus = groupBy(open, (w) => w.status);
  const stages = statuses
    .filter((s) => s.name !== CLOSED_STATUS)
    .map((s) => {
      const list = byStatus.get(s.name) ?? [];
      const days = list.map((w) => w.days_in_finance).filter((d) => d != null);
      return {
        status: s.name,
        color: s.color,
        count: list.length,
        revenue: Math.round(list.reduce((t, w) => t + w.revenue, 0) * 100) / 100,
        avg_days: days.length ? round1(days.reduce((a, b) => a + b, 0) / days.length) : null,
        max_days: days.length ? Math.max(...days) : null,
      };
    });

  return {
    totals: {
      count: open.length,
      revenue: Math.round(open.reduce((t, w) => t + w.revenue, 0) * 100) / 100,
    },
    stages,
    oldest: open
      .filter((w) => w.days_in_finance != null)
      .sort((a, b) => b.days_in_finance - a.days_in_finance)
      .slice(0, 25)
      .map(({ id, label, path, status, site, revenue, days_in_finance, due }) => ({
        id,
        label,
        path,
        status,
        site,
        revenue,
        days_in_finance,
        due,
      })),
  };
}

/* ── Summary: everything that follows the date range ────────────────── */

/* ── Work order types: one scorecard row per type ───────────────────── */

/**
 * The scorecard upper management compares side by side. Always built from
 * every type (the type filter only highlights a row).
 *   inRange   work orders due in the date range (with reopen history)
 *   opsNow    every ops-phase work order, for open / late right now
 *   finance   finance pipeline right now
 */
function typeScorecard({ inRangeWos, history, opsNow, finance, types, from, to }) {
  const months = monthsBetween(from, to);
  const range = groupBy(inRangeWos, (w) => w.type);
  const open = groupBy(
    opsNow.filter((w) => w.state === "open"),
    (w) => w.type,
  );
  const fin = groupBy(finance.open, (w) => w.type);

  const names = [...new Set([...types, ...range.keys(), ...open.keys(), ...fin.keys()])];
  return names
    .map((type) => {
      const list = range.get(type) ?? [];
      const f = fulfillmentRow(type, list, history);
      const m = moneyRow(type, list);
      const byMonth = groupBy(list, (w) => w.month);
      const openList = open.get(type) ?? [];
      const finList = fin.get(type) ?? [];
      const finDays = finList.map((w) => w.days_in_finance).filter((d) => d != null);
      return {
        type,
        // in the date range
        work_orders: f.total,
        done: f.done,
        revenue: m.revenue,
        profit: m.profit,
        margin_pct: m.margin_pct,
        on_time_pct: f.on_time_pct,
        with_checkout: f.with_checkout,
        avg_days_late: f.avg_days_late,
        cancelled_pct: f.cancelled_pct,
        reopened: f.reopened,
        margin_by_month: months.map((k) => moneyRow(k, byMonth.get(k) ?? []).margin_pct),
        // right now
        open_now: openList.length,
        late_now: openList.filter((w) => w.late_open).length,
        finance_count: finList.length,
        finance_revenue: Math.round(finList.reduce((t, w) => t + w.revenue, 0) * 100) / 100,
        finance_avg_days: finDays.length ? round1(finDays.reduce((a, b) => a + b, 0) / finDays.length) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.open_now - a.open_now || a.type.localeCompare(b.type));
}

/** Every work order type in use, for the type filter. */
async function workOrderTypes(prisma) {
  const rows = await prisma.workOrders.findMany({
    where: { Site: { sandbox: false } },
    distinct: ["type"],
    select: { type: true },
  });
  return rows.map((r) => r.type || "Unspecified").sort((a, b) => a.localeCompare(b));
}

/* ── Summary: everything that follows the date range ────────────────── */

/**
 * type (optional): one work order type. Every work order figure
 * is limited to it; sourcing isn't (contract lines have no work order type).
 */
export async function buildSummary(prisma, { from, to, type }) {
  const today = todayIso();
  const [allInRange, sourcingRows, financeAll, opsNow, types] = await Promise.all([
    loadWorkOrders(prisma, inRange(from, to), today),
    prisma.sourcingGrid.findMany(),
    loadFinance(prisma, today),
    loadWorkOrders(prisma, { phase: "ops" }, today),
    workOrderTypes(prisma),
  ]);
  const history = await phaseHistory(
    prisma,
    allInRange.map((w) => w.id),
  );

  const only = (list) => (type ? list.filter((w) => w.type === type) : list);
  const wos = only(allInRange);
  const finance = { ...financeAll, open: only(financeAll.open) };

  return {
    from,
    to,
    today,
    type: type ?? null,
    types,
    type_scorecard: typeScorecard({ inRangeWos: allInRange, history, opsNow, finance: financeAll, types, from, to }),
    margin: margin(wos, from, to, sourcingRows),
    fulfillment: fulfillment(wos, history),
    sourcing: sourcingReport(sourcingRows, today),
    vendors: await vendorReport(prisma, wos, from, to, { notices: !type }),
    finance: financeReport(finance),
  };
}

/* ── Workload: open work, now (no date range) ───────────────────────── */

/**
 * type (optional): only that type's work orders, and only the people on
 * them. Tasks aren't tied to a work order type, so a person's task counts are all
 * of their tasks.
 */
export async function buildWorkload(prisma, { roleId, type } = {}) {
  const today = todayIso();
  const [opsStatuses, wos, roles, openTasks] = await Promise.all([
    prisma.workOrderStatuses.findMany({ where: { phase: "ops" }, select: { name: true }, orderBy: { id: "asc" } }),
    loadWorkOrders(prisma, { phase: "ops" }, today),
    prisma.internalRoles.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.notes.findMany({
      where: { assignee_id: { not: null }, completed_at: null },
      select: { assignee_id: true, due_date: true, Assignee: { select: { id: true, name: true } } },
    }),
  ]);

  const open = wos.filter((w) => w.state === "open" && (!type || w.type === type));
  const columns = opsStatuses
    .map((s) => s.name)
    .filter((n) => n !== DONE_STATUS && n !== CANCELLED_STATUS)
    .filter((n) => open.some((w) => w.status === n));

  const assignments = open.length
    ? await prisma.roleAssignments.findMany({
        where: {
          entity_type_id: WORK_ORDER_TYPE_ID,
          entity_id: { in: open.map((w) => w.id) },
          ...(roleId && { internal_role_id: roleId }),
        },
        select: { entity_id: true, Employee: { select: { id: true, name: true, terminated: true } } },
      })
    : [];

  const people = new Map();
  const person = (e) => {
    if (!people.has(e.id)) {
      people.set(e.id, {
        employee_id: e.id,
        name: e.name,
        terminated: Boolean(e.terminated),
        wo_ids: new Set(),
        by_status: {},
        open_work_orders: 0,
        late_work_orders: 0,
        open_tasks: 0,
        overdue_tasks: 0,
      });
    }
    return people.get(e.id);
  };

  const byId = new Map(open.map((w) => [w.id, w]));
  const covered = new Set();
  for (const a of assignments) {
    const w = byId.get(a.entity_id);
    const p = person(a.Employee);
    if (!w || p.wo_ids.has(w.id)) continue;
    p.wo_ids.add(w.id);
    covered.add(w.id);
    p.open_work_orders += 1;
    p.by_status[w.status] = (p.by_status[w.status] ?? 0) + 1;
    if (w.late_open) p.late_work_orders += 1;
  }
  for (const t of openTasks) {
    if (!t.Assignee) continue;
    const p = person(t.Assignee);
    p.open_tasks += 1;
    if (t.due_date && dayOf(t.due_date) < today) p.overdue_tasks += 1;
  }

  const unassigned = open.filter((w) => !covered.has(w.id));
  const unassignedRow = {
    employee_id: null,
    name: roleId ? "No one in this role" : "No one assigned",
    by_status: {},
    open_work_orders: unassigned.length,
    late_work_orders: unassigned.filter((w) => w.late_open).length,
    open_tasks: null,
    overdue_tasks: null,
  };
  for (const w of unassigned) unassignedRow.by_status[w.status] = (unassignedRow.by_status[w.status] ?? 0) + 1;

  return {
    today,
    type: type ?? null,
    role_id: roleId ?? null,
    roles,
    columns,
    totals: { open: open.length, late: open.filter((w) => w.late_open).length, unassigned: unassigned.length },
    people: [...people.values()]
      .filter((p) => !p.terminated || p.open_work_orders || p.open_tasks)
      // For one type, list the people working on it (their task counts still show).
      .filter((p) => !type || p.open_work_orders > 0)
      .map(({ wo_ids, ...p }) => p)
      .sort((a, b) => b.open_work_orders - a.open_work_orders || b.open_tasks - a.open_tasks || a.name.localeCompare(b.name)),
    unassigned: unassignedRow,
  };
}
