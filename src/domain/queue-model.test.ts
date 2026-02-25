import { describe, expect, it } from "vitest";
import {
  createFolder,
  findTrackLocation,
  getAllItems,
  getFlattenedTrackIds,
  getVisibleTrackIds,
  moveTrackAfterTarget,
  moveTrackBeforeTarget,
  moveTrackToFolderEnd,
} from "./queue-model";
import type { QueueFolder, QueueItem } from "./types";

function track(id: number): QueueItem {
  return {
    id,
    file: new File([new Uint8Array([1])], `${id}.mp3`, { type: "audio/mpeg" }),
    url: `blob:${id}`,
    durationSeconds: id,
  };
}

function sampleFolders(): QueueFolder[] {
  return [
    { id: 1, name: "Act I", isOpen: true, items: [track(1), track(2)] },
    { id: 2, name: "Act II", isOpen: false, items: [track(3)] },
  ];
}

class NoMovedItemArray extends Array<QueueItem> {
  override splice(
    _start: number,
    _deleteCount?: number,
    ..._items: QueueItem[]
  ): QueueItem[] {
    return [];
  }
}

class RemoveTargetOnSpliceArray extends Array<QueueItem> {
  constructor(
    private readonly targetId: number,
    ...items: QueueItem[]
  ) {
    super(...items);
  }

  override splice(
    start: number,
    deleteCount?: number,
    ...items: QueueItem[]
  ): QueueItem[] {
    const removed = super.splice(start, deleteCount ?? 0, ...items);
    const targetIndex = this.findIndex((item) => item.id === this.targetId);
    if (targetIndex >= 0) {
      super.splice(targetIndex, 1);
    }

    return removed;
  }
}

describe("queue-model", () => {
  it("creates folder with incremented id", () => {
    const result = createFolder([], 5, "Act I", true);
    expect(result.folder.id).toBe(5);
    expect(result.nextFolderId).toBe(6);
    expect(result.folders).toHaveLength(1);
  });

  it("returns visible track ids from open folders only", () => {
    expect(getVisibleTrackIds(sampleFolders())).toEqual([1, 2]);
  });

  it("returns flattened track ids", () => {
    expect(getFlattenedTrackIds(sampleFolders())).toEqual([1, 2, 3]);
  });

  it("finds track location", () => {
    const location = findTrackLocation(sampleFolders(), 2);
    expect(location?.folder.id).toBe(1);
    expect(location?.itemIndex).toBe(1);
  });

  it("returns null when track location does not exist", () => {
    expect(findTrackLocation(sampleFolders(), 999)).toBeNull();
  });

  it("moves track before target", () => {
    const folders = sampleFolders();
    expect(moveTrackBeforeTarget(folders, 2, 1)).toBe(true);
    expect(getAllItems(folders).map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it("does not move before when ids are the same", () => {
    const folders = sampleFolders();
    expect(moveTrackBeforeTarget(folders, 1, 1)).toBe(false);
  });

  it("does not move before when source or target does not exist", () => {
    const folders = sampleFolders();
    expect(moveTrackBeforeTarget(folders, 999, 1)).toBe(false);
    expect(moveTrackBeforeTarget(folders, 1, 999)).toBe(false);
  });

  it("moves track after target", () => {
    const folders = sampleFolders();
    expect(moveTrackAfterTarget(folders, 1, 2)).toBe(true);
    expect(getAllItems(folders).map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it("does not move after when ids are the same", () => {
    const folders = sampleFolders();
    expect(moveTrackAfterTarget(folders, 2, 2)).toBe(false);
  });

  it("does not move after when source or target does not exist", () => {
    const folders = sampleFolders();
    expect(moveTrackAfterTarget(folders, 999, 1)).toBe(false);
    expect(moveTrackAfterTarget(folders, 1, 999)).toBe(false);
  });

  it("moves track to folder end", () => {
    const folders = sampleFolders();
    expect(moveTrackToFolderEnd(folders, 1, 2)).toBe(true);
    expect(folders[0]?.items.map((item) => item.id)).toEqual([2]);
    expect(folders[1]?.items.map((item) => item.id)).toEqual([3, 1]);
  });

  it("does not move to folder end when source or target folder is missing", () => {
    const folders = sampleFolders();
    expect(moveTrackToFolderEnd(folders, 999, 2)).toBe(false);
    expect(moveTrackToFolderEnd(folders, 1, 999)).toBe(false);
  });

  it("returns false when source splice does not return an item", () => {
    const folders: QueueFolder[] = [
      {
        id: 1,
        name: "Act I",
        isOpen: true,
        items: new NoMovedItemArray(track(1), track(2)),
      },
      { id: 2, name: "Act II", isOpen: true, items: [track(3)] },
    ];

    expect(moveTrackBeforeTarget(folders, 1, 2)).toBe(false);
    expect(moveTrackAfterTarget(folders, 1, 2)).toBe(false);
    expect(moveTrackToFolderEnd(folders, 1, 2)).toBe(false);
  });

  it("rolls back when target disappears during move-before", () => {
    const folders: QueueFolder[] = [
      {
        id: 1,
        name: "Act I",
        isOpen: true,
        items: new RemoveTargetOnSpliceArray(2, track(1), track(2)),
      },
    ];

    expect(moveTrackBeforeTarget(folders, 1, 2)).toBe(false);
  });

  it("rolls back when target disappears during move-after", () => {
    const folders: QueueFolder[] = [
      {
        id: 1,
        name: "Act I",
        isOpen: true,
        items: new RemoveTargetOnSpliceArray(2, track(1), track(2)),
      },
    ];

    expect(moveTrackAfterTarget(folders, 1, 2)).toBe(false);
  });
});
