import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";

const entity_type_id = 4;

// Function to generate a random 5-digit integer
function generateRandomSixDigit() {
  const min = 100000; // smallest 5-digit number
  const max = 999999; // largest 5-digit number
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
                status_id: 1, // New
                work_order_number,
                created_by_email,
                type,
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

  return router;
}
