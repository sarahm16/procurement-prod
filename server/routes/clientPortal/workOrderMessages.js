// routes/clientPortal/workOrderMessages.js
// Mounted at /api/client-portal/work-orders/:id/messages
//
//   GET  /   → [message]   the client's conversation with NFC on the work order
//   POST /   { content } → message
//
// The work order has to be at one of the sites this login may see
// (clientSiteWhere); otherwise 404.
import { Router } from "express";
import requireClient, { clientSiteWhere } from "../../middleware/requireClient.js";
import {
  MESSAGE_INCLUDE,
  checkContent,
  createMessage,
  messageWhere,
  serializeMessage,
} from "../../services/workOrderMessages.js";
import { notifyAboutMessage } from "../../services/messageNotifications.js";

export default function clientWorkOrderMessagesRouter(prisma) {
  const router = Router({ mergeParams: true });
  router.use(requireClient(prisma));

  const findWorkOrder = (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return prisma.workOrders.findFirst({
      where: { id, Site: clientSiteWhere(req) },
      select: { id: true },
    });
  };
  const viewer = (req) => ({ kind: "client", userId: req.clientUser.id });

  router.get("/", async (req, res) => {
    try {
      const wo = await findWorkOrder(req);
      if (!wo) return res.status(404).json({ error: "Work order not found." });
      const rows = await prisma.workOrderCommunications.findMany({
        where: messageWhere(wo.id, "client"),
        include: MESSAGE_INCLUDE,
        orderBy: { created_at: "asc" },
      });
      return res.json(rows.map((m) => serializeMessage(m, viewer(req))));
    } catch (e) {
      console.error("Client portal messages failed:", e);
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
        channel: "client",
        content,
        author: { clientUserId: req.clientUser.id },
      });
      // Email the other side; a mail problem never fails the post.
      notifyAboutMessage(prisma, m).catch((e) =>
        console.error("Message email failed:", e),
      );
      return res.status(201).json(serializeMessage(m, viewer(req)));
    } catch (e) {
      console.error("Client portal send message failed:", e);
      return res.status(500).json({ error: "Couldn't send your message." });
    }
  });

  return router;
}
