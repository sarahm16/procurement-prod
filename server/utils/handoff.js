// utils/handoff.js
//
// Shared helpers for the contract handoff (CEO's Job Handoff Standards deck):
// dates, business days, the HandoffRules table and which kind of job a
// contract is.

/** Dates out as "YYYY-MM-DD" — a Date would show the previous day in Pacific. */
export const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** "YYYY-MM-DD" (or a Date) → Date at UTC midnight, for a @db.Date column. */
export const toDate = (v) => {
  if (v == null || v === "") return null;
  const d = new Date(
    `${String(v instanceof Date ? ymd(v) : v).slice(0, 10)}T00:00:00Z`,
  );
  return Number.isNaN(d.getTime()) ? undefined : d; // undefined = invalid
};

/** Today in Pacific time, as a Date at UTC midnight. */
export const todayPacific = () => {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
  return new Date(`${s}T00:00:00Z`);
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** `n` business days after `date` (weekends skipped; no holiday calendar). */
export const addBusinessDays = (date, n) => {
  let d = new Date(date);
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (!isWeekend(d)) left -= 1;
  }
  return d;
};

/**
 * (For work orders.) The last day of a run of `days` production days starting on `start`,
 * skipping weekends. A start on a weekend rolls to Monday first.
 */
export const productionFinish = (start, days) => {
  if (!start || !days || days < 1) return null;
  let d = new Date(start);
  while (isWeekend(d)) d = addDays(d, 1);
  return addBusinessDays(d, days - 1);
};

/** ceil(value ÷ rate), or null when either is missing. */
export const productionDaysFor = (value, rate) => {
  const v = Number(value);
  const r = Number(rate);
  return v > 0 && r > 0 ? Math.ceil(v / r) : null;
};

/**
 * Which kind of job a service type is. The deck's rules differ by kind:
 * deposit, lead time and production days are project-only; PM work lives in
 * UtilizeCore, everything else in Sarlacc.
 *
 * Keyed on ServiceTypes.name ("Projects", "On Demand", "Planned
 * Maintenance"). A renamed or new service type returns null, which the page
 * treats as "show everything".
 */
const KIND_BY_SERVICE_TYPE = {
  projects: "project",
  "on demand": "on_demand",
  "planned maintenance": "planned_maintenance",
};

export const handoffKind = (serviceTypeName) =>
  KIND_BY_SERVICE_TYPE[
    String(serviceTypeName ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, " ")
  ] ?? null;

export const isAsphalt = (serviceLineName) =>
  /asphalt/i.test(String(serviceLineName ?? ""));

/** HandoffRules as { key: value } with numbers parsed where they look like numbers. */
export const loadHandoffRules = async (db) => {
  const rows = await db.handoffRules.findMany();
  return Object.fromEntries(
    rows.map((r) => [
      r.key,
      /^-?\d+(\.\d+)?$/.test(r.value.trim()) ? Number(r.value) : r.value,
    ]),
  );
};

/** How each kind of job is invoiced unless the contract says otherwise. */
export const BILLING_TRIGGERS = [
  "upon_completion",
  "deposit_and_completion",
  "monthly",
  "per_visit",
];
const DEFAULT_BILLING = {
  project: "deposit_and_completion", // the deck: 50% deposit, 50% at completion
  on_demand: "upon_completion",
  planned_maintenance: "monthly",
};

/**
 * The handoff defaults a new contract starts with, from the rules and the
 * kind of job. Only fields the caller didn't send are filled.
 */
export const handoffDefaults = (rules, { kind } = {}) => {
  const out = {};
  const set = (k, v) => {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  };
  set("sub_budget_percent", rules.sub_budget_percent);
  set("target_margin_percent", rules.target_margin_percent);
  set("deposit_percent", rules.deposit_percent);
  set("lead_time_days", rules.lead_time_days);
  set("sub_award_business_days", rules.sub_award_business_days);
  set("update_cadence", rules.update_cadence);
  set("billing_trigger", DEFAULT_BILLING[kind] ?? "upon_completion");
  return out;
};

/** The id of our internal system for a kind of job (UtilizeCore for PM). */
export const internalSystemIdFor = async (db, kind) => {
  const name = kind === "planned_maintenance" ? "UtilizeCore" : "Sarlacc";
  const row = await db.softwares.findFirst({
    where: { name, is_internal: true },
    select: { id: true },
  });
  return row?.id ?? null;
};
