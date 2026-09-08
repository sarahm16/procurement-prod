const siteStatusColors = {
  Unassigned: "#94A3B8", // slate gray — neutral, not yet started
  Sourcing: "#3B82F6", // blue — actively in progress
  Active: "#22C55E", // green — good, operational
  "On Hold": "#F59E0B", // amber — temporarily paused, needs attention
  Paused: "#F97316", // orange — paused (distinct from on-hold)
  Archived: "#6B7280", // gray — inactive, closed out
};

async function seedSiteStatuses(prisma) {
  await prisma.SiteStatuses.createMany({
    data: Object.entries(siteStatusColors).map(([status, color]) => ({
      name: status,
      color,
      description: "",
    })),
  });
}

export default seedSiteStatuses;
