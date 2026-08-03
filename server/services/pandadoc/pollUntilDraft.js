// services/pandadoc/pollUntilDraft.js
import axios from "axios";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll a PandaDoc document until it reaches document.draft (ready to send).
 * PandaDoc processes newly-created documents asynchronously; they start in
 * document.uploaded and can't be sent until they're draft.
 *
 * @param {string} documentId - the PandaDoc document id
 * @param {string} token - the auth token (accounting or per-user)
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=10]
 * @param {number} [opts.delayMs=2000]
 * @param {string} [opts.authScheme="Bearer"] - "Bearer" for OAuth, "API-Key" for API keys
 * @returns the document data once in draft
 * @throws if the document errors, is rejected, or never reaches draft in time
 */
export async function pollUntilDraft(
  documentId,
  token,
  { maxAttempts = 10, delayMs = 2000, authScheme = "Bearer" } = {},
) {
  const headers = { Authorization: `${authScheme} ${token}` };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data } = await axios.get(
      `${PANDADOC_BASE}/documents/${documentId}`,
      { headers },
    );

    if (data.status === "document.draft") return data;

    if (
      data.status === "document.rejected" ||
      data.status === "document.error"
    ) {
      throw new Error(
        `Document ${documentId} failed processing: ${data.status}`,
      );
    }
    // still processing (document.uploaded) — wait and retry
    await sleep(delayMs);
  }

  throw new Error(
    `Document ${documentId} did not reach draft after ${maxAttempts} attempts`,
  );
}
