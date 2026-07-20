import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const serializeSite = (site) => ({
  ...site,
  service_lines: serializeServiceLines(site.ContractSites),
  client: serializeClient(site.Client),
});

const serializeClient = (client) => client.client;

const serializeServiceLines = (contractSites) => {
  return contractSites.map(
    (contractSite) => contractSite.Contract.ServiceLine.name,
  );
};

export default function sitesRouter(prisma) {
  const router = Router();

  // GET /api/sites
  router.get("/", async (req, res) => {
    try {
      const sites = await prisma.Sites.findMany({
        include: {
          Client: {
            select: {
              id: true,
              client: true,
            },
          },
          ContractSites: {
            select: {
              Contract: {
                select: {
                  ServiceLine: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      res.json(sites.map(serializeSite));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching sites:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching sites:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  // POST /api/sites
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const site = await prisma.Sites.create({
        data: req.body,
      });
      console.log("Site created:", site);
      res.status(201).json(serializeSite(site));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating site:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating site:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
