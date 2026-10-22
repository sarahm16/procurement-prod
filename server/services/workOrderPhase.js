// services/workOrderPhase.js
//
// Moving a work order between the ops and finance phases.
//
//   ops → finance   once the work order is Completed and every child is
//                   Completed or Cancelled. Only parents and standalone work
//                   orders move (the client invoice lives on the parent); the
//                   children go with their parent. The parent's status becomes
//                   "Fin Open". The children keep their ops status (Completed
//                   / Cancelled) as a record of how their part ended.
//
//   finance → ops   needs a reason. The parent's status becomes "Reopened" and
//                   the children come back with it.
//
// Statuses are looked up by name, so this works whatever ids they got.
import { logActivity } from "../utils/logActivity.js";

const WORK_ORDER_ENTITY_TYPE_ID = 4;

export const PHASES = ["ops", "finance"];
export const OPS_DONE = "Completed";
export const OPS_REOPENED = "Reopened";
export const FINANCE_START = "Fin Open";
/** A child is finished if it was completed or cancelled. */
const CHILD_FINISHED = [OPS_DONE, "Cancelled"];
export const REASON_MAX = 500;

/** Thrown for anything the caller should see; `status` is the HTTP code. */
export class PhaseError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const phaseOf = (wo) => wo?.phase ?? "ops";

async function statusNamed(tx, name) {
  const s = await tx.workOrderStatuses.findFirst({
    where: { name },
    select: { id: true, name: true, color: true, phase: true },
  });
  if (!s) {
    throw new PhaseError(
      500,
      `The "${name}" status is missing. Has the finance statuses migration run?`,
    );
  }
  return s;
}

const loadForMove = (tx, id) =>
  tx.workOrders.findUnique({
    where: { id },
    select: {
      id: true,
      work_order_number: true,
      phase: true,
      parent_work_order_id: true,
      Status: { select: { name: true } },
      Children: {
        select: {
          id: true,
          work_order_number: true,
          Status: { select: { name: true } },
        },
      },
    },
  });

/**
 * Hand a completed work order (and its children) to finance.
 * Resolves to { id, phase, status }.
 */
export async function moveToFinance(prisma, { id, userId }) {
  return prisma.$transaction(async (tx) => {
    const wo = await loadForMove(tx, id);
    if (!wo) throw new PhaseError(404, "Work order not found");
    if (phaseOf(wo) === "finance") {
      throw new PhaseError(409, "This work order is already in finance");
    }
    if (wo.parent_work_order_id) {
      throw new PhaseError(
        400,
        "Child work orders move to finance with their parent. Move the parent instead.",
      );
    }
    if (wo.Status?.name !== OPS_DONE) {
      throw new PhaseError(
        409,
        `Only completed work orders can move to finance (this one is ${
          wo.Status?.name ?? "without a status"
        })`,
      );
    }
    const open = wo.Children.filter(
      (c) => !CHILD_FINISHED.includes(c.Status?.name),
    );
    if (open.length) {
      throw new PhaseError(
        409,
        `Every child has to be completed or cancelled first. Still open: ${open
          .map(
            (c) => `${c.work_order_number} (${c.Status?.name ?? "no status"})`,
          )
          .join(", ")}`,
        {
          open: open.map((c) => ({
            id: c.id,
            work_order_number: c.work_order_number,
          })),
        },
      );
    }

    const finOpen = await statusNamed(tx, FINANCE_START);

    await tx.workOrders.update({
      where: { id: wo.id },
      data: { phase: "finance", status_id: finOpen.id },
    });
    await logActivity(tx, {
      entityTypeId: WORK_ORDER_ENTITY_TYPE_ID,
      entityId: wo.id,
      fieldChanged: "phase",
      previousValue: "ops",
      newValue: `finance (status ${OPS_DONE} → ${FINANCE_START})`,
      changedBy: userId ?? null,
      action: "UPDATE",
    });

    if (wo.Children.length) {
      await tx.workOrders.updateMany({
        where: { parent_work_order_id: wo.id },
        data: { phase: "finance" },
      });
      for (const c of wo.Children) {
        await logActivity(tx, {
          entityTypeId: WORK_ORDER_ENTITY_TYPE_ID,
          entityId: c.id,
          fieldChanged: "phase",
          previousValue: "ops",
          newValue: `finance (with parent ${wo.work_order_number})`,
          changedBy: userId ?? null,
          action: "UPDATE",
        });
      }
    }

    return { id: wo.id, phase: "finance", status: finOpen };
  });
}

