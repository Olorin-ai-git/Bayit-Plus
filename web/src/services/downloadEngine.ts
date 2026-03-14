import { putBlob, getBlob } from "./downloadDb";

interface DownloadResult {
  blob: Blob;
  size: number;
}

const activeControllers = new Map<string, AbortController>();
const partialBytes = new Map<string, number>();

export async function startDownload(
  url: string,
  contentId: string,
  onProgress: (bytes: number, total: number) => void,
): Promise<DownloadResult> {
  const controller = new AbortController();
  activeControllers.set(contentId, controller);

  const response = await fetch(url, { signal: controller.signal });

  if (!response.ok) {
    activeControllers.delete(contentId);
    throw new Error(`HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();

  if (!reader) {
    activeControllers.delete(contentId);
    throw new Error("ReadableStream not supported");
  }

  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, contentLength);
  }

  activeControllers.delete(contentId);
  partialBytes.delete(contentId);

  const blob = new Blob(chunks);
  await putBlob(contentId, blob);
  return { blob, size: blob.size };
}

export async function resumeDownload(
  url: string,
  contentId: string,
  onProgress: (bytes: number, total: number) => void,
): Promise<DownloadResult> {
  const controller = new AbortController();
  activeControllers.set(contentId, controller);

  const bytesAlreadyReceived = partialBytes.get(contentId) ?? 0;

  const headers: HeadersInit =
    bytesAlreadyReceived > 0 ? { Range: `bytes=${bytesAlreadyReceived}-` } : {};

  const response = await fetch(url, { signal: controller.signal, headers });

  if (!response.ok && response.status !== 206) {
    activeControllers.delete(contentId);
    throw new Error(`HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body?.getReader();

  if (!reader) {
    activeControllers.delete(contentId);
    throw new Error("ReadableStream not supported");
  }

  const chunks: Uint8Array[] = [];
  let received = bytesAlreadyReceived;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received, contentLength + bytesAlreadyReceived);
  }

  activeControllers.delete(contentId);
  partialBytes.delete(contentId);

  const existingBlob = await getBlob(contentId);
  const allParts = existingBlob ? [existingBlob, ...chunks] : chunks;
  const blob = new Blob(allParts);
  await putBlob(contentId, blob);
  return { blob, size: blob.size };
}

export function pauseDownload(contentId: string): void {
  const controller = activeControllers.get(contentId);
  if (controller) {
    controller.abort();
    activeControllers.delete(contentId);
  }
}

export function isActiveDownload(contentId: string): boolean {
  return activeControllers.has(contentId);
}

export function recordPartialProgress(contentId: string, bytes: number): void {
  partialBytes.set(contentId, bytes);
}
