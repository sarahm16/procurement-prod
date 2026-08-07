// services/pandadoc/voidDocument.js
import axios from "axios";

const PANDADOC_BASE = "https://api.pandadoc.com/public/v1";

// authScheme: "Bearer" (user token) or "API-Key" (accounting) — same param pattern as pollUntilDraft
export async function voidDocument(
  pandadocId,
  token,
  { authScheme = "Bearer" } = {},
) {
  await axios.patch(
    `${PANDADOC_BASE}/documents/${pandadocId}/status`,
    { status: 11 }, // 11 = document.voided (Expired)
    { headers: { Authorization: `${authScheme} ${token}` } },
  );
}
