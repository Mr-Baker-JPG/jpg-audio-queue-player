import type { QueueFolder, QueueItem, TrackLocation } from "./types";

export function getAllItems(folders: QueueFolder[]): QueueItem[] {
  return folders.flatMap((folder) => folder.items);
}

export function getVisibleTrackIds(folders: QueueFolder[]): number[] {
  return folders.flatMap((folder) => (folder.isOpen ? folder.items.map((item) => item.id) : []));
}

export function getFlattenedTrackIds(folders: QueueFolder[]): number[] {
  return folders.flatMap((folder) => folder.items.map((item) => item.id));
}

export function findTrackLocation(folders: QueueFolder[], itemId: number): TrackLocation | null {
  for (let folderIndex = 0; folderIndex < folders.length; folderIndex += 1) {
    const folder = folders[folderIndex]!;
    const itemIndex = folder.items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      return {
        folder,
        folderIndex,
        item: folder.items[itemIndex]!,
        itemIndex,
      };
    }
  }

  return null;
}

export function createFolder(
  folders: QueueFolder[],
  nextFolderId: number,
  name: string,
  isOpen = true,
): { folders: QueueFolder[]; folder: QueueFolder; nextFolderId: number } {
  const folder: QueueFolder = {
    id: nextFolderId,
    name,
    isOpen,
    items: [],
  };

  return {
    folders: [...folders, folder],
    folder,
    nextFolderId: nextFolderId + 1,
  };
}

export function moveTrackBeforeTarget(folders: QueueFolder[], sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) {
    return false;
  }

  const source = findTrackLocation(folders, sourceId);
  const target = findTrackLocation(folders, targetId);
  if (!source || !target) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  const refreshedTarget = findTrackLocation(folders, targetId);
  if (!refreshedTarget) {
    source.folder.items.splice(source.itemIndex, 0, movedItem);
    return false;
  }

  refreshedTarget.folder.items.splice(refreshedTarget.itemIndex, 0, movedItem);
  return true;
}

export function moveTrackAfterTarget(folders: QueueFolder[], sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) {
    return false;
  }

  const source = findTrackLocation(folders, sourceId);
  const target = findTrackLocation(folders, targetId);
  if (!source || !target) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  const refreshedTarget = findTrackLocation(folders, targetId);
  if (!refreshedTarget) {
    source.folder.items.splice(source.itemIndex, 0, movedItem);
    return false;
  }

  refreshedTarget.folder.items.splice(refreshedTarget.itemIndex + 1, 0, movedItem);
  return true;
}

export function moveTrackToFolderEnd(folders: QueueFolder[], sourceId: number, targetFolderId: number): boolean {
  const source = findTrackLocation(folders, sourceId);
  const targetFolder = folders.find((folder) => folder.id === targetFolderId);
  if (!source || !targetFolder) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  targetFolder.items.push(movedItem);
  return true;
}
