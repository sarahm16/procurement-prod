// One activity entry as the detail pages' Activity tab shows it.
const serializeActivityLogEntry = (entry) => ({
  id: entry.id,
  action: entry.action,
  date: entry.changed_at,
  changed_by_id: entry.changed_by,
  changed_by_name: entry.Employee?.name ?? "Unknown",
});

export default serializeActivityLogEntry;
