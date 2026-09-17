/**
 * Mobilization fees — money paid to a vendor before work starts.
 *
 * The lifecycle crosses three teams and two external systems, so the rules
 * live here rather than in the UI: ops sets an amount, PandaDoc carries the
 * contract, accounting releases funds through QuickBooks. Every transition is
 * checked against ALLOWED_TRANSITIONS, because the difference between "signed"
 * and "paid" is a real payment.
 *
 * Register on the work orders router:
 *   registerMobilizationFeeRoutes(router, prisma);
 */

import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { logActivity } from "../utils/logActivity.js";
// Mirror of services/pandadoc/send/sendWorkOrderMsa.js — see the note below.
import { sendMobilizationFeeContract } from "../services/pandadoc/send/sendMobilizationFeeContract.js";

const entity_type_id = 4; // Work Order

/**
 * Seven states on one timeline.
 *
 * Collapsed from the original list: "Signed" and "Completed - Pending Payment"
 * described the same moment (executed, unpaid) and "Rejected" duplicated
 * "Declined" — PandaDoc only ever emits `document_declined`. Fewer states that
 * each mean one thing beats more states that overlap.
 */
export const MOB_FEE_STATUS = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PENDING_PAYMENT: "Completed - Pending Payment",
  PAID: "Paid",
  DECLINED: "Declined",
  VOIDED: "Voided",
};

const S = MOB_FEE_STATUS;

/** Money moves in one direction. Paid and Voided are terminal. */
export const ALLOWED_TRANSITIONS = {
  [S.DRAFT]: [S.SENT, S.VOIDED],
  [S.SENT]: [S.VIEWED, S.PENDING_PAYMENT, S.DECLINED, S.VOIDED],
  [S.VIEWED]: [S.PENDING_PAYMENT, S.DECLINED, S.VOIDED],
  [S.PENDING_PAYMENT]: [S.PAID, S.VOIDED],
  [S.PAID]: [],
  [S.DECLINED]: [S.VOIDED],
  [S.VOIDED]: [],
};

/** A fee in one of these is still expected to result in a payment. */
export const OPEN_STATUSES = [S.DRAFT, S.SENT, S.VIEWED, S.PENDING_PAYMENT];

const canTransition = (from, to) =>
  (ALLOWED_TRANSITIONS[from] ?? []).includes(to);

/** Timestamp column that goes with each state. */
const TIMESTAMP_FOR = {
  [S.SENT]: "date_sent",
  [S.VIEWED]: "date_viewed",
  [S.PENDING_PAYMENT]: "date_completed",
  [S.PAID]: "date_paid",
  [S.DECLINED]: "date_declined",
  [S.VOIDED]: "date_voided",
};

const num = (v) => (v == null ? null : Number(v));

export const serializeMobilizationFee = (fee) => ({
  id: fee.id,
  work_order_id: fee.work_order_id,
  vendor_id: fee.vendor_id,
  vendor: fee.Vendor?.company ?? null,
  amount: num(fee.amount),
  status: fee.status,
  notes: fee.notes,

  pandadoc_id: fee.pandadoc_id,
  quickbooks_bill_id: fee.quickbooks_bill_id,

  date_sent: fee.date_sent,
  date_viewed: fee.date_viewed,
  date_completed: fee.date_completed,
  date_paid: fee.date_paid,
  date_declined: fee.date_declined,
  date_voided: fee.date_voided,

  created_at: fee.created_at,
  created_by_name: fee.CreatedBy?.name ?? null,
  sent_by_name: fee.SentBy?.name ?? null,
  paid_by_name: fee.PaidBy?.name ?? null,

  // What the UI needs to decide which buttons to show, without duplicating
  // the state machine on the client.
  can_edit_amount: fee.status === S.DRAFT,
  can_send: fee.status === S.DRAFT,
  can_mark_paid: fee.status === S.PENDING_PAYMENT,
  can_void: canTransition(fee.status, S.VOIDED),
  is_open: OPEN_STATUSES.includes(fee.status),
});

const feeInclude = {
  Vendor: { select: { id: true, company: true } },
  CreatedBy: { select: { id: true, name: true } },
  SentBy: { select: { id: true, name: true } },
  PaidBy: { select: { id: true, name: true } },
};

