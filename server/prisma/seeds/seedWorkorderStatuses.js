const workOrderStatuses = [
  { name: "New", color: "#6366F1" }, // indigo — fresh, just entered
  { name: "Sourcing", color: "#F59E0B" }, // amber — actively working on it
  { name: "Sourced", color: "#0EA5E9" }, // sky blue — vendor found
  { name: "Scheduled", color: "#8B5CF6" }, // violet — on the calendar
  { name: "In Progress", color: "#14B8A6" }, // teal — work happening
  { name: "Completed", color: "#22C55E" }, // green — done
  { name: "Reopened", color: "#F97316" }, // orange — back open, attention
  { name: "Cancelled", color: "#6B7280" }, // gray — dead/inactive
  { name: "Requires Proposal", color: "#EAB308" }, // yellow — needs action
  { name: "Waiting Approval", color: "#EC4899" }, // pink — pending on someone
  { name: "Proposal Approved", color: "#10B981" }, // emerald — positive resolution
];

async function seedWorkorderStatuses(prisma) {
  await prisma.workOrderStatuses.createMany({
    data: workOrderStatuses,
  });
}

export default seedWorkorderStatuses;
