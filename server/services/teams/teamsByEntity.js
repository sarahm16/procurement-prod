// services/teams/teamsByEntity.js
//
// Who's on each record's team (role assignments), for list pages.
//
//   const teams = await teamsByEntity(prisma, [SITE_ENTITY_TYPE_ID, CLIENT_ENTITY_TYPE_ID]);
//   teams.get(`2:${site.id}`)   → [{ internal_role_id, role_name, employee_id, employee_name }]
//
// Reads whole entity types rather than filtering by ids: list endpoints
// return every record anyway, and an `in` list of thousands of ids would hit
// SQL Server's 2,100-parameter limit.

export async function teamsByEntity(prisma, entityTypeIds) {
  const rows = await prisma.roleAssignments.findMany({
    where: { entity_type_id: { in: entityTypeIds } },
    select: {
      entity_type_id: true,
      entity_id: true,
      internal_role_id: true,
      Role: { select: { name: true } },
      Employee: { select: { id: true, name: true, terminated: true } },
    },
  });

  const map = new Map();
  for (const r of rows) {
    if (r.Employee?.terminated) continue; // people who've left don't own anything
    const key = `${r.entity_type_id}:${r.entity_id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      internal_role_id: r.internal_role_id,
      role_name: r.Role?.name ?? null,
      employee_id: r.Employee?.id ?? null,
      employee_name: r.Employee?.name ?? null,
    });
  }
  return map;
}
