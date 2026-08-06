// services/pandadoc/oauth.js
import axios from "axios";
import prisma from "../../db.js";

const PANDADOC_AUTH_URL = "https://app.pandadoc.com/oauth2/authorize";
const PANDADOC_TOKEN_URL = "https://api.pandadoc.com/oauth2/access_token";

// Build the URL to send the user to PandaDoc for authorization.
export function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.PANDADOC_CLIENT_ID,
    redirect_uri: process.env.PANDADOC_REDIRECT_URI,
    scope: "read+write", // confirm the exact scopes you need from PandaDoc docs
    response_type: "code",
    state,
  });
  return `${PANDADOC_AUTH_URL}?${params.toString()}`;
}

// Exchange the authorization code for tokens.
export async function exchangeCodeForTokens(code) {
  const { data } = await axios.post(
    PANDADOC_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.PANDADOC_CLIENT_ID,
      client_secret: process.env.PANDADOC_CLIENT_SECRET,
      code,
      redirect_uri: process.env.PANDADOC_REDIRECT_URI,
      scope: "read+write",
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );
  return data; // { access_token, refresh_token, expires_in, ... }
}

// Store (or update) a user's tokens.
export async function storeUserTokens(employeeId, tokens) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await prisma.pandaDocUserTokens.upsert({
    where: { employee_id: employeeId },
    update: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    },
    create: {
      employee_id: employeeId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
    },
  });
}
