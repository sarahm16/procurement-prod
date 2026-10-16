// services/mail.js
//
// Sends email from the server through Microsoft Graph, as a shared mailbox,
// with no one signed in. The ops app's sendEmailFromHTML runs in the browser
// as the signed-in employee; vendor sign-in codes have no employee behind
// them, so the server sends them itself with an app registration.
//
// .env:
//   NFC_GRAPH_TENANT_ID      your Microsoft 365 tenant id
//   NFC_GRAPH_CLIENT_ID      the app registration's client id
//   NFC_GRAPH_CLIENT_SECRET  a client secret for that app registration
//   PORTAL_MAIL_FROM     the mailbox it sends as, e.g. portal@yourdomain.com
//
// Uses Node's built-in fetch (Node 18+), so there's nothing to install.

let cachedToken = null; // { value, expiresAt }

async function getGraphToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { NFC_GRAPH_TENANT_ID, NFC_GRAPH_CLIENT_ID, NFC_GRAPH_CLIENT_SECRET } =
    process.env;
  if (
    !NFC_GRAPH_TENANT_ID ||
    !NFC_GRAPH_CLIENT_ID ||
    !NFC_GRAPH_CLIENT_SECRET
  ) {
    throw new Error(
      "Graph mail isn't configured (NFC_GRAPH_* env vars missing)",
    );
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${NFC_GRAPH_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: NFC_GRAPH_CLIENT_ID,
        client_secret: NFC_GRAPH_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `Graph token request failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

/** Send one HTML email. Throws if Graph refuses it. */
export async function sendMail({ to, subject, html }) {
  const from = process.env.PORTAL_MAIL_FROM;
  if (!from) throw new Error("PORTAL_MAIL_FROM isn't set");

  const token = await getGraphToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: false,
      }),
    },
  );
  // Graph answers 202 Accepted with no body.
  if (!res.ok) {
    throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
  }
}
