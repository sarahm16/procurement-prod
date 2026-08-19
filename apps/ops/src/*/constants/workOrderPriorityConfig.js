// constants/workOrderPriorityConfig.js
export const workOrderPriorityConfig = {
  "P-1": {
    label: "P-1",
    sla: "4 hour SLA",
    color: "#DC2626", // red — most urgent, 4hr
    bg: "#FEF2F2",
  },
  "P-2": {
    label: "P-2",
    sla: "24 hour SLA",
    color: "#EA580C", // orange — urgent, 24hr
    bg: "#FFF7ED",
  },
  "P-3": {
    label: "P-3",
    sla: "72 hour SLA",
    color: "#CA8A04", // amber — moderate, 72hr
    bg: "#FEFCE8",
  },
  "P-4": {
    label: "P-4",
    sla: "Planned project/CAPEX project",
    color: "#2563EB", // blue — planned, no rush
    bg: "#EFF6FF",
  },
};
