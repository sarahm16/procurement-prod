import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import serializeNote from "../serializer/noteSerializer.js";
import { sendWorkOrderMsa } from "../services/pandadoc/send/sendWorkOrderMsa.js"; // adjust path to where sendMsa.js lives

const entity_type_id = 4;

// Primary contact rule — aligned with the ACH/MSA convention (contact_role_id === 1)
const getPrimaryContact = (contacts = []) =>
  contacts.find((c) => c.contact_role_id === 1) ?? contacts[0] ?? null;

const COMPLIANCE_TYPES = ["ACH", "W9"]; // standard MSA not required for work orders

const serializeVendor = (vendor) => {
  if (!vendor) return null;
  const primary = getPrimaryContact(vendor.Contacts);
  const docs = vendor.ComplianceDocuments ?? [];
  const cois = vendor.COIs ?? [];

  // PandaDoc-sent docs are valid when completed
  const hasValidDoc = (type) =>
    docs.some(
      (doc) => doc.document_type === type && doc.status === "completed",
    );

  // COI is valid when a record exists that is verified AND not expired
  const now = new Date();
  const hasValidCOI = cois.some(
    (coi) =>
      coi.additionally_insured_verified &&
      coi.expiration_date &&
      new Date(coi.expiration_date) > now,
  );

  const compliance = {
    ...Object.fromEntries(
      COMPLIANCE_TYPES.map((type) => [type, hasValidDoc(type)]),
    ),
    COI: hasValidCOI,
  };

  return {
    id: vendor.id,
    company: vendor.company,
    primary_contact_name: primary?.name ?? null,
    email: primary?.email ?? null,
    phone: primary?.phone ?? null,
    compliance, // { ACH: bool, W9: bool, COI: bool }
  };
};

