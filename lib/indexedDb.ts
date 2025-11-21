
const DB_NAME = 'KieStudioDB';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

export interface StoredVideoBlob {
  id: string;
  blob: Blob;
  timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveVideoBlob = async (id: string, blob: Blob): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const record: StoredVideoBlob = {
      id,
      blob,
      timestamp: Date.now(),
    };
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getVideoBlob = async (id: string): Promise<Blob | undefined> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredVideoBlob | undefined;
      resolve(result?.blob);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllVideoBlobs = async (): Promise<Record<string, Blob>> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as StoredVideoBlob[];
      const map: Record<string, Blob> = {};
      results.forEach(r => {
        map[r.id] = r.blob;
      });
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
};
