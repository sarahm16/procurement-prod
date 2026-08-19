import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";
import serializeActivityLogEntry from "../serializer/activityLogSerializer.js";
import serializeNote from "../serializer/noteSerializer.js";

const entity_type_id = 4;

// Function to generate a random 5-digit integer
function generateRandomSixDigit() {
  const min = 100000; // smallest 5-digit number
  const max = 999999; // largest 5-digit number
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const serializeService = (service) => ({
  ...service,
  name: service.Service.name,
});

const serializeWorkorderById = (workorder, notes, activityLog) => {
  console.log("workorder", workorder);

  return {
    client: workorder?.Site?.Client?.client,
    priority: workorder?.priority,
    external_id: workorder?.external_id,
    work_order_number: workorder?.work_order_number,
    site: workorder?.Site,
    status: workorder?.Status?.name,
    services: workorder?.Services.map(serializeService),
    notes: notes.map(serializeNote),
    activity_log: activityLog.map(serializeActivityLogEntry),
    software: workorder?.Software,
    type: workorder?.type,
    created_at: workorder?.created_at,
    due_date: workorder?.due_date,
    start_date: workorder?.start_date,
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
              Client: {
                select: {
                  client: true,
                },
              },
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
    } = req.body;

    const createWorkOrder = async () => {
      // Retry the whole create-in-transaction on number collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const work_order_number = `NFC-${generateRandomSixDigit()}`;
        try {
          return await prisma.$transaction(async (tx) => {
            // 1. the work order
            const workorder = await tx.workOrders.create({
              data: {
                site_id,
                status_id: 1,
                work_order_number,
                created_by_email,
                type,
                priority, // was dropped
                external_id, // was dropped
                software_id: software_id ?? null, // was dropped
                start_date: start_date ? new Date(start_date) : null, // was dropped
                due_date: due_date ? new Date(due_date) : null,
              },
            });

            // 2. its services (line items) — if any
            if (services.length > 0) {
              await tx.workOrderServices.createMany({
                data: services.map((s) => ({
                  work_order_id: workorder.id,
                  trade_id: s.service_id,
                  client_price: s.client_price ?? null, // nullable until priced
                  vendor_price: s.vendor_price ?? null,
                })),
              });
            }

            // inside the create transaction, after the work order + services:
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

            // 3. activity log
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
          // collision on the number → regenerate and retry the whole transaction
          if (err.code === "P2002" && attempt < 4) continue;
          throw err;
        }
      }
      throw new Error("Could not generate a unique work order number");
    };

    try {
      const workorder = await createWorkOrder();

      // return the full record with services for the client to render
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

  // GET /api/workorders/statuses
  router.get("/statuses", async (req, res) => {
    try {
      const statuses = await prisma.workOrderStatuses.findMany();
      res.json(statuses);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching workorders:", error);
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
            Services: {
              include: {
                Service: true,
              },
            },
            Software: true,
            Site: {
              select: {
                store: true,
                mailing_address: true,
                mailing_address2: true,
                mailing_city: true,
                mailing_state: true,
                mailing_zipcode: true,
                Client: {
                  select: {
                    client: true,
                  },
                },
              },
            },
          },
        }),
        prisma.notes.findMany({
          where: {
            entity_type_id: entity_type_id, // Work Order entity type
            entity_id: Number(id),
            parent_note_id: null,
          },
          include: {
            Author: true,
            Replies: {
              include: { Author: true },
            },
            NoteTaggedUsers: {
              include: { TaggedUser: true },
            },
          },
        }),
        prisma.activityLog.findMany({
          where: {
            entity_type_id: entity_type_id, // Client entity type
            entity_id: Number(id),
          },
          include: {
            Employee: true,
          },
        }),
      ]);
      console.log("Fetched Work Order", workorder);
      res.json(serializeWorkorderById(workorder, notes, activityLog));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching client:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching client:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
