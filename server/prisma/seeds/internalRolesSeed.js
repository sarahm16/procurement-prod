const internalRoles = [
  {
    name: "Sourcer",
    description: "",
  },
  {
    name: "Account Manager",
    description: "",
  },
  {
    name: "Project Manager",
    description: "",
  },
  {
    name: "Sales Person",
    description: "",
  },
  {
    name: "Account Coordinator",
    description: "",
  },
];

async function seedInternalRoles(prisma) {
  await prisma.internalRoles.createMany({
    data: internalRoles.map((role) => ({
      name: role.name,
      description: role.description,
    })),
  });
}

export default seedInternalRoles;
