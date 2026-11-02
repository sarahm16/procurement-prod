// services/reports/pillars.js
//
// The company's three pillars, and how records map to them. Change the
// matching here; nothing else in the reports hard-codes it.
//
//   Planned Maintenance   contract service lines (snow, landscaping). Its work
//                         orders run in UtilizeCore; this app manages the
//                         vendors, documents and pricing. Each site line is
//                         either subcontracted or self-performed
//                         (ContractSites.self_perform).
//   On Demand             every work order type except Project
//   Projects              work orders of type Project

export const PILLARS = [
  { key: "planned_maintenance", label: "Planned Maintenance" },
  { key: "on_demand", label: "On Demand" },
  { key: "projects", label: "Projects" },
];

/** Filter values the Reports page sends. The two "pm_" ones are slices of Planned Maintenance. */
export const PILLAR_FILTERS = ["planned_maintenance", "pm_subcontracted", "pm_self", "on_demand", "projects"];

/** Service lines that make up Planned Maintenance (matched on the start of the name). */
const PM_SERVICE_LINES = [/^snow/i, /^landscap/i];
export const isPmServiceLine = (name) => PM_SERVICE_LINES.some((re) => re.test(String(name ?? "").trim()));

/** Work order types that are Projects; everything else is On Demand. */
const PROJECT_TYPES = ["project", "projects"];
export const woPillar = (type) => (PROJECT_TYPES.includes(String(type ?? "").trim().toLowerCase()) ? "projects" : "on_demand");

/** Does a work order pillar fall under a filter value? PM filters match none: those work orders live in UtilizeCore. */
export const woMatchesFilter = (pillar, filter) => !filter || pillar === filter;

/** Does a sourcing-grid row fall under a filter value? Only PM filters apply to contract lines. */
export function lineMatchesFilter(row, filter) {
  if (!filter) return true;
  if (!isPmServiceLine(row.service_line)) return false;
  if (filter === "pm_subcontracted") return !row.self_perform;
  if (filter === "pm_self") return Boolean(row.self_perform);
  return filter === "planned_maintenance";
}

export const isPmFilter = (f) => f === "planned_maintenance" || f === "pm_subcontracted" || f === "pm_self";
