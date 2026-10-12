// utils/complianceDocs.js
//
// The one spelling of each vendor compliance document type, as stored in
// VendorComplianceDocuments.document_type. Read and write through these —
// never type the string — so the sourcing views, work orders, assignable
// vendors and the handoff checklist all agree.
export const DOC_TYPES = Object.freeze({
  W9: "W9",
  ACH: "ACH",
  MSA: "MSA",
});

/** A document counts once it's been completed (PandaDoc webhook sets the date). */
export const isCompleted = (doc) => doc?.date_completed != null;

/** Does this vendor's list of documents include a completed one of `type`? */
export const hasCompletedDoc = (docs = [], type) =>
  docs.some((d) => d.document_type === type && isCompleted(d));
