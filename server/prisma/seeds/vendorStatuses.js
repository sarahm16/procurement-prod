const vendorStatuses = {
  Lead: "#5DADE2",
  "Lead - Form": "#00008b",
  "Lead - DNC": "#8B0000",
  Sourcing: "#FFCC00",
  Onboarded: "#009500ff",
  Active: "#58D68D",
  Paused: "#F39C12",
  Inactive: "#95A5A6",
  Terminated: "#A93226",
  Duplicate: "#ff8c00",
};

async function seedVendorStatuses(prisma) {
  await prisma.VendorStatuses.createMany({
    data: Object.entries(vendorStatuses).map(([status, color]) => ({
      name: status,
      color,
      description: "",
    })),
  });
}

export default seedVendorStatuses;
