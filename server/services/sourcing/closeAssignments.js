// services/sourcing/closeAssignments.js
//
// Taking a vendor off service lines, for any documented reason: the
// termination notice now, the end-of-service form later. Kept out of the
// routes so every way a vendor comes off a line does it the same way.
//
// For each assignment:
//   - it's closed (never deleted), with when, why and which notice
//   - if the vendor was the PRIMARY on the line, the line is flagged
//     "Resource now" so it jumps to the top of the Sourcing page — unless
//     the caller says that line doesn't need sourcing yet (opts.flagIds).
//     The flag clears when a primary is put back (see clearResourcingFlag).
//     An unflagged line still shows on the Sourcing page without a vendor;
//     it just isn't pushed to the top.
//
// Must run inside a transaction: pass the `tx` client.

/** Statuses are looked up by category so ids can differ between environments. */
export async function statusByCategory(tx, category) {
  const s = await tx.vendorSiteStatuses.findFirst({
    where: { category },
    orderBy: { id: "asc" },
  });
  if (!s) {
    throw new Error(`No VendorSiteStatuses row with category '${category}' — seed the table`);
  }
  return s;
}

/**
 * Clear a line's "Resource now" flag. Called wherever a primary gets put on a
 * line: assign, replace and make-primary all do.
 */
export function clearResourcingFlag(tx, contractSiteId) {
  return tx.contractSites.updateMany({
    where: { id: contractSiteId, resource_needed_at: { not: null } },
    data: {
      resource_needed_at: null,
      resource_reason: null,
      resource_flagged_by: null,
    },
  });
}

/**
 * Close a vendor's assignments.
 *
 * @param tx              transaction client
 * @param assignments     VendorContractSites rows (id, contract_site_id, is_primary)
 * @param opts.reason     short reason saved on each row ("Terminated", …)
 * @param opts.notes      longer explanation (optional)
 * @param opts.noticeId   VendorWarnings id the removal is documented by (optional)
 * @param opts.flagReason text shown on flagged lines in sourcing
 * @param opts.userId     employee doing it
 * @param opts.flagIds    assignment ids whose lines should be flagged
 *                        "Resource now". Omit to flag every primary line
 *                        (the old behaviour). Only primaries are ever flagged.
 * @returns { closed, flagged, not_flagged }  counts; not_flagged = primary
 *          lines left unflagged by choice
 */
export async function closeAssignments(
  tx,
  assignments,
  { reason, notes = null, noticeId = null, flagReason, userId = null, flagIds = null },
) {
  if (!assignments.length) return { closed: 0, flagged: 0, not_flagged: 0 };
  const shouldFlag = (a) => a.is_primary && (!flagIds || flagIds.has(a.id));

  const closedStatus = await statusByCategory(tx, "closed");
  const now = new Date();
  let flagged = 0;
  let notFlagged = 0;

  for (const a of assignments) {
    // Clear primary as part of closing: the unique index allows one primary
    // per line, and whoever replaces them will need the slot.
    await tx.vendorContractSites.update({
      where: { id: a.id },
      data: {
        status_id: closedStatus.id,
        is_primary: false,
        removed_at: now,
        removed_reason: reason,
        removed_notes: notes ? String(notes).slice(0, 500) : null,
        removed_by: userId ? Number(userId) : null,
        notice_id: noticeId,
      },
    });

    if (a.is_primary && !shouldFlag(a)) notFlagged += 1;
    if (shouldFlag(a)) {
      await tx.contractSites.update({
        where: { id: a.contract_site_id },
        data: {
          resource_needed_at: now,
          resource_reason: String(flagReason ?? reason).slice(0, 300),
          resource_flagged_by: userId ? Number(userId) : null,
        },
      });
      flagged += 1;
    }
  }

  return { closed: assignments.length, flagged, not_flagged: notFlagged };
}
