import { afterEach, describe, expect, it, vi } from "vitest";
import { setupQueueController } from "./queue-controller";

class MockInput extends EventTarget {
  files: FileList | null = null;
  value = "";
}

class MockButton extends EventTarget {}

class MockDiv extends EventTarget {
  classList = {
    add: vi.fn<(token: string) => void>(),
    remove: vi.fn<(token: string) => void>(),
  };
}

function makeFileList(files: File[]): FileList {
  const listLike: Record<number | "length" | "item", File | number | ((index: number) => File | null)> = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  };

  files.forEach((file, index) => {
    listLike[index] = file;
  });

  return listLike as unknown as FileList;
}

function makeDropEvent(files: File[]): Event {
  const event = new Event("drop", { cancelable: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files: makeFileList(files) },
    configurable: true,
  });
  return event;
}

describe("setupQueueController", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.restoreAllMocks();
  });

  it("handles file input changes and resets the file value", () => {
    const fileInput = new MockInput();
    const addFiles = vi.fn<(files: FileList | File[]) => void>();

    setupQueueController({
      fileInput: fileInput as unknown as HTMLInputElement,
      addFolderButton: new MockButton() as unknown as HTMLButtonElement,
      clearQueueButton: new MockButton() as unknown as HTMLButtonElement,
      dropZone: new MockDiv() as unknown as HTMLDivElement,
      openHelpButton: new MockButton() as unknown as HTMLButtonElement,
      closeHelpButton: new MockButton() as unknown as HTMLButtonElement,
      resetStorageButton: new MockButton() as unknown as HTMLButtonElement,
      helpModal: new MockDiv() as unknown as HTMLDivElement,
      addFiles,
      createFolder: () => ({ name: "Act I" }),
      clearQueue: vi.fn(),
      persistQueueState: vi.fn(),
      renderQueue: vi.fn(),
      openHelpModal: vi.fn(),
      closeHelpModal: vi.fn(),
      clearPersistedQueueState: vi.fn(async () => {}),
      showToast: vi.fn(),
      setStatus: vi.fn(),
    });

    fileInput.files = null;
    fileInput.dispatchEvent(new Event("change"));
    expect(addFiles).not.toHaveBeenCalled();

    const file = new File(["a"], "a.mp3", { type: "audio/mpeg" });
    fileInput.value = "not-empty";
    fileInput.files = makeFileList([file]);
    fileInput.dispatchEvent(new Event("change"));

    expect(addFiles).toHaveBeenCalledTimes(1);
    expect(fileInput.value).toBe("");
  });

  it("creates folders and triggers persistence + render", () => {
    const setStatus = vi.fn<(message: string) => void>();
    const persistQueueState = vi.fn<() => void>();
    const renderQueue = vi.fn<() => void>();
    const addFolderButton = new MockButton();

    setupQueueController({
      fileInput: new MockInput() as unknown as HTMLInputElement,
      addFolderButton: addFolderButton as unknown as HTMLButtonElement,
      clearQueueButton: new MockButton() as unknown as HTMLButtonElement,
      dropZone: new MockDiv() as unknown as HTMLDivElement,
      openHelpButton: new MockButton() as unknown as HTMLButtonElement,
      closeHelpButton: new MockButton() as unknown as HTMLButtonElement,
      resetStorageButton: new MockButton() as unknown as HTMLButtonElement,
      helpModal: new MockDiv() as unknown as HTMLDivElement,
      addFiles: vi.fn(),
      createFolder: () => ({ name: "Act III" }),
      clearQueue: vi.fn(),
      persistQueueState,
      renderQueue,
      openHelpModal: vi.fn(),
      closeHelpModal: vi.fn(),
      clearPersistedQueueState: vi.fn(async () => {}),
      showToast: vi.fn(),
      setStatus,
    });

    addFolderButton.dispatchEvent(new Event("click"));

    expect(setStatus).toHaveBeenCalledWith("Act III created. Double-click folder name to rename.");
    expect(persistQueueState).toHaveBeenCalledTimes(1);
    expect(renderQueue).toHaveBeenCalledTimes(1);
  });

  it("drops files from drag-and-drop", () => {
    const dropZone = new MockDiv();
    const addFiles = vi.fn<(files: FileList | File[]) => void>();

    setupQueueController({
      fileInput: new MockInput() as unknown as HTMLInputElement,
      addFolderButton: new MockButton() as unknown as HTMLButtonElement,
      clearQueueButton: new MockButton() as unknown as HTMLButtonElement,
      dropZone: dropZone as unknown as HTMLDivElement,
      openHelpButton: new MockButton() as unknown as HTMLButtonElement,
      closeHelpButton: new MockButton() as unknown as HTMLButtonElement,
      resetStorageButton: new MockButton() as unknown as HTMLButtonElement,
      helpModal: new MockDiv() as unknown as HTMLDivElement,
      addFiles,
      createFolder: () => ({ name: "Act I" }),
      clearQueue: vi.fn(),
      persistQueueState: vi.fn(),
      renderQueue: vi.fn(),
      openHelpModal: vi.fn(),
      closeHelpModal: vi.fn(),
      clearPersistedQueueState: vi.fn(async () => {}),
      showToast: vi.fn(),
      setStatus: vi.fn(),
    });

    const file = new File(["x"], "x.mp3", { type: "audio/mpeg" });
    dropZone.dispatchEvent(makeDropEvent([file]));

    expect(dropZone.classList.remove).toHaveBeenCalledWith("active");
    expect(addFiles).toHaveBeenCalledTimes(1);
  });

  it("opens/closes help, clears queue, and handles drop-zone hover states", () => {
    const openHelpModal = vi.fn<() => void>();
    const closeHelpModal = vi.fn<() => void>();
    const clearQueue = vi.fn<() => void>();
    const dropZone = new MockDiv();
    const helpModal = new MockDiv();
    const openHelpButton = new MockButton();
    const closeHelpButton = new MockButton();
    const clearQueueButton = new MockButton();

    setupQueueController({
      fileInput: new MockInput() as unknown as HTMLInputElement,
      addFolderButton: new MockButton() as unknown as HTMLButtonElement,
      clearQueueButton: clearQueueButton as unknown as HTMLButtonElement,
      dropZone: dropZone as unknown as HTMLDivElement,
      openHelpButton: openHelpButton as unknown as HTMLButtonElement,
      closeHelpButton: closeHelpButton as unknown as HTMLButtonElement,
      resetStorageButton: new MockButton() as unknown as HTMLButtonElement,
      helpModal: helpModal as unknown as HTMLDivElement,
      addFiles: vi.fn(),
      createFolder: () => ({ name: "Act I" }),
      clearQueue,
      persistQueueState: vi.fn(),
      renderQueue: vi.fn(),
      openHelpModal,
      closeHelpModal,
      clearPersistedQueueState: vi.fn(async () => {}),
      showToast: vi.fn(),
      setStatus: vi.fn(),
    });

    openHelpButton.dispatchEvent(new Event("click"));
    closeHelpButton.dispatchEvent(new Event("click"));
    clearQueueButton.dispatchEvent(new Event("click"));
    helpModal.dispatchEvent(new Event("click"));

    const dragOver = new Event("dragover", { cancelable: true });
    dropZone.dispatchEvent(dragOver);
    dropZone.dispatchEvent(new Event("dragleave"));

    expect(openHelpModal).toHaveBeenCalledTimes(1);
    expect(closeHelpModal).toHaveBeenCalledTimes(2);
    expect(clearQueue).toHaveBeenCalledTimes(1);
    expect(dragOver.defaultPrevented).toBe(true);
    expect(dropZone.classList.add).toHaveBeenCalledWith("active");
    expect(dropZone.classList.remove).toHaveBeenCalledWith("active");
  });

  it("resets storage and reloads when confirmed", async () => {
    const clearPersistedQueueState = vi.fn(async () => {});
    const showToast = vi.fn<(message: string, state?: "saved" | "saving" | "error", durationMs?: number) => void>();
    const reload = vi.fn<() => void>();

    globalThis.window = {
      confirm: () => true,
      setTimeout: (callback: TimerHandler) => {
        (callback as () => void)();
        return 1;
      },
      location: { reload },
    } as unknown as Window & typeof globalThis;

    const resetStorageButton = new MockButton();

    setupQueueController({
      fileInput: new MockInput() as unknown as HTMLInputElement,
      addFolderButton: new MockButton() as unknown as HTMLButtonElement,
      clearQueueButton: new MockButton() as unknown as HTMLButtonElement,
      dropZone: new MockDiv() as unknown as HTMLDivElement,
      openHelpButton: new MockButton() as unknown as HTMLButtonElement,
      closeHelpButton: new MockButton() as unknown as HTMLButtonElement,
      resetStorageButton: resetStorageButton as unknown as HTMLButtonElement,
      helpModal: new MockDiv() as unknown as HTMLDivElement,
      addFiles: vi.fn(),
      createFolder: () => ({ name: "Act I" }),
      clearQueue: vi.fn(),
      persistQueueState: vi.fn(),
      renderQueue: vi.fn(),
      openHelpModal: vi.fn(),
      closeHelpModal: vi.fn(),
      clearPersistedQueueState,
      showToast,
      setStatus: vi.fn(),
    });

    resetStorageButton.dispatchEvent(new Event("click"));
    await Promise.resolve();

    expect(clearPersistedQueueState).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("Local storage reset. Reloading…", "saved", 1200);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reset storage when cancelled and shows errors on failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const clearPersistedQueueState = vi.fn(async () => {
      throw new Error("fail");
    });
    const showToast = vi.fn<(message: string, state?: "saved" | "saving" | "error", durationMs?: number) => void>();

    globalThis.window = {
      confirm: () => false,
      setTimeout,
      location: { reload: vi.fn() },
    } as unknown as Window & typeof globalThis;

    const resetStorageButton = new MockButton();

    setupQueueController({
      fileInput: new MockInput() as unknown as HTMLInputElement,
      addFolderButton: new MockButton() as unknown as HTMLButtonElement,
      clearQueueButton: new MockButton() as unknown as HTMLButtonElement,
      dropZone: new MockDiv() as unknown as HTMLDivElement,
      openHelpButton: new MockButton() as unknown as HTMLButtonElement,
      closeHelpButton: new MockButton() as unknown as HTMLButtonElement,
      resetStorageButton: resetStorageButton as unknown as HTMLButtonElement,
      helpModal: new MockDiv() as unknown as HTMLDivElement,
      addFiles: vi.fn(),
      createFolder: () => ({ name: "Act I" }),
      clearQueue: vi.fn(),
      persistQueueState: vi.fn(),
      renderQueue: vi.fn(),
      openHelpModal: vi.fn(),
      closeHelpModal: vi.fn(),
      clearPersistedQueueState,
      showToast,
      setStatus: vi.fn(),
    });

    resetStorageButton.dispatchEvent(new Event("click"));
    expect(clearPersistedQueueState).not.toHaveBeenCalled();

    globalThis.window = {
      confirm: () => true,
      setTimeout,
      location: { reload: vi.fn() },
    } as unknown as Window & typeof globalThis;

    resetStorageButton.dispatchEvent(new Event("click"));
    await Promise.resolve();
    await Promise.resolve();

    expect(showToast).toHaveBeenCalledWith("Could not reset local storage", "error");
  });
});
