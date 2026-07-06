const contactRoles = [
  {
    name: "Primary",
  },
  {
    name: "Billing",
  },
  {
    name: "Operations",
  },
];

async function seedContactRoles(prisma) {
  await prisma.contactRoles.createMany({
    data: contactRoles.map((role) => ({
      name: role.name,
    })),
  });
}

export default seedContactRoles;
