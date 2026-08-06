// routes/webhooks/index.js
import express from "express";
import { makePandaDocWebhook } from "../../api/webhooks/pandadoc/makePandaDocWebhook.js";

const router = express.Router();

// raw body for ALL webhook routes (signature verification needs it)
router.use(express.raw({ type: "application/json" }));

router.use("/pandadoc/accounting", makePandaDocWebhook("accounting"));
router.use("/pandadoc/operations", makePandaDocWebhook("operations"));

export default router;