/**
 * What we still owe this vendor.
 *
 * Only fees that have actually been PAID reduce the balance — a signed
 * contract is a commitment, not a disbursement, and treating it as one would
 * understate what's owed for however long accounting takes.
 */
export function computeVendorBalance(workorder) {
  const vendorTotal = (workorder.Services ?? []).reduce(
    (t, s) => t + (Number(s.vendor_price) || 0),
    0,
  );
  const fees = workorder.MobilizationFees ?? [];
  const paid = fees
    .filter((f) => f.status === S.PAID)
    .reduce((t, f) => t + (Number(f.amount) || 0), 0);
  const committed = fees
    .filter((f) => OPEN_STATUSES.includes(f.status) && f.status !== S.DRAFT)
    .reduce((t, f) => t + (Number(f.amount) || 0), 0);

  return {
    vendor_total: vendorTotal || null,
    mobilization_paid: paid || null,
    mobilization_committed: committed || null,
    balance_due: vendorTotal ? vendorTotal - paid : null,
  };
}

/**
 * PandaDoc's `data.status` values mapped onto our vocabulary.
 *
 * `document.completed` lands on "Completed - Pending Payment" rather than a
 * bare "completed": from our side a signed contract isn't the end of anything,
 * it's the moment accounting is on the hook.
 */
export const PANDADOC_STATUS_TO_FEE_STATUS = {
  "document.draft": S.DRAFT,
  "document.sent": S.SENT,
  "document.viewed": S.VIEWED,
  "document.completed": S.PENDING_PAYMENT,
  "document.declined": S.DECLINED,
  "document.voided": S.VOIDED,
};

/**
 * Moves a mobilization fee in response to a PandaDoc status change.
 *
 * Returns:
 *   the updated fee  — the status changed, and the caller should notify
 *   `false`          — this document IS a mobilization fee, but the event
 *                      doesn't move it (duplicate, out of order, or illegal)
 *   `null`           — this document isn't a mobilization fee at all
 *
 * The three-way return matters in the webhook: `null` means keep looking in
 * the other tables, `false` means stop looking but stay quiet.
 */
export async function applyPandaDocStatusToFee(prisma, pandadocId, rawStatus) {
  const fee = await prisma.workOrderMobilizationFees.findFirst({
    where: { pandadoc_id: pandadocId },
    include: feeInclude,
  });
  if (!fee) return null;

  const next = PANDADOC_STATUS_TO_FEE_STATUS[rawStatus];
  if (!next || next === fee.status) return false;

  // Redeliveries and out-of-order events are normal PandaDoc traffic — a
  // `document.viewed` arriving after `document.completed` must not drag a
  // signed contract backwards. Ignoring it is correct, not an error.
  if (!canTransition(fee.status, next)) return false;

  const stamp = TIMESTAMP_FOR[next];

  return prisma.workOrderMobilizationFees.update({
    where: { id: fee.id },
    data: {
      status: next,
      ...(stamp ? { [stamp]: new Date() } : {}),
    },
    include: feeInclude,
  });
}

