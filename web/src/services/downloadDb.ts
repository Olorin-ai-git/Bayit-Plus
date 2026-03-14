const DB_NAME = "bayit-downloads";
const DB_VERSION = 1;
const STORE_DOWNLOADS = "downloads";
const STORE_BLOBS = "blobs";

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        const store = db.createObjectStore(STORE_DOWNLOADS, { keyPath: "id" });
        store.createIndex("contentId", "content_id", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "contentId" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(): Promise<T[]> {
  return withStore<T[]>(STORE_DOWNLOADS, "readonly", (store) => store.getAll());
}

export async function getById<T>(id: string): Promise<T | undefined> {
  return withStore<T | undefined>(STORE_DOWNLOADS, "readonly", (store) =>
    store.get(id),
  );
}

export async function getByContentId<T>(contentId: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, "readonly");
    const store = tx.objectStore(STORE_DOWNLOADS);
    const index = store.index("contentId");
    const req = index.getAll(contentId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put<T>(download: T): Promise<void> {
  await withStore(STORE_DOWNLOADS, "readwrite", (store) => store.put(download));
}

export async function deleteById(id: string): Promise<void> {
  await withStore(STORE_DOWNLOADS, "readwrite", (store) => store.delete(id));
}

export async function clear(): Promise<void> {
  await withStore(STORE_DOWNLOADS, "readwrite", (store) => store.clear());
}

export async function putBlob(contentId: string, blob: Blob): Promise<void> {
  await withStore(STORE_BLOBS, "readwrite", (store) =>
    store.put({ contentId, blob }),
  );
}

export async function getBlob(contentId: string): Promise<Blob | undefined> {
  const result = await withStore<{ contentId: string; blob: Blob } | undefined>(
    STORE_BLOBS,
    "readonly",
    (store) => store.get(contentId),
  );
  return result?.blob;
}

export async function deleteBlob(contentId: string): Promise<void> {
  await withStore(STORE_BLOBS, "readwrite", (store) => store.delete(contentId));
}
