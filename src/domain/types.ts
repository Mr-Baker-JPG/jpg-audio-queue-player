export interface QueueItem {
  id: number;
  file: File;
  url: string;
  durationSeconds: number | null;
}

export interface QueueFolder {
  id: number;
  name: string;
  isOpen: boolean;
  items: QueueItem[];
}

export interface PersistedQueueItem {
  id: number;
  file: File;
  durationSeconds: number | null;
}

export interface PersistedQueueFolder {
  id: number;
  name: string;
  isOpen: boolean;
  items: PersistedQueueItem[];
}

export interface PersistedQueueState {
  nextItemId: number;
  nextFolderId: number;
  selectedId: number | null;
  selectedFolderId: number | null;
  folders: PersistedQueueFolder[];
}

export interface TrackLocation {
  folder: QueueFolder;
  folderIndex: number;
  item: QueueItem;
  itemIndex: number;
}
