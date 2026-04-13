import { Router } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export default function tradesRouter(prisma) {
  const router = Router();

  // GET /api/trades
  router.get("/", async (req, res) => {
    try {
      const trades = await prisma.Trades.findMany();
      res.json(trades);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error fetching trades:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error fetching trades:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });
  // POST /api/trades
  router.post("/", async (req, res) => {
    console.log("Body", req.body);
    try {
      const trade = await prisma.trades.create({
        data: req.body,
      });
      console.log("Trade created:", trade);
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating trade:", error);
        res.status(400).json({
          error: "Database Error",
          code: error.code,
          message: error.message,
        });
      } else {
        console.error("Error creating trade:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  });

  return router;
}
