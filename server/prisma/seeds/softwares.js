const softwares = [
  "No Portal",
  "Corrigo",
  "Coupa",
  "EcoTrak",
  "KBP (VX Suite)",
  "Limble",
  "MaintainX",
  "Nest",
  "Potfolio",
  "Procursys",
  "Ramp Public Storage",
  "Service One (GPM)",
  "ServiceChannel",
  "SiteFotos",
  "Verisae",
  "Wrench",
];

async function seedSoftwares(prisma) {
  await prisma.Softwares.createMany({
    data: softwares.map((softwareName) => ({
      name: softwareName,
    })),
  });
}

export default seedSoftwares;
