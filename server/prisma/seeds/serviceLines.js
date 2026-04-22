const serviceLines = [
  {
    id: 1,
    name: "Janitorial",
  },
  {
    id: 4,
    name: "Landscaping",
  },
  {
    id: 7,
    name: "Landscape Construction",
  },
  {
    id: 3,
    name: "Lot Sweeping",
  },
  {
    id: 2,
    name: "Snow",
  },
  {
    id: 5,
    name: "Asphalt",
  },
  {
    id: 46,
    name: "On Demand",
  },
  {
    id: 6,
    name: "HVAC",
  },
  {
    id: 8,
    name: "Pressure Washing",
  },
  {
    id: 9,
    name: "Residential",
  },
];

async function seedServiceLines(prisma) {
  await prisma.ServiceLines.createMany({
    data: serviceLines.map((line) => ({
      name: line.name,
      sarlaccId: line.id,
    })),
  });
}

export default seedServiceLines;
