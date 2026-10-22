// routes/portal/workOrderMessages.js
// Mounted at /api/portal/work-orders/:id/messages (vendor portal)
//
//   GET  /   → [message]   this vendor's conversation with NFC on the work order
//   POST /   { content } → message
//
// The work order has to be assigned to this vendor and released to the
// portal; otherwise 404, same as the work order itself.
import { Router } from "express";
import requireVendor from "../../middleware/requireVendor.js";
import {
  MESSAGE_INCLUDE,
  checkContent,
  createMessage,
  messageWhere,
  serializeMessage,
} from "../../services/workOrderMessages.js";
import { notifyAboutMessage } from "../../services/messageNotifications.js";

export default function portalWorkOrderMessagesRouter(prisma) {
  const router = Router({ mergeParams: true });
  router.use(requireVendor(prisma));

  /** The work order, if this vendor may see it. */
  const findWorkOrder = (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return prisma.workOrders.findFirst({
      where: { id, vendor_id: req.vendorId, portal_released_at: { not: null } },
      select: { id: true },
    });
  };
  const viewer = (req) => ({ kind: "vendor", userId: req.vendorUser.id });

  router.get("/", async (req, res) => {
    try {
      const wo = await findWorkOrder(req);
      if (!wo) return res.status(404).json({ error: "Work order not found." });
      const rows = await prisma.workOrderCommunications.findMany({
        where: messageWhere(wo.id, "vendor", req.vendorId),
        include: MESSAGE_INCLUDE,
        orderBy: { created_at: "asc" },
      });
      return res.json(rows.map((m) => serializeMessage(m, viewer(req))));
    } catch (e) {
      console.error("Vendor portal messages failed:", e);
      return res.status(500).json({ error: "Couldn't load messages." });
    }
  });

  router.post("/", async (req, res) => {
    const { content, error } = checkContent(req.body?.content);
    if (error) return res.status(400).json({ error });
    try {
      const wo = await findWorkOrder(req);
      if (!wo) return res.status(404).json({ error: "Work order not found." });
      const m = await createMessage(prisma, {
        workOrderId: wo.id,
        channel: "vendor",
        content,
        author: { vendorUserId: req.vendorUser.id },
        vendorId: req.vendorId,
      });
      // Email the other side; a mail problem never fails the post.
      notifyAboutMessage(prisma, m).catch((e) =>
        console.error("Message email failed:", e),
      );
      return res.status(201).json(serializeMessage(m, viewer(req)));
    } catch (e) {
      console.error("Vendor portal send message failed:", e);
      return res.status(500).json({ error: "Couldn't send your message." });
    }
  });

  return router;
}