function generateRandomSixDigit() {
  const min = 100000;
  const max = 999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const serializeService = (service) => ({
  ...service,
  name: service.Service?.name,
});

const serializeWorkorderById = (workorder, notes, activityLog) => {
  return {
    client: workorder?.Site?.Client?.client,
    priority: workorder?.priority,
    external_id: workorder?.external_id,
    work_order_number: workorder?.work_order_number,
    site: workorder?.Site,
    status: workorder?.Status?.name,
    services: (workorder?.Services ?? []).map(serializeService),
    notes: notes.map(serializeNote),
    activity_log: activityLog.map(serializeActivityLogEntry),
    software: workorder?.Software,
    software_id: workorder?.software_id,
    type: workorder?.type,
    created_at: workorder?.created_at,
    due_date: workorder?.due_date,
    start_date: workorder?.start_date,
    scope_of_work: workorder?.scope_of_work,
    vendor: serializeVendor(workorder?.Vendor),
    msa: (workorder?.MSAs ?? [])[0] ?? null, // most recent MSA if present
  };
};

export default function workordersRouter(prisma) {
  const router = Router();

  // GET /api/workorders
  router.get("/", async (req, res) => {
    try {
      const workorders = await prisma.workOrders.findMany({
        include: {
          Services: true,
          Status: true,
          Site: {
            select: {
              store: true,
              mailing_city: true,
              mailing_state: true,
              Client: { select: { client: true } },
            },
          },
        },
      });
      res.json(workorders);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching workorders:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching workorders:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/workorders
  router.post("/", async (req, res) => {
    const {
      site_id,
      due_date,
      start_date,
      services = [],
      user_id,
      created_by_email,
      type,
      role_assignments,
      priority,
      external_id,
      software_id,
      scope_of_work,
    } = req.body;

    const createWorkOrder = async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const work_order_number = `NFC-${generateRandomSixDigit()}`;
        try {
          return await prisma.$transaction(async (tx) => {
            const workorder = await tx.workOrders.create({
              data: {
                site_id,
                status_id: 1,
                work_order_number,
                created_by_email,
                type,
                priority,
                external_id,
                software_id: software_id ?? null,
                start_date: start_date ? new Date(start_date) : null,
                due_date: due_date ? new Date(due_date) : null,
                scope_of_work,
              },
            });

            if (services.length > 0) {
              await tx.workOrderServices.createMany({
                data: services.map((s) => ({
                  work_order_id: workorder.id,
                  trade_id: s.service_id,
                  client_price: s.client_price ?? null,
                  vendor_price: s.vendor_price ?? null,
                })),
              });
            }

            if (role_assignments?.length > 0) {
              await tx.roleAssignments.createMany({
                data: role_assignments.map((ra) => ({
                  internal_role_id: ra.internal_role_id,
                  employee_id: ra.employee_id,
                  entity_type_id: entity_type_id,
                  entity_id: workorder.id,
                })),
              });
            }

            await logActivity(tx, {
              entityTypeId: entity_type_id,
              entityId: workorder.id,
              fieldChanged: "work_order",
              previousValue: null,
              newValue: `Created work order ${workorder.work_order_number}`,
              changedBy: user_id ?? null,
              action: "CREATE",
            });

            return workorder;
          });
        } catch (err) {
          if (err.code === "P2002" && attempt < 4) continue;
          throw err;
        }
      }
      throw new Error("Could not generate a unique work order number");
    };

    try {
      const workorder = await createWorkOrder();
      const full = await prisma.workOrders.findUnique({
        where: { id: workorder.id },
        include: { Services: true, Status: true, Site: true },
      });
      res.status(201).json(full);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return res
            .status(409)
            .json({ error: "Work order number collision after retries" });
        }
        console.error("Prisma error creating workorder:", error);
        res.status(400).json({ error: "Database Error", code: error.code });
      } else {
        console.error("Error creating workorder:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/workorders/:id/services
  router.post("/:id/services", async (req, res) => {
    const { id } = req.params;
    const { user_id, ...body } = req.body;

    const service = {
      work_order_id: Number(id),
      trade_id: Number(body.service_id),
      client_price: body?.client_price ?? null,
      vendor_price: body?.vendor_price ?? null,
    };

    try {
      const createdService = await prisma.$transaction(async (tx) => {
        const created = await tx.workOrderServices.create({
          data: service,
          include: { Service: true },
        });
        return created;
      });
      // return in the same shape the frontend expects (name flattened)
      res.json({ ...createdService, name: createdService.Service?.name });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error adding service:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error adding service:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // DELETE /api/workorders/:id/services/:sid
  router.delete("/:id/services/:sid", async (req, res) => {
    const { id, sid } = req.params;

    try {
      const deletedService = await prisma.$transaction(async (tx) => {
        // deleteMany accepts a compound (non-unique) filter, so we can scope by
        // BOTH the work order and the service id for safety.
        await tx.workOrderServices.deleteMany({
          where: { id: Number(sid), work_order_id: Number(id) },
        });
        return { id: Number(sid) };
      });
      res.json(deletedService);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error deleting service:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error deleting service:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/workorders/statuses
  router.get("/statuses", async (req, res) => {
    try {
      const statuses = await prisma.workOrderStatuses.findMany();
      res.json(statuses);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching statuses:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching workorder statuses:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // GET /api/workorders/:id
  router.get("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const [workorder, notes, activityLog] = await Promise.all([
        prisma.workOrders.findUnique({
          where: { id: Number(id) },
          include: {
            Status: true,
            Services: { include: { Service: true } },
            Software: true,
            Site: {
              select: {
                id: true,
                store: true,
                mailing_address: true,
                mailing_address2: true,
                mailing_city: true,
                mailing_state: true,
                mailing_zipcode: true,
                Client: { select: { client: true, id: true } },
                Contacts: true,
              },
            },
            Vendor: {
              include: {
                ComplianceDocuments: true,
                Contacts: true,
                COIs: true,
              },
            },
            MSAs: true,
          },
        }),
        prisma.notes.findMany({
          where: {
            entity_type_id: entity_type_id,
            entity_id: Number(id),
            parent_note_id: null,
          },
          include: {
            Author: true,
            Replies: { include: { Author: true } },
            NoteTaggedUsers: { include: { TaggedUser: true } },
          },
        }),
        prisma.activityLog.findMany({
          where: { entity_type_id: entity_type_id, entity_id: Number(id) },
          include: { Employee: true },
        }),
      ]);

      res.json(serializeWorkorderById(workorder, notes, activityLog));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching workorder:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching workorder:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // PUT /api/workorders/:id
  router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id, changes = {} } = req.body;

    const allowed = [
      "external_id",
      "type",
      "priority",
      "software_id",
      "status_id",
      "start_date",
      "due_date",
      "scope_of_work",
      "vendor_id",
    ];

    const data = {};
    for (const key of allowed) {
      if (key in changes) {
        if ((key === "start_date" || key === "due_date") && changes[key]) {
          data[key] = new Date(changes[key]);
        } else if (
          key === "software_id" ||
          key === "status_id" ||
          key === "vendor_id"
        ) {
          data[key] =
            changes[key] === "" || changes[key] == null
              ? null
              : Number(changes[key]);
        } else {
          data[key] = changes[key];
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const workorder = await tx.workOrders.update({
          where: { id: Number(id) },
          data,
          include: {
            Status: true,
            Software: true,
            Vendor: { include: { Contacts: true } },
          },
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: Number(id),
          fieldChanged: Object.keys(data).join(", "),
          previousValue: null,
          newValue: JSON.stringify(data),
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return workorder;
      });

      // serialize the vendor so the response matches the detail shape
      res.json({ ...updated, vendor: serializeVendor(updated.Vendor) });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error updating workorder:", error);
        res.status(400).json({ error: "Database Error", code: error.code });
      } else {
        console.error("Error updating workorder:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // PUT /api/workorders/:id/services/:sid
  router.put("/:id/services/:sid", async (req, res) => {
    const { id, sid } = req.params;
    const { changes } = req.body;

    try {
      const updated = await prisma.$transaction(async (tx) => {
        // updateMany accepts the compound filter; scope by work order + id
        await tx.workOrderServices.updateMany({
          where: { id: Number(sid), work_order_id: Number(id) },
          data: changes,
        });
        // fetch the updated row with its Service relation to return
        const row = await tx.workOrderServices.findUnique({
          where: { id: Number(sid) },
          include: { Service: true },
        });
        return row;
      });
      res.json({ ...updated, name: updated?.Service?.name });
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // POST /api/workorders/:id/msa
  router.post("/:id/msa", async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
      const workorder = await prisma.workOrders.findUnique({
        where: { id: Number(id) },
        include: {
          Vendor: { include: { Contacts: true } },
          Site: { include: { Client: true } },
          Services: { include: { Service: true } },
        },
      });

      if (!workorder)
        return res.status(404).json({ error: "Work order not found" });
      if (!workorder.Vendor) {
        return res
          .status(400)
          .json({ error: "No vendor assigned to this work order" });
      }

      // flatten service names for the pricing table
      const services = workorder.Services.map((s) => ({
        ...s,
        name: s.Service?.name,
      }));

      const record = await sendWorkOrderMsa(
        workorder.Vendor,
        workorder,
        services,
        { user_id },
      );

      res.status(201).json(record);
    } catch (error) {
      if (error.needsPandaDocAuth) {
        return res.status(409).json({ needsPandaDocAuth: true });
      }
      console.error("Error sending work order MSA:", error);
      res.status(500).json({ error: "Failed to send MSA" });
    }
  });

  return router;
}
