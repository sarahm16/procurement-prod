const roles = [
  {
    name: "Sourcer",
    description: "",
  },
];

async function seedRoles(prisma) {
  await prisma.roles.createMany({
    data: roles.map((role) => ({
      name: role.name,
      description: role.description,
    })),
  });
}

export default seedRoles;
