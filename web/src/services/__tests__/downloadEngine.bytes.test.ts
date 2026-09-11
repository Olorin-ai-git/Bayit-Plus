import { startDownload, resumeDownload } from '../downloadEngine';
import { getBlob, putBlob } from '../downloadDb';

jest.mock('../downloadDb', () => ({ getBlob: jest.fn(), putBlob: jest.fn() }));
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

function streamBytes() {
  const shared = new Uint8Array(new SharedArrayBuffer(4));
  shared.set([8, 1, 2, 9]);
  let read = false;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => '2' }, body: { getReader: () => ({ read: async () => {
    if (read) { shared.fill(0); return { done: true }; }
    read = true;
    return { done: false, value: shared.subarray(1, 3) };
  } }) } });
}
function bytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.readAsArrayBuffer(blob);
  });
}

test('start owns exact streamed view bytes before constructing its Blob', async () => {
  streamBytes();
  const progress = jest.fn();
  const result = await startDownload('https://example.com/media', 'start-bytes', progress);
  expect(await bytes(result.blob)).toEqual([1, 2]);
  expect(result.size).toBe(2);
  expect(progress).toHaveBeenCalledWith(2, 2);
  expect(putBlob).toHaveBeenCalledWith('start-bytes', result.blob);
});

test('resume preserves existing content and owns new streamed view bytes', async () => {
  streamBytes();
  jest.mocked(getBlob).mockResolvedValue(new Blob([new Uint8Array([7])]));
  const result = await resumeDownload('https://example.com/media', 'resume-bytes', jest.fn());
  expect(await bytes(result.blob)).toEqual([7, 1, 2]);
  expect(result.size).toBe(3);
  expect(putBlob).toHaveBeenCalledWith('resume-bytes', result.blob);
});
