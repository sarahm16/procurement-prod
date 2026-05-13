const serializeActivityLogEntry = (entry) => {
  return {
    id: entry.id,
    action: entry.action,
    date: entry.changed_at,
    changed_by_name: entry.Employee ? entry.Employee.name : "Unknown",
    new_value: entry.new_value,
    previous_value: entry.previous_value,
    field_changed: entry.field_changed,
  };
};
export default serializeActivityLogEntry;