export function registerMobilizationFeeRoutes(router, prisma) {
  // ── GET /api/workorders/:id/mobilization-fees ───────────────────────────
  router.get("/:id/mobilization-fees", async (req, res) => {
    try {
      const fees = await prisma.workOrderMobilizationFees.findMany({
        where: { work_order_id: Number(req.params.id) },
        include: feeInclude,
        orderBy: { created_at: "desc" },
      });
      res.json(fees.map(serializeMobilizationFee));
    } catch (error) {
      console.error("Error fetching mobilization fees:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── POST /api/workorders/:id/mobilization-fees ──────────────────────────
  // Creates it as a Draft. Sending is a separate, deliberate step so the
  // amount can be checked before a contract goes to the vendor.
  router.post("/:id/mobilization-fees", async (req, res) => {
    const workOrderId = Number(req.params.id);
    const { amount, notes, user_id } = req.body;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return res
        .status(400)
        .json({ error: "Amount must be greater than zero" });
    }
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    try {
      const workorder = await prisma.workOrders.findUnique({
        where: { id: workOrderId },
        select: {
          id: true,
          vendor_id: true,
          work_order_number: true,
          _count: { select: { Children: true } },
          MobilizationFees: { select: { id: true, status: true } },
        },
      });

      if (!workorder)
        return res.status(404).json({ error: "Work order not found" });

      // A parent holds no vendor — the fee belongs on the child doing the work.
      if (workorder._count.Children > 0) {
        return res.status(400).json({
          error:
            "Add the mobilization fee to the child work order the vendor is on",
        });
      }
      if (!workorder.vendor_id) {
        return res
          .status(400)
          .json({ error: "Assign a vendor before adding a mobilization fee" });
      }

      const alreadyOpen = workorder.MobilizationFees.find((f) =>
        OPEN_STATUSES.includes(f.status),
      );
      if (alreadyOpen) {
        return res.status(409).json({
          error: "This work order already has an open mobilization fee",
          mobilization_fee_id: alreadyOpen.id,
        });
      }

      const fee = await prisma.$transaction(async (tx) => {
        const created = await tx.workOrderMobilizationFees.create({
          data: {
            work_order_id: workOrderId,
            vendor_id: workorder.vendor_id,
            amount: value,
            status: S.DRAFT,
            notes: notes || null,
            created_by: Number(user_id),
          },
          include: feeInclude,
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: workOrderId,
          fieldChanged: "mobilization_fee",
          previousValue: null,
          newValue: `Mobilization fee drafted — $${value.toFixed(2)}`,
          changedBy: Number(user_id),
          action: "CREATE",
        });

        return created;
      });

      res.status(201).json(serializeMobilizationFee(fee));
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        console.error("Prisma error creating mobilization fee:", error);
        return res
          .status(400)
          .json({ error: "Database Error", code: error.code });
      }
      console.error("Error creating mobilization fee:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── PUT /api/workorders/:id/mobilization-fees/:feeId ────────────────────
  // Amount is editable only while it's a Draft. Once a contract has gone to
  // the vendor, the number in our system has to match the one they signed.
  router.put("/:id/mobilization-fees/:feeId", async (req, res) => {
    const feeId = Number(req.params.feeId);
    const { amount, notes, user_id } = req.body;

    try {
      const fee = await prisma.workOrderMobilizationFees.findUnique({
        where: { id: feeId },
      });
      if (!fee)
        return res.status(404).json({ error: "Mobilization fee not found" });

      const data = {};

      if (amount !== undefined) {
        if (fee.status !== S.DRAFT) {
          return res.status(400).json({
            error: `The amount can't change once the contract has been sent (currently ${fee.status})`,
          });
        }
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
          return res
            .status(400)
            .json({ error: "Amount must be greater than zero" });
        }
        data.amount = value;
      }

      if (notes !== undefined) data.notes = notes || null;
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.workOrderMobilizationFees.update({
          where: { id: feeId },
          data,
          include: feeInclude,
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: fee.work_order_id,
          fieldChanged: "mobilization_fee",
          previousValue:
            data.amount !== undefined
              ? `$${Number(fee.amount).toFixed(2)}`
              : null,
          newValue:
            data.amount !== undefined
              ? `Mobilization fee amount changed to $${data.amount.toFixed(2)}`
              : "Mobilization fee notes updated",
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return row;
      });

      res.json(serializeMobilizationFee(updated));
    } catch (error) {
      console.error("Error updating mobilization fee:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── POST /api/workorders/:id/mobilization-fees/:feeId/send ──────────────
  router.post("/:id/mobilization-fees/:feeId/send", async (req, res) => {
    const feeId = Number(req.params.feeId);
    const { user_id } = req.body;

    try {
      const fee = await prisma.workOrderMobilizationFees.findUnique({
        where: { id: feeId },
        include: {
          Vendor: { include: { Contacts: true } },
          WorkOrder: {
            include: {
              Site: { include: { Client: true } },
              Services: { include: { Service: true } },
            },
          },
        },
      });

      if (!fee)
        return res.status(404).json({ error: "Mobilization fee not found" });
      if (!canTransition(fee.status, S.SENT)) {
        return res
          .status(400)
          .json({ error: `Can't send a fee that is ${fee.status}` });
      }

      // PandaDoc first — if it fails we haven't claimed to have sent anything.
      const doc = await sendMobilizationFeeContract(
        fee.Vendor,
        fee.WorkOrder,
        fee,
        { user_id },
      );

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.workOrderMobilizationFees.update({
          where: { id: feeId },
          data: {
            status: S.SENT,
            pandadoc_id: doc?.id ?? doc?.pandadoc_id ?? null,
            template_id: doc?.template_id ?? null,
            date_sent: new Date(),
            sent_by: user_id ? Number(user_id) : null,
          },
          include: feeInclude,
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: fee.work_order_id,
          fieldChanged: "mobilization_fee",
          previousValue: fee.status,
          newValue: `Mobilization fee contract sent to ${fee.Vendor?.company ?? "vendor"} — $${Number(fee.amount).toFixed(2)}`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return row;
      });

      // TODO: Teams notification — port the logic from the previous app here.
      // Fire it after the commit so a notification never describes a state
      // that got rolled back.

      res.json(serializeMobilizationFee(updated));
    } catch (error) {
      if (error.needsPandaDocAuth) {
        return res.status(409).json({ needsPandaDocAuth: true });
      }
      console.error("Error sending mobilization fee:", error);
      res
        .status(500)
        .json({ error: "Failed to send the mobilization fee contract" });
    }
  });

  // ── PUT /api/workorders/:id/mobilization-fees/:feeId/paid ───────────────
  // Accounting's step, after the funds actually leave QuickBooks.
  router.put("/:id/mobilization-fees/:feeId/paid", async (req, res) => {
    const feeId = Number(req.params.feeId);
    const { quickbooks_bill_id, user_id } = req.body;

    try {
      const fee = await prisma.workOrderMobilizationFees.findUnique({
        where: { id: feeId },
      });
      if (!fee)
        return res.status(404).json({ error: "Mobilization fee not found" });

      if (!canTransition(fee.status, S.PAID)) {
        return res.status(400).json({
          error:
            fee.status === S.PAID
              ? "This fee is already marked paid"
              : `A fee can only be marked paid once the contract is signed (currently ${fee.status})`,
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.workOrderMobilizationFees.update({
          where: { id: feeId },
          data: {
            status: S.PAID,
            date_paid: new Date(),
            paid_by: user_id ? Number(user_id) : null,
            quickbooks_bill_id: quickbooks_bill_id || null,
          },
          include: feeInclude,
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: fee.work_order_id,
          fieldChanged: "mobilization_fee",
          previousValue: fee.status,
          newValue: `Mobilization fee paid — $${Number(fee.amount).toFixed(2)}${
            quickbooks_bill_id ? ` (QB ${quickbooks_bill_id})` : ""
          }`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return row;
      });

      res.json(serializeMobilizationFee(updated));
    } catch (error) {
      console.error("Error marking mobilization fee paid:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── PUT /api/workorders/:id/mobilization-fees/:feeId/void ───────────────
  router.put("/:id/mobilization-fees/:feeId/void", async (req, res) => {
    const feeId = Number(req.params.feeId);
    const { user_id, reason } = req.body;

    try {
      const fee = await prisma.workOrderMobilizationFees.findUnique({
        where: { id: feeId },
      });
      if (!fee)
        return res.status(404).json({ error: "Mobilization fee not found" });

      if (!canTransition(fee.status, S.VOIDED)) {
        return res.status(400).json({
          error:
            fee.status === S.PAID
              ? "A paid fee can't be voided — reverse it in QuickBooks and record that separately"
              : `Can't void a fee that is ${fee.status}`,
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const row = await tx.workOrderMobilizationFees.update({
          where: { id: feeId },
          data: {
            status: S.VOIDED,
            date_voided: new Date(),
            notes: reason
              ? `${fee.notes ? `${fee.notes}\n` : ""}Voided: ${reason}`
              : fee.notes,
          },
          include: feeInclude,
        });

        await logActivity(tx, {
          entityTypeId: entity_type_id,
          entityId: fee.work_order_id,
          fieldChanged: "mobilization_fee",
          previousValue: fee.status,
          newValue: `Mobilization fee voided${reason ? ` — ${reason}` : ""}`,
          changedBy: user_id ?? null,
          action: "UPDATE",
        });

        return row;
      });

      res.json(serializeMobilizationFee(updated));
    } catch (error) {
      console.error("Error voiding mobilization fee:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
