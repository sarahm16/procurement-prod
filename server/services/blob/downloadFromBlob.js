// services/blob/downloadFromBlob.js
//
// Read a blob back through the server. The app's own credential reads it, so
// this keeps working when a container stops being public.
import { getContainerClient } from "./uploadToBlob.js";

/**
 * Open a blob for reading.
 * @returns {{ stream, contentLength, contentType } | null}  null when the blob doesn't exist
 */
export async function downloadFromBlob(containerName, blobPath) {
  const blob = getContainerClient(containerName).getBlobClient(blobPath);
  try {
    const res = await blob.download();
    return {
      stream: res.readableStreamBody,
      contentLength: res.contentLength,
      contentType: res.contentType,
    };
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}
