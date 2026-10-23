// routes/textRequest.js — mounted at /api/text-request
//
//   GET /vendors/:id/messages
//     Every text with the vendor, across all of our Text Request numbers.
//     The vendor's numbers come from our record — main and secondary phone,
//     plus every contact's phone — so nobody has to pick one.
//
//     → { company,
//         numbers: [{ phone, display, label }],   the ones searched
//         unusable: [{ value, label }],           on file but not a phone number
//         messages: [...], oldest first
//         partial: true when some lookups failed }
//
// In server.js / app.js:
//   import textRequestRouter from "./routes/textRequest.js";
//   app.use("/api/text-request", textRequestRouter(prisma));
import { Router } from "express";
import {
  TextRequestError,
  fetchMessagesForNumbers,
  normalizePhone,
} from "../services/textRequest.js";

// Each number costs one lookup per Text Request dashboard; keep it sane.
const MAX_NUMBERS = 6;

/** "(555) 123-4567" from "15551234567". */
const display = (n) =>
  `(${n.slice(1, 4)}) ${n.slice(4, 7)}-${n.slice(7)}`;

/** The vendor's distinct, usable numbers, each with who it belongs to. */
function vendorNumbers(v) {
  const candidates = [
    { value: v.contact_phone, label: v.contact_name || "Main" },
    { value: v.contact_phone2, label: "Secondary" },
    ...(v.Contacts ?? []).map((c) => ({ value: c.phone, label: c.name })),
  ].filter((c) => c.value && String(c.value).trim());

  const numbers = new Map();
  const unusable = [];
  for (const c of candidates) {
    const phone = normalizePhone(c.value);
    if (!phone) unusable.push({ value: String(c.value).trim(), label: c.label });
    else if (!numbers.has(phone)) numbers.set(phone, { phone, display: display(phone), label: c.label });
  }
  return { numbers: [...numbers.values()].slice(0, MAX_NUMBERS), unusable };
}

export default function textRequestRouter(prisma) {
  const router = Router();

  router.get("/vendors/:id/messages", async (req, res) => {
    const id = Number(req.params.id);
    try {
      const vendor = await prisma.vendors.findUnique({
        where: { id },
        select: {
          company: true,
          contact_name: true,
          contact_phone: true,
          contact_phone2: true,
          Contacts: { select: { name: true, phone: true } },
        },
      });
      if (!vendor) return res.status(404).json({ error: "That vendor doesn't exist" });

      const { numbers, unusable } = vendorNumbers(vendor);
      const { messages, failed } = await fetchMessagesForNumbers(numbers.map((n) => n.phone));

      res.json({
        company: vendor.company,
        numbers,
        unusable,
        messages,
        partial: failed > 0,
      });
    } catch (e) {
      if (e instanceof TextRequestError) {
        if (e.detail) console.error("Text Request:", e.detail);
        return res.status(e.status).json({ error: e.message });
      }
      console.error("Error loading vendor texts:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
}
