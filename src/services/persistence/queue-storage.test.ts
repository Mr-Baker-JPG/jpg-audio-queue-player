import { describe, expect, it } from "vitest";
import { clearQueueState, loadQueueState, saveQueueState } from "./queue-storage";
import type { PersistedQueueState } from "../../domain/types";

interface MockOpenRequest {
  error: unknown;
  result: MockDatabase;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded: (() => void) | null;
}

interface MockDatabase {
  objectStoreNames: { contains: (name: string) => boolean };
  createObjectStore: (name: string) => void;
  transaction: (storeName: string, mode: "readonly" | "readwrite") => MockTransaction;
  close: () => void;
}

interface MockTransaction {
  objectStore: (name: string) => {
    get: (key: string) => MockRequest;
    put: (value: PersistedQueueState, key: string) => MockRequest;
    delete: (key: string) => MockRequest;
  };
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  error: unknown;
}

interface MockRequest {
  result: unknown;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

function queueTask(task: () => void): void {
  queueMicrotask(task);
}

function createIndexedDbMock() {
  const store = new Map<string, PersistedQueueState>();
  let hasStore = false;

  const makeRequest = (result: unknown, error: unknown = null): MockRequest => {
    const request: MockRequest = {
      result,
      error,
      onsuccess: null,
      onerror: null,
    };

    queueTask(() => {
      if (error) {
        request.onerror?.();
      } else {
        request.onsuccess?.();
      }
    });

    return request;
  };

  const db: MockDatabase = {
    objectStoreNames: {
      contains: () => hasStore,
    },
    createObjectStore: () => {
      hasStore = true;
    },
    transaction: () => {
      const tx: MockTransaction = {
        objectStore: () => ({
          get: (key: string) => {
            const request = makeRequest(store.get(key) ?? undefined);
            queueTask(() => {
              tx.oncomplete?.();
            });
            return request;
          },
          put: (value: PersistedQueueState, key: string) => {
            store.set(key, value);
            const request = makeRequest(undefined);
            queueTask(() => {
              tx.oncomplete?.();
            });
            return request;
          },
          delete: (key: string) => {
            store.delete(key);
            const request = makeRequest(undefined);
            queueTask(() => {
              tx.oncomplete?.();
            });
            return request;
          },
        }),
        oncomplete: null,
        onerror: null,
        error: null,
      };
      return tx;
    },
    close: () => {},
  };

  const indexedDb = {
    open: () => {
      const request: MockOpenRequest = {
        error: null,
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      queueTask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });

      return request;
    },
  };

  return { indexedDb, store };
}

function createFailingIndexedDbMock(mode: "load-request" | "save-request" | "save-tx" | "clear-request" | "clear-tx") {
  const db: MockDatabase = {
    objectStoreNames: {
      contains: () => true,
    },
    createObjectStore: () => {},
    transaction: (_storeName: string, txMode: "readonly" | "readwrite") => {
      const tx: MockTransaction = {
        objectStore: () => ({
          get: () => {
            const request: MockRequest = { result: undefined, error: new Error("load request failed"), onsuccess: null, onerror: null };
            queueTask(() => {
              if (mode === "load-request") {
                request.onerror?.();
              } else {
                request.onsuccess?.();
              }
              tx.oncomplete?.();
            });
            return request;
          },
          put: () => {
            const request: MockRequest = { result: undefined, error: new Error("save request failed"), onsuccess: null, onerror: null };
            queueTask(() => {
              if (mode === "save-request") {
                request.onerror?.();
              } else {
                request.onsuccess?.();
              }

              if (mode === "save-tx" && txMode === "readwrite") {
                tx.error = new Error("save tx failed");
                tx.onerror?.();
                return;
              }

              tx.oncomplete?.();
            });
            return request;
          },
          delete: () => {
            const request: MockRequest = { result: undefined, error: new Error("clear request failed"), onsuccess: null, onerror: null };
            queueTask(() => {
              if (mode === "clear-request") {
                request.onerror?.();
              } else {
                request.onsuccess?.();
              }

              if (mode === "clear-tx" && txMode === "readwrite") {
                tx.error = new Error("clear tx failed");
                tx.onerror?.();
                return;
              }

              tx.oncomplete?.();
            });
            return request;
          },
        }),
        oncomplete: null,
        onerror: null,
        error: null,
      };

      return tx;
    },
    close: () => {},
  };

  const indexedDb = {
    open: () => {
      const request: MockOpenRequest = {
        error: null,
        result: db,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      queueTask(() => {
        request.onsuccess?.();
      });

      return request;
    },
  };

  return indexedDb;
}

describe("queue storage service", () => {
  it("saves, loads, and clears queue state", async () => {
    const mock = createIndexedDbMock();
    (globalThis as { indexedDB: unknown }).indexedDB = mock.indexedDb as unknown as IDBFactory;

    const payload: PersistedQueueState = {
      nextItemId: 2,
      nextFolderId: 2,
      selectedId: 1,
      selectedFolderId: 1,
      folders: [
        {
          id: 1,
          name: "Act I",
          isOpen: true,
          items: [
            {
              id: 1,
              file: new File(["a"], "a.mp3", { type: "audio/mpeg" }),
              durationSeconds: 10,
            },
          ],
        },
      ],
    };

    await saveQueueState(payload);
    const loaded = await loadQueueState();
    expect(loaded).toEqual(payload);

    await clearQueueState();
    const cleared = await loadQueueState();
    expect(cleared).toBeNull();
  });

  it("rejects when opening indexedDB fails", async () => {
    const indexedDb = {
      open: () => {
        const request: MockOpenRequest = {
          error: new Error("open failed"),
          result: {} as MockDatabase,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };

        queueTask(() => {
          request.onerror?.();
        });

        return request;
      },
    };

    (globalThis as { indexedDB: unknown }).indexedDB = indexedDb as unknown as IDBFactory;

    await expect(loadQueueState()).rejects.toThrow("open failed");
  });

  it("rejects on load request errors", async () => {
    (globalThis as { indexedDB: unknown }).indexedDB = createFailingIndexedDbMock("load-request") as unknown as IDBFactory;
    await expect(loadQueueState()).rejects.toThrow("load request failed");
  });

  it("rejects on save request and transaction errors", async () => {
    const payload: PersistedQueueState = {
      nextItemId: 1,
      nextFolderId: 1,
      selectedId: null,
      selectedFolderId: null,
      folders: [],
    };

    (globalThis as { indexedDB: unknown }).indexedDB = createFailingIndexedDbMock("save-request") as unknown as IDBFactory;
    await expect(saveQueueState(payload)).rejects.toThrow("save request failed");

    (globalThis as { indexedDB: unknown }).indexedDB = createFailingIndexedDbMock("save-tx") as unknown as IDBFactory;
    await expect(saveQueueState(payload)).rejects.toThrow("save tx failed");
  });

  it("rejects on clear request and transaction errors", async () => {
    (globalThis as { indexedDB: unknown }).indexedDB = createFailingIndexedDbMock("clear-request") as unknown as IDBFactory;
    await expect(clearQueueState()).rejects.toThrow("clear request failed");

    (globalThis as { indexedDB: unknown }).indexedDB = createFailingIndexedDbMock("clear-tx") as unknown as IDBFactory;
    await expect(clearQueueState()).rejects.toThrow("clear tx failed");
  });
});