/**
 * Send a work order (and its children) back to ops, with a reason.
 * Resolves to { id, phase, status }.
 */
export async function moveBackToOps(prisma, { id, userId, reason }) {
  const why = String(reason ?? "").trim();
  if (!why) throw new PhaseError(400, "Say why it's going back to ops");
  if (why.length > REASON_MAX) {
    throw new PhaseError(400, `Keep the reason under ${REASON_MAX} characters`);
  }

  return prisma.$transaction(async (tx) => {
    const wo = await loadForMove(tx, id);
    if (!wo) throw new PhaseError(404, "Work order not found");
    if (phaseOf(wo) !== "finance") {
      throw new PhaseError(409, "This work order is already in ops");
    }
    if (wo.parent_work_order_id) {
      throw new PhaseError(
        400,
        "Child work orders go back with their parent. Send the parent back instead.",
      );
    }

    const reopened = await statusNamed(tx, OPS_REOPENED);

    await tx.workOrders.update({
      where: { id: wo.id },
      data: { phase: "ops", status_id: reopened.id },
    });
    await logActivity(tx, {
      entityTypeId: WORK_ORDER_ENTITY_TYPE_ID,
      entityId: wo.id,
      fieldChanged: "phase",
      previousValue: `finance (${wo.Status?.name ?? "no status"})`,
      newValue: `ops (${OPS_REOPENED}). Reason: ${why}`,
      changedBy: userId ?? null,
      action: "UPDATE",
    });

    if (wo.Children.length) {
      await tx.workOrders.updateMany({
        where: { parent_work_order_id: wo.id },
        data: { phase: "ops" },
      });
      for (const c of wo.Children) {
        await logActivity(tx, {
          entityTypeId: WORK_ORDER_ENTITY_TYPE_ID,
          entityId: c.id,
          fieldChanged: "phase",
          previousValue: "finance",
          newValue: `ops (with parent ${wo.work_order_number}). Reason: ${why}`,
          changedBy: userId ?? null,
          action: "UPDATE",
        });
      }
    }

    return { id: wo.id, phase: "ops", status: reopened };
  });
}

/**
 * For a plain status change (PUT /:id): the new status has to belong to the
 * work order's phase, and a child that's in finance with its parent is
 * locked. Throws a PhaseError when it isn't allowed.
 */
export async function checkStatusChange(prisma, workOrderId, statusId) {
  const [wo, st] = await Promise.all([
    prisma.workOrders.findUnique({
      where: { id: workOrderId },
      select: { phase: true, parent_work_order_id: true },
    }),
    prisma.workOrderStatuses.findUnique({
      where: { id: statusId },
      select: { name: true, phase: true },
    }),
  ]);
  if (!wo) throw new PhaseError(404, "Work order not found");
  if (!st) throw new PhaseError(400, "Unknown status");
  const woPhase = phaseOf(wo);
  if (wo.parent_work_order_id && woPhase === "finance") {
    throw new PhaseError(
      409,
      "This work order is in finance with its parent. Send the parent back to ops to change it.",
    );
  }
  if ((st.phase ?? "ops") !== woPhase) {
    throw new PhaseError(
      409,
      woPhase === "ops"
        ? `"${st.name}" is a finance status. Move the work order to finance first.`
        : `"${st.name}" is an ops status. Send the work order back to ops first.`,
    );
  }
}
