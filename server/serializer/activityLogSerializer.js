const serializeActivityLogEntry = (entry) => {
  return {
    id: entry.id,
    action: entry.action,
    date: entry.changed_at,
    changed_by_name: entry.Employee ? entry.Employee.name : "Unknown",
    new_value: entry.new_value,
    prev_value: entry.old_value,
    field_changed: entry.field_changed,
  };
};
export default serializeActivityLogEntry;
