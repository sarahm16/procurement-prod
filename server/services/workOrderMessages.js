// services/workOrderMessages.js
//
// Work order messages between NFC and the client or the vendor
// (WorkOrderCommunications). Used by the ops work order routes and by both
// portals, so the rules live in one place:
//
//   - channel "client" or "vendor" decides which conversation a message is in
//   - vendor messages always carry the vendor company (vendor_id); a vendor
//     only ever sees messages with their own vendor_id
//   - exactly one author: an employee, a vendor login or a client login
//
// The database enforces the last two with CHECK constraints as well.

export const CHANNELS = ["client", "vendor"];

/** The Softwares name that means "this client uses our client portal". */
export const CLIENT_PORTAL_SOFTWARE = "Sarlacc";
export const MAX_LENGTH = 2000; // content is VarChar(2000)

export const MESSAGE_INCLUDE = {
  Employee: { select: { id: true, name: true } },
  VendorUser: { select: { id: true, name: true } },
  ClientUser: { select: { id: true, name: true } },
  Vendor: { select: { id: true, company: true } },
};

/** Which messages a viewer may see on one work order. */
export const messageWhere = (workOrderId, channel, vendorId) => ({
  work_order_id: workOrderId,
  channel,
  ...(channel === "vendor" && vendorId != null && { vendor_id: vendorId }),
});

/**
 * One message, the same shape everywhere.
 *   author.kind  "nfc" | "vendor" | "client"
 *   mine         true when the viewer (or the viewer's side) wrote it
 *
 * viewer = { kind: "nfc" } | { kind: "vendor", userId } | { kind: "client", userId }
 * Ops treats every NFC message as "ours"; in the portals only the person's
 * own messages are "mine".
 */
export function serializeMessage(m, viewer = { kind: "nfc" }) {
  const author = m.employee_id
    ? { kind: "nfc", id: m.employee_id, name: m.Employee?.name ?? "NFC" }
    : m.vendor_user_id
      ? {
          kind: "vendor",
          id: m.vendor_user_id,
          name: m.VendorUser?.name ?? "Vendor",
          company: m.Vendor?.company ?? null,
        }
      : {
          kind: "client",
          id: m.client_user_id,
          name: m.ClientUser?.name ?? "Client",
        };

  const mine =
    viewer.kind === "nfc"
      ? author.kind === "nfc"
      : author.kind === viewer.kind && author.id === viewer.userId;

  return {
    id: m.id,
    channel: m.channel,
    content: m.content,
    created_at: m.created_at,
    vendor_id: m.vendor_id,
    vendor_company: m.Vendor?.company ?? null,
    author,
    mine,
  };
}

/** Trimmed content, or an error message. */
export function checkContent(raw) {
  const content = typeof raw === "string" ? raw.trim() : "";
  if (!content) return { error: "Write a message first." };
  if (content.length > MAX_LENGTH)
    return { error: `Messages can be up to ${MAX_LENGTH} characters.` };
  return { content };
}

/**
 * Save a message. `author` is exactly one of
 * { employeeId } | { vendorUserId } | { clientUserId }.
 * For the vendor channel, vendorId is required (the work order's vendor).
 */
export function createMessage(db, { workOrderId, channel, content, author, vendorId }) {
  return db.workOrderCommunications.create({
    data: {
      work_order_id: workOrderId,
      channel,
      content,
      employee_id: author.employeeId ?? null,
      vendor_user_id: author.vendorUserId ?? null,
      client_user_id: author.clientUserId ?? null,
      vendor_id: channel === "vendor" ? vendorId : null,
    },
    include: MESSAGE_INCLUDE,
  });
}
