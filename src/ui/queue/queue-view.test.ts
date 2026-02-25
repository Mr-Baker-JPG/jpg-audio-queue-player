import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { renderQueueView } from "./queue-view";
import type { QueueFolder, QueueItem } from "../../domain/types";

function track(id: number): QueueItem {
  return {
    id,
    file: new File(["a"], `${id}.mp3`, { type: "audio/mpeg" }),
    url: `blob:${id}`,
    durationSeconds: 42,
  };
}

describe("renderQueueView", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  afterEach(() => {
    (globalThis as { window: unknown }).window = originalWindow;
    (globalThis as { document: unknown }).document = originalDocument;
    vi.restoreAllMocks();
  });

  it("shows pause icon on the currently playing item", () => {
    const windowInstance = new Window();
    (globalThis as { window: unknown }).window = windowInstance;
    (globalThis as { document: unknown }).document = windowInstance.document;

    const queueList = document.createElement("ul") as HTMLUListElement;

    renderQueueView({
      queueList,
      folders: [{ id: 1, name: "Act I", isOpen: true, items: [track(1)] }],
      selectedFolderId: 1,
      selectedId: null,
      playingId: 1,
      audioPaused: false,
      audioCurrentTime: 10,
      getDraggedTrack: () => null,
      formatDuration: (seconds) => `${seconds}`,
      onFolderSelect: vi.fn(),
      onFolderToggle: vi.fn(),
      onFolderRename: vi.fn(),
      onTrackMoveToFolderEnd: vi.fn(() => false),
      onTrackSelect: vi.fn(),
      onTrackPlay: vi.fn(),
      onTrackMoveBefore: vi.fn(() => false),
      onTrackRemove: vi.fn(),
      onTrackDragStart: vi.fn(),
      onTrackDragEnd: vi.fn(),
      setStatus: vi.fn(),
    });

    const folderSection = queueList.children[0] as HTMLLIElement;
    const folderBody = folderSection.children[1] as HTMLDivElement;
    const row = folderBody.children[0] as HTMLDivElement;
    const playButton = row.children[1] as HTMLButtonElement;

    expect(playButton.getAttribute("title")).toBe("Pause");
    expect(playButton.innerHTML).toContain("<svg");
  });

  it("selects on row click and plays only from the explicit play button", () => {
    const windowInstance = new Window();
    (globalThis as { window: unknown }).window = windowInstance;
    (globalThis as { document: unknown }).document = windowInstance.document;

    const queueList = document.createElement("ul") as HTMLUListElement;
    const folders: QueueFolder[] = [
      {
        id: 1,
        name: "Act I",
        isOpen: true,
        items: [track(1)],
      },
    ];

    const onTrackPlay = vi.fn<(itemId: number, folderId: number) => void>();
    const onTrackSelect = vi.fn<(itemId: number, folderId: number) => void>();

    renderQueueView({
      queueList,
      folders,
      selectedFolderId: 1,
      selectedId: null,
      playingId: null,
      audioPaused: true,
      audioCurrentTime: 0,
      getDraggedTrack: () => null,
      formatDuration: (seconds) => `${seconds}`,
      onFolderSelect: vi.fn(),
      onFolderToggle: vi.fn(),
      onFolderRename: vi.fn(),
      onTrackMoveToFolderEnd: vi.fn(() => false),
      onTrackSelect,
      onTrackPlay,
      onTrackMoveBefore: vi.fn(() => false),
      onTrackRemove: vi.fn(),
      onTrackDragStart: vi.fn(),
      onTrackDragEnd: vi.fn(),
      setStatus: vi.fn(),
    });

    const folderSection = queueList.children[0] as HTMLLIElement;
    const folderBody = folderSection.children[1] as HTMLDivElement;
    const row = folderBody.children[0] as HTMLDivElement;
    const playButton = row.children[1] as HTMLButtonElement;
    const title = row.children[2] as HTMLSpanElement;

    row.dispatchEvent(new Event("click", { bubbles: true }));
    title.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onTrackSelect).toHaveBeenCalledWith(1, 1);
    expect(onTrackPlay).not.toHaveBeenCalled();

    playButton.dispatchEvent(new windowInstance.MouseEvent("click", { bubbles: true }) as unknown as Event);
    expect(onTrackPlay).toHaveBeenCalledTimes(1);
    expect(onTrackPlay).toHaveBeenCalledWith(1, 1);
  });

  it("drops to folder end when dragging onto the lower half of the last row", () => {
    const windowInstance = new Window();
    (globalThis as { window: unknown }).window = windowInstance;
    (globalThis as { document: unknown }).document = windowInstance.document;

    const queueList = document.createElement("ul") as HTMLUListElement;
    const onTrackMoveBefore = vi.fn<(sourceId: number, targetId: number) => boolean>(() => true);
    const onTrackMoveToFolderEnd = vi.fn<(itemId: number, folderId: number) => boolean>(() => true);

    renderQueueView({
      queueList,
      folders: [{ id: 1, name: "Act I", isOpen: true, items: [track(1), track(2)] }],
      selectedFolderId: 1,
      selectedId: null,
      playingId: null,
      audioPaused: true,
      audioCurrentTime: 0,
      getDraggedTrack: () => ({ itemId: 1, sourceFolderId: 1 }),
      formatDuration: (seconds) => `${seconds}`,
      onFolderSelect: vi.fn(),
      onFolderToggle: vi.fn(),
      onFolderRename: vi.fn(),
      onTrackMoveToFolderEnd,
      onTrackSelect: vi.fn(),
      onTrackPlay: vi.fn(),
      onTrackMoveBefore,
      onTrackRemove: vi.fn(),
      onTrackDragStart: vi.fn(),
      onTrackDragEnd: vi.fn(),
      setStatus: vi.fn(),
    });

    const folderSection = queueList.children[0] as HTMLLIElement;
    const folderBody = folderSection.children[1] as HTMLDivElement;
    const lastRow = folderBody.children[1] as HTMLDivElement;

    vi.spyOn(lastRow, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "clientY", { value: 90, configurable: true });
    lastRow.dispatchEvent(dropEvent);

    expect(onTrackMoveToFolderEnd).toHaveBeenCalledWith(1, 1);
    expect(onTrackMoveBefore).not.toHaveBeenCalled();
  });

  it("does not also move to folder end when dropping on a row", () => {
    const windowInstance = new Window();
    (globalThis as { window: unknown }).window = windowInstance;
    (globalThis as { document: unknown }).document = windowInstance.document;

    const queueList = document.createElement("ul") as HTMLUListElement;
    const onTrackMoveBefore = vi.fn<(sourceId: number, targetId: number) => boolean>(() => true);
    const onTrackMoveToFolderEnd = vi.fn<(itemId: number, folderId: number) => boolean>(() => true);

    renderQueueView({
      queueList,
      folders: [{ id: 1, name: "Act I", isOpen: true, items: [track(1), track(2)] }],
      selectedFolderId: 1,
      selectedId: null,
      playingId: null,
      audioPaused: true,
      audioCurrentTime: 0,
      getDraggedTrack: () => ({ itemId: 1, sourceFolderId: 1 }),
      formatDuration: (seconds) => `${seconds}`,
      onFolderSelect: vi.fn(),
      onFolderToggle: vi.fn(),
      onFolderRename: vi.fn(),
      onTrackMoveToFolderEnd,
      onTrackSelect: vi.fn(),
      onTrackPlay: vi.fn(),
      onTrackMoveBefore,
      onTrackRemove: vi.fn(),
      onTrackDragStart: vi.fn(),
      onTrackDragEnd: vi.fn(),
      setStatus: vi.fn(),
    });

    const folderSection = queueList.children[0] as HTMLLIElement;
    const folderBody = folderSection.children[1] as HTMLDivElement;
    const targetRow = folderBody.children[1] as HTMLDivElement;

    targetRow.dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));

    expect(onTrackMoveBefore).toHaveBeenCalledWith(1, 2);
    expect(onTrackMoveToFolderEnd).not.toHaveBeenCalled();
  });
});
