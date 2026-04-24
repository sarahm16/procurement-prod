const entityTypes = ["vendor", "site", "client", "workorder"];

async function seedEntityTypes(prisma) {
  await prisma.entityTypes.createMany({
    data: entityTypes.map((type) => ({
      name: type,
    })),
  });
}

export default seedEntityTypes;
