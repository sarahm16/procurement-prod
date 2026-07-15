const softwares = ["Projects", "On Demand", "Planned Maintenance"];

async function seedServiceTypes(prisma) {
  await prisma.ServiceTypes.createMany({
    data: softwares.map((serviceType) => ({
      name: serviceType,
    })),
  });
}

export default seedServiceTypes;
