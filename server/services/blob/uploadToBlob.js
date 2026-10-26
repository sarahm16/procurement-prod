// services/blob/uploadToBlob.js
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

// The storage account name (e.g. "sarlaccstorage") — set as an app setting.
const ACCOUNT = "nfcaccountstorage";

// One service client for the process — DefaultAzureCredential resolves to the
// Web App's managed identity in prod, and your `az login` locally (same
// pattern as Key Vault).
let blobService = null;

// One container client per container name. (This used to be a single cached
// client, so whichever container was used first got reused for every later
// call: a warning photo uploaded first sent every vendor document to
// "sarlacc", and the other way round.)
const containers = new Map();

export function getContainerClient(containerName) {
  if (!containers.has(containerName)) {
    blobService ??= new BlobServiceClient(
      `https://${ACCOUNT}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
    containers.set(containerName, blobService.getContainerClient(containerName));
  }
  return containers.get(containerName);
}

/**
 * Upload a file buffer to blob storage.
 * @param {string} containerName - e.g. "vendor-documents"
 * @param {Buffer} buffer - the file bytes (from multer memoryStorage)
 * @param {string} blobPath - path/key within the container, e.g. "vendors/12/coi/123-cert.pdf"
 * @param {string} contentType - MIME type, so the browser renders it correctly on open
 * @returns {string} the blob URL
 */
export async function uploadToBlob(containerName, buffer, blobPath, contentType) {
  const container = getContainerClient(containerName);
  const blockBlob = container.getBlockBlobClient(blobPath);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlob.url;
}
