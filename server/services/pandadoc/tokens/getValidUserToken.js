// services/pandadoc/getValidUserToken.js
import axios from "axios";
import prisma from "../../../db.js";

const PANDADOC_TOKEN_URL = "https://api.pandadoc.com/oauth2/access_token";

// Refresh a bit early so a token doesn't expire mid-request
const EXPIRY_BUFFER_MS = 60 * 1000; // 1 minute

// Sentinel the send path checks for → triggers the client re-auth prompt
export class PandaDocReauthRequired extends Error {
  constructor(employeeId) {
    super(`PandaDoc re-authentication required for employee ${employeeId}`);
    this.name = "PandaDocReauthRequired";
    this.needsPandaDocAuth = true;
  }
}

async function refreshTokens(refreshToken) {
  const { data } = await axios.post(
    PANDADOC_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.PANDADOC_CLIENT_ID,
      client_secret: process.env.PANDADOC_CLIENT_SECRET,
      refresh_token: refreshToken,
      scope: "read+write", // match the scopes you authorized with
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
  return data; // { access_token, refresh_token, expires_in }
}

/**
 * Returns a usable PandaDoc access token for a user.
 * Three outcomes:
 *   - valid token → return it
 *   - expired but refreshable → refresh, persist, return new one
 *   - no record or refresh fails → throw PandaDocReauthRequired
 */
export async function getValidUserToken(employeeId) {
  const record = await prisma.pandaDocUserTokens.findUnique({
    where: { employee_id: employeeId },
  });

  // Never connected
  if (!record) throw new PandaDocReauthRequired(employeeId);

  // Still valid (with buffer) → use as-is
  if (record.expires_at.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return record.access_token;
  }

  // Expired → try to refresh
  try {
    const tokens = await refreshTokens(record.refresh_token);

    const updated = await prisma.pandaDocUserTokens.update({
      where: { employee_id: employeeId },
      data: {
        access_token: tokens.access_token,
        // PandaDoc may or may not return a new refresh token — keep old if absent
        refresh_token: tokens.refresh_token ?? record.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return updated.access_token;
  } catch (err) {
    // Refresh token dead/revoked → user must reconnect
    console.error(
      "PandaDoc refresh failed for employee",
      employeeId,
      err.response?.data ?? err.message,
    );
    throw new PandaDocReauthRequired(employeeId);
  }
}
