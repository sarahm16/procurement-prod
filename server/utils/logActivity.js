// server/utils/logActivity.js
export async function logActivity(
  prisma,
  {
    entityTypeId,
    entityId,
    fieldChanged,
    previousValue,
    newValue,
    changedBy,
    action,
  },
) {
  await prisma.activityLog.create({
    data: {
      entity_type_id: entityTypeId,
      entity_id: entityId,
      action: action,
      field_changed: fieldChanged ?? null,
      previous_value: previousValue ? String(previousValue) : null,
      new_value: newValue ? String(newValue) : null,
      changed_by: changedBy ?? null,
    },
  });
}
