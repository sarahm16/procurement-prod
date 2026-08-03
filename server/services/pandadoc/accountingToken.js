// services/pandadoc/accountingToken.js
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

const client = new SecretClient(
  `https://sarlacc-vault.vault.azure.net`,
  new DefaultAzureCredential(),
);

let cached = null;
let fetchedAt = 0;
const TTL_MS = 1000 * 60 * 60; // re-fetch hourly (token lasts a year; hourly is plenty fresh)

export async function getAccountingToken() {
  const now = Date.now();
  if (cached && now - fetchedAt < TTL_MS) return cached;

  const secret = await client.getSecret("pandaDocAccountingToken");
  cached = secret.value;
  fetchedAt = now;
  return cached;
}
