import { Router } from "express";
import prisma from "../db.js";
import { logActivity } from "../utils/logActivity.js";

// Fields that can be updated in a contact
const CONTACT_ALLOWED_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "contact_role_id",
]);

// Treat null / undefined / "" as the same, and trim strings so Char(50)
// padding (mailing_state!) doesn't register as a change.
const norm = (v) => {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v.trim() : v;
};

// makeContactRoutes.js
function makeContactRoutes({ delegate, foreignKey, entityTypeId }) {
  const router = Router();

  // POST /:id/contacts
  router.post("/:id/contacts", async (req, res) => {
    const { id } = req.params;
    const { user_id, ...body } = req.body;
    const contactData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      contact_role_id: body.contact_role_id,
    };

    if (!contactData.name) {
      return res.status(400).json({ error: "Contact name is required" });
    }
    try {
      const contact = await prisma.$transaction(async (tx) => {
        const created = await tx[delegate].create({
          data: { [foreignKey]: Number(id), ...contactData },
          include: { ContactRole: true },
        });
        await logActivity(tx, {
          entityTypeId,
          entityId: Number(id),
          fieldChanged: "contacts",
          previousValue: null,
          newValue: `Added contact: ${created.name}`,
          changedBy: user_id ?? null,
          action: "CREATE",
        });
        return created;
      });
      res.status(201).json({
        ...contact,
        contact_role: contact.ContactRole?.name ?? null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PUT /:id/contacts/:cid - update a contact for a client
  router.put("/:id/contacts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    const { user_id, changes } = req.body; // `changes` = the draft object

    if (!changes || typeof changes !== "object") {
      return res.status(400).json({ error: "No changes provided" });
    }

    // Drop anything not in the whitelist (strips id, relation keys, stray draft junk)
    const requested = Object.fromEntries(
      Object.entries(changes).filter(([key]) =>
        CONTACT_ALLOWED_FIELDS.has(key),
      ),
    );

    if (Object.keys(requested).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    try {
      // Fetch existing values for just the fields being touched
      const existing = await prisma[delegate].findUnique({
        where: { id: Number(cid) },
        select: Object.fromEntries(
          Object.keys(requested).map((k) => [k, true]),
        ),
      });

      if (!existing)
        return res.status(404).json({ error: "Contact not found" });

      // Keep only fields whose value actually differs
      const changedFields = Object.entries(requested).filter(
        ([key, value]) => norm(existing[key]) !== norm(value),
      );

      if (changedFields.length === 0) {
        return res.json(existing); // nothing really changed — skip update + log
      }

      const data = Object.fromEntries(changedFields);

      const updatedContact = await prisma.$transaction(async (tx) => {
        const updated = await tx[delegate].update({
          where: { id: Number(cid) },
          data,
          include: { ContactRole: true }, // so the response carries the role name
        });

        const fieldNames = changedFields.map(([k]) => k);
        const summary = changedFields.map(([k, v]) => `${k}: ${v}`).join(", ");

        await logActivity(tx, {
          entityTypeId,
          entityId: Number(id),
          fieldChanged: fieldNames.join(", "), // e.g. "name, email, phone"
          previousValue: null, // see note below
          newValue:
            summary.length > 255 ? summary.slice(0, 252) + "…" : summary,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return { ...updated, contact_role: updated.ContactRole?.name ?? null }; // flatten the role for the frontend
      });

      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // DELETE /:id/contacts/:cid
  router.delete("/:id/contacts/:cid", async (req, res) => {
    const { id, cid } = req.params;
    const { user_id } = req.body;
    try {
      const deletedContact = await prisma.$transaction(async (tx) => {
        const deleted = await tx[delegate].delete({
          where: { id: Number(cid) },
        });

        await logActivity(tx, {
          entityTypeId,
          entityId: Number(id),
          fieldChanged: "contacts",
          previousValue: `${deleted.name}`,
          newValue: null,
          changedBy: user_id ?? null,
          action: "DELETE",
        });
        return deleted;
      });

      res.json(deletedContact);
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}

export default makeContactRoutes;
