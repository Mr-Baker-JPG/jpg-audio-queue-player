import { DB_NAME, DB_VERSION, STATE_KEY, STORE_NAME } from "../../app/config";
import type { PersistedQueueState } from "../../domain/types";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export async function loadQueueState(): Promise<PersistedQueueState | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STATE_KEY);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve((request.result as PersistedQueueState | undefined) ?? null);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function saveQueueState(payload: PersistedQueueState): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(payload, STATE_KEY);

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      resolve();
      db.close();
    };

    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

export async function clearQueueState(): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(STATE_KEY);

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      resolve();
      db.close();
    };

    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}
