// services/blob/uploadToBlob.js
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

// The storage account name (e.g. "sarlaccstorage") — set as an app setting.
const ACCOUNT = "nfcaccountstorage";
const CONTAINER = "vendor-documents";

// One client for the process — DefaultAzureCredential resolves to the Web App's
// managed identity in prod, and your `az login` locally (same pattern as Key Vault).
let containerClient = null;

function getContainerClient() {
  if (containerClient) return containerClient;
  const blobService = new BlobServiceClient(
    `https://${ACCOUNT}.blob.core.windows.net`,
    new DefaultAzureCredential(),
  );
  containerClient = blobService.getContainerClient(CONTAINER);
  return containerClient;
}

/**
 * Upload a file buffer to blob storage.
 * @param {Buffer} buffer - the file bytes (from multer memoryStorage)
 * @param {string} blobPath - path/key within the container, e.g. "vendors/12/coi/123-cert.pdf"
 * @param {string} contentType - MIME type, so the browser renders it correctly on open
 * @returns {string} the blob URL
 */
export async function uploadToBlob(buffer, blobPath, contentType) {
  const container = getContainerClient();
  const blockBlob = container.getBlockBlobClient(blobPath);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlob.url;
}
