import "./style.css";

interface QueueItem {
  id: number;
  file: File;
  url: string;
  durationSeconds: number | null;
}

interface QueueFolder {
  id: number;
  name: string;
  isOpen: boolean;
  items: QueueItem[];
}

interface PersistedQueueItem {
  id: number;
  file: File;
  durationSeconds: number | null;
}

interface PersistedQueueFolder {
  id: number;
  name: string;
  isOpen: boolean;
  items: PersistedQueueItem[];
}

interface PersistedQueueState {
  nextItemId: number;
  nextFolderId: number;
  selectedId: number | null;
  selectedFolderId: number | null;
  folders: PersistedQueueFolder[];
}

interface TrackLocation {
  folder: QueueFolder;
  folderIndex: number;
  item: QueueItem;
  itemIndex: number;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <main class="player-app">
    <header class="app-header">
      <div class="header-row">
        <div>
          <h1>JPG Audio Queue Player</h1>
          <p>Organize tracks into folders (Act I, Act II), then play from your queue.</p>
        </div>
        <button id="open-help" type="button" class="help-button help-icon" aria-label="Open help and keyboard shortcuts">?</button>
      </div>

      <section class="controls controls-primary">
        <label class="file-picker" for="audio-files">+ Add Audio Files</label>
        <input id="audio-files" type="file" accept="audio/*" multiple />
        <button id="add-folder" type="button">+ Folder</button>
        <button id="clear-queue" type="button" class="danger">Clear Queue</button>
        <div id="queue-summary" class="queue-summary">0 tracks • 00:00</div>
      </section>
    </header>

    <section id="drop-zone" class="drop-zone">
      <p><strong>Drop audio files here</strong> or use “Add Audio Files”.</p>
      <p class="drop-zone-sub">Files go to the selected folder, or a new folder if needed.</p>
    </section>

    <section class="timeline-panel">
      <div class="transport-row">
        <button id="play-toggle" type="button" aria-label="Play">▶</button>
        <button id="stop-playback" type="button" aria-label="Stop">■</button>
        <label class="volume-control" for="volume-slider">Volume
          <input id="volume-slider" type="range" min="0" max="1" step="0.01" value="1" />
        </label>
      </div>
      <div class="timeline-stack">
        <div id="buffer-fill" class="buffer-fill"></div>
        <input id="seek-bar" type="range" min="0" max="0" value="0" step="0.01" disabled />
      </div>
      <div class="timeline-marks">
        <span id="elapsed-label">Elapsed: <strong id="current-time">00:00</strong></span>
        <div
          id="seek-time-input"
          class="seek-time-input"
          contenteditable="true"
          role="textbox"
          aria-label="Seek time"
          spellcheck="false"
        >00:00</div>
        <span id="total-label">Total: <strong id="total-time">00:00</strong></span>
      </div>
    </section>

    <section class="queue-panel">
      <div class="queue-head">
        <h2>Queue Folders</h2>
        <p id="now-playing" class="now-playing">Now Playing: —</p>
      </div>
      <ul id="queue-list" class="queue-list"></ul>
    </section>

    <footer>
      <p id="status">No track selected.</p>
    </footer>

    <div id="help-modal" class="help-modal hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-modal-card help-modal-large">
        <div class="help-modal-header">
          <h2 id="help-title">Help & Keyboard Shortcuts</h2>
          <button id="close-help" type="button" class="help-close" aria-label="Close help">✕</button>
        </div>

        <div class="help-grid">
          <section class="help-section">
            <h3>How to Use</h3>
            <ul class="help-bullets">
              <li>Create folders with <strong>+ Folder</strong> (Act I, Act II, etc).</li>
              <li><strong>Double-click folder name</strong> to rename inline.</li>
              <li>Add files into the selected folder (or drop files on desktop).</li>
              <li>On mobile, tap a track row to play immediately.</li>
              <li>Drag tracks to reorder, including across folders.</li>
              <li>Collapse/expand folders with the arrow toggle.</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>Shortcuts</h3>
            <ul class="help-shortcuts">
              <li><kbd>↑</kbd> / <kbd>↓</kbd> <span>Select previous / next visible track</span></li>
              <li><kbd>⌘ / Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> <span>Move selected track</span></li>
              <li><kbd>Space</kbd> <span>Play / Pause</span></li>
              <li><kbd>Esc</kbd> <span>Stop playback (or close help)</span></li>
              <li><kbd>?</kbd> <span>Open this modal</span></li>
            </ul>
          </section>
        </div>

        <div class="help-actions">
          <button id="reset-storage" type="button" class="danger">Reset Local Storage</button>
        </div>
      </div>
    </div>

    <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
  </main>
`;

const fileInput = document.querySelector<HTMLInputElement>("#audio-files")!;
const addFolderButton = document.querySelector<HTMLButtonElement>("#add-folder")!;
const playToggleButton = document.querySelector<HTMLButtonElement>("#play-toggle")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-playback")!;
const clearQueueButton = document.querySelector<HTMLButtonElement>("#clear-queue")!;
const volumeSlider = document.querySelector<HTMLInputElement>("#volume-slider")!;
const queueSummary = document.querySelector<HTMLDivElement>("#queue-summary")!;
const dropZone = document.querySelector<HTMLDivElement>("#drop-zone")!;
const queueList = document.querySelector<HTMLUListElement>("#queue-list")!;
const statusText = document.querySelector<HTMLParagraphElement>("#status")!;
const nowPlayingText = document.querySelector<HTMLParagraphElement>("#now-playing")!;
const seekBar = document.querySelector<HTMLInputElement>("#seek-bar")!;
const bufferFill = document.querySelector<HTMLDivElement>("#buffer-fill")!;
const currentTimeText = document.querySelector<HTMLSpanElement>("#current-time")!;
const totalTimeText = document.querySelector<HTMLSpanElement>("#total-time")!;
const seekTimeInput = document.querySelector<HTMLDivElement>("#seek-time-input")!;
const openHelpButton = document.querySelector<HTMLButtonElement>("#open-help")!;
const closeHelpButton = document.querySelector<HTMLButtonElement>("#close-help")!;
const resetStorageButton = document.querySelector<HTMLButtonElement>("#reset-storage")!;
const helpModal = document.querySelector<HTMLDivElement>("#help-modal")!;
const toast = document.querySelector<HTMLDivElement>("#toast")!;

const audio = new Audio();
audio.preload = "auto";

let folders: QueueFolder[] = [];
let selectedId: number | null = null;
let selectedFolderId: number | null = null;
let playingId: number | null = null;
let nextItemId = 1;
let nextFolderId = 1;
let draggedTrack: { itemId: number; sourceFolderId: number } | null = null;
let isEditingSeekTime = false;
let isHelpOpen = false;
let persistenceEnabled = true;
let persistenceSaveTimer: number | null = null;
let persistenceSaveInFlight = false;
let pendingPersistenceSave = false;
let toastTimer: number | null = null;

const DB_NAME = "audio-queue-player";
const DB_VERSION = 2;
const STORE_NAME = "app-state";
const STATE_KEY = "queue";

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

async function loadPersistedQueueState(): Promise<PersistedQueueState | null> {
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

function isPersistableAudioFile(file: File): boolean {
  return file instanceof File && file.size > 0 && file.type.startsWith("audio/");
}

async function savePersistedQueueState(): Promise<void> {
  if (!persistenceEnabled) {
    return;
  }

  const db = await openDatabase();

  const persistedFolders: PersistedQueueFolder[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    isOpen: folder.isOpen,
    items: folder.items
      .filter((item) => isPersistableAudioFile(item.file))
      .map((item) => ({
        id: item.id,
        file: item.file,
        durationSeconds: item.durationSeconds,
      })),
  }));

  const payload: PersistedQueueState = {
    nextItemId,
    nextFolderId,
    selectedId,
    selectedFolderId,
    folders: persistedFolders,
  };

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

async function clearPersistedQueueState(): Promise<void> {
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

function isMobileView(): boolean {
  return window.matchMedia("(max-width: 700px)").matches;
}

function showToast(message: string, state: "saved" | "saving" | "error" = "saved", durationMs = 3000): void {
  toast.textContent = message;
  toast.dataset.state = state;
  toast.classList.remove("hidden");

  if (toastTimer !== null) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.add("hidden");
    toastTimer = null;
  }, durationMs);
}

function setPersistenceStatus(text: string, state: "saved" | "saving" | "error" = "saved"): void {
  if (state === "error" || text.startsWith("Restored") || text.startsWith("Local restore")) {
    showToast(text, state);
  }
}

function flushPersistenceSave(): void {
  if (!persistenceEnabled || persistenceSaveInFlight) {
    return;
  }

  persistenceSaveInFlight = true;
  setPersistenceStatus("Saving locally…", "saving");

  void savePersistedQueueState()
    .then(() => {
      setPersistenceStatus("Saved locally", "saved");
    })
    .catch((error: unknown) => {
      console.error("Failed to persist queue state", error);
      persistenceEnabled = false;
      setPersistenceStatus("Local save disabled (storage limit)", "error");
      void clearPersistedQueueState().catch(() => {
        // Ignore cleanup failures.
      });
    })
    .finally(() => {
      persistenceSaveInFlight = false;
      if (pendingPersistenceSave) {
        pendingPersistenceSave = false;
        flushPersistenceSave();
      }
    });
}

function persistQueueState(): void {
  if (!persistenceEnabled) {
    return;
  }

  if (persistenceSaveTimer !== null) {
    window.clearTimeout(persistenceSaveTimer);
  }

  if (persistenceSaveInFlight) {
    pendingPersistenceSave = true;
    return;
  }

  persistenceSaveTimer = window.setTimeout(() => {
    persistenceSaveTimer = null;
    flushPersistenceSave();
  }, 250);
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const secs = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function parseTimeInput(rawValue: string): number | null {
  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized);
  }

  const parts = normalized.split(":").map((part) => part.trim());
  if (parts.some((part) => part.length === 0 || Number.isNaN(Number(part)))) {
    return null;
  }

  if (parts.length === 2) {
    const [mins, secs] = parts.map(Number);
    return mins * 60 + secs;
  }

  if (parts.length === 3) {
    const [hours, mins, secs] = parts.map(Number);
    return hours * 3600 + mins * 60 + secs;
  }

  return null;
}

function getAllItems(): QueueItem[] {
  return folders.flatMap((folder) => folder.items);
}

function getVisibleTrackIds(): number[] {
  return folders.flatMap((folder) => (folder.isOpen ? folder.items.map((item) => item.id) : []));
}

function findTrackLocation(itemId: number): TrackLocation | null {
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

function getCurrentItem(): QueueItem | undefined {
  const location = playingId === null ? null : findTrackLocation(playingId);
  return location?.item;
}

function updatePlayToggleLabel(): void {
  const isPlaying = playingId !== null && !audio.paused;
  playToggleButton.textContent = isPlaying ? "⏸" : "▶";
  playToggleButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function updateNowPlaying(): void {
  const current = getCurrentItem();
  if (!current) {
    nowPlayingText.textContent = "Now Playing: —";
    return;
  }

  const state = audio.paused ? "Paused" : "Playing";
  nowPlayingText.textContent = `Now Playing (${state}): ${current.file.name}`;
}

function updateQueueSummary(): void {
  const items = getAllItems();
  const totalSeconds = items.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
  queueSummary.textContent = `${items.length} track${items.length === 1 ? "" : "s"} • ${formatDuration(totalSeconds)}`;
}

function syncTimeline(): void {
  const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
  seekBar.disabled = !hasDuration;

  if (!hasDuration) {
    seekBar.max = "0";
    seekBar.value = "0";
    currentTimeText.textContent = "00:00";
    totalTimeText.textContent = "00:00";
    bufferFill.style.width = "0%";
    if (!isEditingSeekTime) {
      seekTimeInput.textContent = "00:00";
    }
    return;
  }

  const current = Math.min(Math.max(audio.currentTime, 0), audio.duration);
  seekBar.max = String(audio.duration);
  seekBar.value = String(current);
  currentTimeText.textContent = formatDuration(current);
  totalTimeText.textContent = formatDuration(audio.duration);

  if (!isEditingSeekTime) {
    seekTimeInput.textContent = formatDuration(current);
  }
}

function updateBufferBar(): void {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0 || audio.buffered.length === 0) {
    bufferFill.style.width = "0%";
    return;
  }

  const end = audio.buffered.end(audio.buffered.length - 1);
  const percent = Math.min(Math.max((end / audio.duration) * 100, 0), 100);
  bufferFill.style.width = `${percent}%`;
}

function getDefaultFolderName(): string {
  return `Act ${folders.length + 1}`;
}

function createFolder(name = getDefaultFolderName(), isOpen = true): QueueFolder {
  const folder: QueueFolder = {
    id: nextFolderId++,
    name,
    isOpen,
    items: [],
  };

  folders = [...folders, folder];
  selectedFolderId = folder.id;
  return folder;
}

function getTargetFolderForAdd(): QueueFolder {
  if (selectedFolderId !== null) {
    const selectedFolder = folders.find((folder) => folder.id === selectedFolderId);
    if (selectedFolder) {
      return selectedFolder;
    }
  }

  if (folders.length === 0) {
    return createFolder();
  }

  selectedFolderId = folders[0]!.id;
  return folders[0]!;
}

function selectAdjacentBy(delta: number): void {
  const visibleIds = getVisibleTrackIds();
  if (visibleIds.length === 0) {
    return;
  }

  if (selectedId === null) {
    selectedId = delta > 0 ? visibleIds[0]! : visibleIds[visibleIds.length - 1]!;
    const selectedLocation = findTrackLocation(selectedId);
    selectedFolderId = selectedLocation?.folder.id ?? selectedFolderId;
    renderQueue();
    return;
  }

  const currentIndex = visibleIds.findIndex((id) => id === selectedId);
  if (currentIndex === -1) {
    selectedId = visibleIds[0]!;
    renderQueue();
    return;
  }

  const targetIndex = Math.min(Math.max(currentIndex + delta, 0), visibleIds.length - 1);
  if (targetIndex === currentIndex) {
    return;
  }

  selectedId = visibleIds[targetIndex]!;
  const selectedLocation = findTrackLocation(selectedId);
  selectedFolderId = selectedLocation?.folder.id ?? selectedFolderId;
  statusText.textContent = selectedLocation ? `Selected: ${selectedLocation.item.file.name}` : statusText.textContent;
  renderQueue();
}

function moveTrackBeforeTarget(sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) {
    return false;
  }

  const source = findTrackLocation(sourceId);
  const target = findTrackLocation(targetId);
  if (!source || !target) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  const refreshedTarget = findTrackLocation(targetId);
  if (!refreshedTarget) {
    source.folder.items.splice(source.itemIndex, 0, movedItem);
    return false;
  }

  refreshedTarget.folder.items.splice(refreshedTarget.itemIndex, 0, movedItem);
  selectedFolderId = refreshedTarget.folder.id;
  return true;
}

function moveTrackAfterTarget(sourceId: number, targetId: number): boolean {
  if (sourceId === targetId) {
    return false;
  }

  const source = findTrackLocation(sourceId);
  const target = findTrackLocation(targetId);
  if (!source || !target) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  const refreshedTarget = findTrackLocation(targetId);
  if (!refreshedTarget) {
    source.folder.items.splice(source.itemIndex, 0, movedItem);
    return false;
  }

  refreshedTarget.folder.items.splice(refreshedTarget.itemIndex + 1, 0, movedItem);
  selectedFolderId = refreshedTarget.folder.id;
  return true;
}

function moveTrackToFolderEnd(sourceId: number, targetFolderId: number): boolean {
  const source = findTrackLocation(sourceId);
  const targetFolder = folders.find((folder) => folder.id === targetFolderId);
  if (!source || !targetFolder) {
    return false;
  }

  const [movedItem] = source.folder.items.splice(source.itemIndex, 1);
  if (!movedItem) {
    return false;
  }

  targetFolder.items.push(movedItem);
  selectedFolderId = targetFolder.id;
  return true;
}

function moveSelectedBy(delta: number): void {
  if (selectedId === null) {
    statusText.textContent = "Select a track first.";
    return;
  }

  const visibleIds = getVisibleTrackIds();
  const currentIndex = visibleIds.findIndex((id) => id === selectedId);
  if (currentIndex === -1) {
    return;
  }

  const targetIndex = currentIndex + delta;
  if (targetIndex < 0 || targetIndex >= visibleIds.length) {
    return;
  }

  const targetId = visibleIds[targetIndex]!;
  const moved = delta > 0
    ? moveTrackAfterTarget(selectedId, targetId)
    : moveTrackBeforeTarget(selectedId, targetId);

  if (!moved) {
    return;
  }

  statusText.textContent = "Queue order updated.";
  persistQueueState();
  renderQueue();
}

function isTypingContext(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return element.isContentEditable;
}

function openHelpModal(): void {
  isHelpOpen = true;
  helpModal.classList.remove("hidden");
  closeHelpButton.focus();
}

function closeHelpModal(): void {
  isHelpOpen = false;
  helpModal.classList.add("hidden");
  openHelpButton.focus();
}

function beginInlineFolderRename(folder: QueueFolder, nameElement: HTMLSpanElement): void {
  if (nameElement.dataset.editing === "true") {
    return;
  }

  const originalName = folder.name;
  nameElement.dataset.editing = "true";
  nameElement.classList.add("editing");
  nameElement.contentEditable = "true";
  nameElement.spellcheck = false;
  nameElement.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(nameElement);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const cleanup = () => {
    nameElement.contentEditable = "false";
    nameElement.classList.remove("editing");
    delete nameElement.dataset.editing;
    nameElement.removeEventListener("keydown", onKeyDown);
    nameElement.removeEventListener("blur", onBlur);
  };

  const commit = () => {
    const nextName = (nameElement.textContent ?? "").trim();
    folder.name = nextName.length > 0 ? nextName : originalName;
    cleanup();
    persistQueueState();
    renderQueue();
  };

  const cancel = () => {
    folder.name = originalName;
    nameElement.textContent = originalName;
    cleanup();
    renderQueue();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  const onBlur = () => {
    commit();
  };

  nameElement.addEventListener("keydown", onKeyDown);
  nameElement.addEventListener("blur", onBlur);
}

function renderQueue(): void {
  queueList.innerHTML = "";

  const allItems = getAllItems();

  if (folders.length === 0) {
    queueList.innerHTML = `
      <li class="empty">
        No folders yet.
        <span>Click “+ Folder”, then add audio files into it.</span>
      </li>
    `;
    updateQueueSummary();
    updateNowPlaying();
    updatePlayToggleLabel();
    return;
  }

  folders.forEach((folder) => {
    const folderSection = document.createElement("li");
    folderSection.className = `folder-section${selectedFolderId === folder.id ? " selected-folder" : ""}`;

    const header = document.createElement("div");
    header.className = "folder-header";
    header.addEventListener("click", () => {
      if (selectedFolderId === folder.id) {
        return;
      }

      selectedFolderId = folder.id;
      renderQueue();
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "folder-toggle";
    toggleButton.textContent = folder.isOpen ? "▾" : "▸";
    toggleButton.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
      folder.isOpen = !folder.isOpen;
      selectedFolderId = folder.id;
      renderQueue();
    });

    const folderName = document.createElement("span");
    folderName.className = "folder-name";
    folderName.textContent = folder.name;
    folderName.title = "Double-click to rename";
    folderName.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
    });
    folderName.addEventListener("dblclick", (event: MouseEvent) => {
      event.stopPropagation();
      beginInlineFolderRename(folder, folderName);
    });

    const folderDuration = folder.items.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
    const folderMeta = document.createElement("span");
    folderMeta.className = "folder-meta";
    folderMeta.textContent = `${folder.items.length} • ${formatDuration(folderDuration)}`;

    header.append(toggleButton, folderName, folderMeta);

    const body = document.createElement("div");
    body.className = `folder-body${folder.isOpen ? "" : " hidden"}`;

    body.addEventListener("dragover", (event: DragEvent) => {
      if (draggedTrack === null) {
        return;
      }
      event.preventDefault();
      body.classList.add("drag-over");
    });

    body.addEventListener("dragleave", () => {
      body.classList.remove("drag-over");
    });

    body.addEventListener("drop", (event: DragEvent) => {
      event.preventDefault();
      body.classList.remove("drag-over");
      if (!draggedTrack) {
        return;
      }

      const moved = moveTrackToFolderEnd(draggedTrack.itemId, folder.id);
      if (moved) {
        statusText.textContent = "Queue order updated.";
        persistQueueState();
        renderQueue();
      }
    });

    if (folder.items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "folder-empty";
      empty.textContent = "No tracks in this folder yet.";
      body.append(empty);
    } else {
      folder.items.forEach((item) => {
        const row = document.createElement("div");
        const isSelected = selectedId === item.id;
        const isPlaying = playingId === item.id && !audio.paused;
        const isPaused = playingId === item.id && audio.paused && audio.currentTime > 0;

        row.className = `queue-item${isSelected ? " selected" : ""}${isPlaying ? " playing" : ""}${isPaused ? " paused" : ""}`;
        row.draggable = true;

        row.addEventListener("click", (event: MouseEvent) => {
          const target = event.target as HTMLElement;
          if (target.closest("button")) {
            return;
          }

          selectedId = item.id;
          selectedFolderId = folder.id;

          if (isMobileView()) {
            playItem(item.id);
            return;
          }

          statusText.textContent = `Selected: ${item.file.name}`;
          renderQueue();
        });

        row.addEventListener("dragstart", (event: DragEvent) => {
          draggedTrack = { itemId: item.id, sourceFolderId: folder.id };
          row.classList.add("dragging");
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
          }
        });

        row.addEventListener("dragover", (event: DragEvent) => {
          if (!draggedTrack || draggedTrack.itemId === item.id) {
            return;
          }

          event.preventDefault();
          row.classList.add("drag-over");
        });

        row.addEventListener("dragleave", () => {
          row.classList.remove("drag-over");
        });

        row.addEventListener("drop", (event: DragEvent) => {
          event.preventDefault();
          row.classList.remove("drag-over");
          if (!draggedTrack || draggedTrack.itemId === item.id) {
            return;
          }

          const moved = moveTrackBeforeTarget(draggedTrack.itemId, item.id);
          if (moved) {
            statusText.textContent = "Queue order updated.";
            persistQueueState();
            renderQueue();
          }
        });

        row.addEventListener("dragend", () => {
          draggedTrack = null;
          row.classList.remove("dragging", "drag-over");
        });

        const stateIcon = document.createElement("span");
        stateIcon.className = "state-icon";
        stateIcon.textContent = isPlaying ? "▶" : isPaused ? "⏸" : "☰";

        const titleButton = document.createElement("button");
        titleButton.type = "button";
        titleButton.className = "track-title";
        titleButton.textContent = item.file.name;
        titleButton.addEventListener("click", () => {
          selectedId = item.id;
          selectedFolderId = folder.id;
          playItem(item.id);
        });

        const meta = document.createElement("span");
        meta.className = "track-meta";
        meta.textContent = item.durationSeconds === null ? "--:--" : formatDuration(item.durationSeconds);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "icon-button danger";
        removeButton.setAttribute("aria-label", `Remove ${item.file.name}`);
        removeButton.title = "Remove";
        removeButton.textContent = "✕";
        removeButton.addEventListener("click", () => {
          removeItem(item.id);
        });

        row.append(stateIcon, titleButton, meta, removeButton);
        body.append(row);
      });
    }

    folderSection.append(header, body);
    queueList.append(folderSection);
  });

  if (allItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.innerHTML = `No tracks yet.<span>Select a folder and add audio files.</span>`;
    queueList.append(empty);
  }

  updateQueueSummary();
  updateNowPlaying();
  updatePlayToggleLabel();
}

function playItem(id: number): void {
  const location = findTrackLocation(id);
  if (!location) {
    statusText.textContent = "Track not found.";
    return;
  }

  if (!isPersistableAudioFile(location.item.file)) {
    statusText.textContent = `Unsupported or corrupted audio file: ${location.item.file.name}`;
    return;
  }

  selectedId = id;
  selectedFolderId = location.folder.id;

  if (playingId === id && audio.src && audio.paused) {
    void audio.play().then(() => {
      statusText.textContent = `Playing: ${location.item.file.name}`;
      updatePlayToggleLabel();
      updateNowPlaying();
      renderQueue();
    }).catch((error: unknown) => {
      console.error("Resume failed", error);
      statusText.textContent = "Could not resume playback.";
    });
    return;
  }

  const previousUrl = location.item.url;
  const nextUrl = URL.createObjectURL(location.item.file);
  location.item.url = nextUrl;

  playingId = id;
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.src = location.item.url;

  if (previousUrl && previousUrl !== nextUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  void audio.play().then(() => {
    statusText.textContent = `Playing: ${location.item.file.name}`;
    syncTimeline();
    updatePlayToggleLabel();
    updateNowPlaying();
    renderQueue();
  }).catch((error: unknown) => {
    console.error("Playback failed", error);
    statusText.textContent = `Could not play ${location.item.file.name}. Try re-adding this file.`;
    playingId = null;
    renderQueue();
  });
}

function togglePlayPause(): void {
  if (playingId !== null && !audio.paused) {
    audio.pause();
    const current = getCurrentItem();
    statusText.textContent = current ? `Paused: ${current.file.name}` : "Playback paused.";
    updatePlayToggleLabel();
    updateNowPlaying();
    renderQueue();
    return;
  }

  if (selectedId === null) {
    statusText.textContent = "Select a track first, then press Play.";
    return;
  }

  playItem(selectedId);
}

function stopPlayback(): void {
  if (playingId === null) {
    statusText.textContent = "Playback stopped.";
    return;
  }

  const wasPlaying = getCurrentItem();
  audio.pause();
  audio.currentTime = 0;
  playingId = null;

  statusText.textContent = wasPlaying ? `Stopped: ${wasPlaying.file.name}` : "Playback stopped.";
  syncTimeline();
  updatePlayToggleLabel();
  updateNowPlaying();
  renderQueue();
}

function removeItem(id: number): void {
  const location = findTrackLocation(id);
  if (!location) {
    return;
  }

  const confirmed = window.confirm(`Remove "${location.item.file.name}" from queue?`);
  if (!confirmed) {
    return;
  }

  const wasPlaying = playingId === id;
  URL.revokeObjectURL(location.item.url);
  location.folder.items.splice(location.itemIndex, 1);

  if (selectedId === id) {
    selectedId = null;
  }

  if (wasPlaying) {
    stopPlayback();
  }

  persistQueueState();
  renderQueue();
}

function clearQueue(): void {
  const allItems = getAllItems();
  if (allItems.length === 0 && folders.length === 0) {
    return;
  }

  const confirmed = window.confirm("Clear all folders and tracks?");
  if (!confirmed) {
    return;
  }

  stopPlayback();
  allItems.forEach((item) => URL.revokeObjectURL(item.url));
  folders = [];
  selectedId = null;
  selectedFolderId = null;
  audio.removeAttribute("src");
  audio.load();
  statusText.textContent = "Queue cleared.";
  syncTimeline();
  persistQueueState();
  renderQueue();
}

function estimateDuration(item: QueueItem): void {
  const probe = new Audio();
  probe.preload = "metadata";
  probe.src = item.url;

  const onLoaded = () => {
    item.durationSeconds = Number.isFinite(probe.duration) ? probe.duration : null;
    updateQueueSummary();
    renderQueue();
    cleanup();
  };

  const onError = () => {
    item.durationSeconds = null;
    cleanup();
  };

  const cleanup = () => {
    probe.removeEventListener("loadedmetadata", onLoaded);
    probe.removeEventListener("error", onError);
  };

  probe.addEventListener("loadedmetadata", onLoaded);
  probe.addEventListener("error", onError);
}

function addFiles(inputFiles: FileList | File[]): void {
  const files = Array.from(inputFiles).filter((file) => isPersistableAudioFile(file));
  if (files.length === 0) {
    statusText.textContent = "No audio files found.";
    return;
  }

  const targetFolder = getTargetFolderForAdd();

  const items = files.map<QueueItem>((file) => {
    const item: QueueItem = {
      id: nextItemId++,
      file,
      url: URL.createObjectURL(file),
      durationSeconds: null,
    };

    estimateDuration(item);
    return item;
  });

  targetFolder.items.push(...items);

  if (selectedId === null && items.length > 0) {
    selectedId = items[0]!.id;
  }

  statusText.textContent = `${items.length} file(s) added to ${targetFolder.name}.`;
  persistQueueState();
  renderQueue();
}

async function restoreQueueFromPersistence(): Promise<void> {
  try {
    const saved = await loadPersistedQueueState();
    const savedFolders = Array.isArray(saved?.folders) ? saved.folders : [];

    if (!saved || savedFolders.length === 0) {
      setPersistenceStatus("Saved locally", "saved");
      return;
    }

    getAllItems().forEach((item) => URL.revokeObjectURL(item.url));

    folders = savedFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      isOpen: folder.isOpen,
      items: folder.items
        .filter((item) => isPersistableAudioFile(item.file))
        .map((item) => ({
          id: item.id,
          file: item.file,
          url: URL.createObjectURL(item.file),
          durationSeconds: item.durationSeconds,
        })),
    })).filter((folder) => folder.items.length > 0 || folder.name.trim().length > 0);

    if (folders.length === 0) {
      setPersistenceStatus("Saved locally", "saved");
      return;
    }

    nextItemId = Math.max(saved.nextItemId ?? 1, ...getAllItems().map((item) => item.id + 1), 1);
    nextFolderId = Math.max(saved.nextFolderId ?? 1, ...folders.map((folder) => folder.id + 1), 1);

    selectedId = saved.selectedId ?? null;
    if (selectedId !== null && !findTrackLocation(selectedId)) {
      selectedId = null;
    }

    selectedFolderId = saved.selectedFolderId ?? null;
    if (selectedFolderId !== null && !folders.some((folder) => folder.id === selectedFolderId)) {
      selectedFolderId = folders[0]?.id ?? null;
    }

    setPersistenceStatus("Restored from local storage", "saved");
    statusText.textContent = `Restored ${getAllItems().length} track(s) from local storage.`;
    renderQueue();
  } catch (error: unknown) {
    console.error("Failed to restore queue", error);
    persistenceEnabled = false;
    setPersistenceStatus("Local restore failed (disabled)", "error");
    statusText.textContent = "Could not restore saved queue.";
  }
}

function getFlattenedTrackIds(): number[] {
  return folders.flatMap((folder) => folder.items.map((item) => item.id));
}

audio.addEventListener("ended", () => {
  if (playingId === null) {
    return;
  }

  const allTrackIds = getFlattenedTrackIds();
  const currentIndex = allTrackIds.findIndex((id) => id === playingId);
  const nextId = allTrackIds[currentIndex + 1];

  if (nextId === undefined) {
    playingId = null;
    statusText.textContent = "Playback finished.";
    syncTimeline();
    updatePlayToggleLabel();
    updateNowPlaying();
    renderQueue();
    return;
  }

  playItem(nextId);
});

audio.addEventListener("loadedmetadata", () => {
  syncTimeline();
  updateBufferBar();
});

audio.addEventListener("timeupdate", () => {
  syncTimeline();
});

audio.addEventListener("progress", () => {
  updateBufferBar();
});

audio.addEventListener("pause", () => {
  updatePlayToggleLabel();
  updateNowPlaying();
  renderQueue();
});

audio.addEventListener("play", () => {
  updatePlayToggleLabel();
  updateNowPlaying();
  renderQueue();
});

fileInput.addEventListener("change", () => {
  const files = fileInput.files;
  if (!files || files.length === 0) {
    return;
  }

  addFiles(files);
  fileInput.value = "";
});

addFolderButton.addEventListener("click", () => {
  const folder = createFolder();
  statusText.textContent = `${folder.name} created. Double-click folder name to rename.`;
  persistQueueState();
  renderQueue();
});

playToggleButton.addEventListener("click", () => {
  togglePlayPause();
});

stopButton.addEventListener("click", () => {
  stopPlayback();
});

clearQueueButton.addEventListener("click", () => {
  clearQueue();
});

volumeSlider.addEventListener("input", () => {
  const value = Number(volumeSlider.value);
  if (!Number.isNaN(value)) {
    audio.volume = Math.min(Math.max(value, 0), 1);
  }
});

openHelpButton.addEventListener("click", () => {
  openHelpModal();
});

closeHelpButton.addEventListener("click", () => {
  closeHelpModal();
});

resetStorageButton.addEventListener("click", () => {
  const confirmed = window.confirm("Reset local storage for this player and reload?");
  if (!confirmed) {
    return;
  }

  void clearPersistedQueueState()
    .then(() => {
      showToast("Local storage reset. Reloading…", "saved", 1200);
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    })
    .catch((error: unknown) => {
      console.error("Failed to reset local storage", error);
      showToast("Could not reset local storage", "error");
    });
});

helpModal.addEventListener("click", (event: MouseEvent) => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
});

dropZone.addEventListener("dragover", (event: DragEvent) => {
  event.preventDefault();
  dropZone.classList.add("active");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("active");
});

dropZone.addEventListener("drop", (event: DragEvent) => {
  event.preventDefault();
  dropZone.classList.remove("active");

  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) {
    return;
  }

  addFiles(files);
});

seekBar.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
    return;
  }

  const nextTime = Number(seekBar.value);
  if (Number.isNaN(nextTime)) {
    return;
  }

  audio.currentTime = Math.min(Math.max(nextTime, 0), audio.duration);
  syncTimeline();
});

seekTimeInput.addEventListener("focus", () => {
  isEditingSeekTime = true;
  seekTimeInput.textContent = formatDuration(audio.currentTime);
});

seekTimeInput.addEventListener("blur", () => {
  isEditingSeekTime = false;
  syncTimeline();
});

seekTimeInput.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();

    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      statusText.textContent = "Load and play a track before seeking.";
      isEditingSeekTime = false;
      syncTimeline();
      return;
    }

    const parsed = parseTimeInput(seekTimeInput.textContent ?? "");
    if (parsed === null || Number.isNaN(parsed)) {
      statusText.textContent = "Invalid time format. Use ss, mm:ss, or hh:mm:ss.";
      seekTimeInput.textContent = formatDuration(audio.currentTime);
      return;
    }

    const clamped = Math.min(Math.max(parsed, 0), audio.duration);
    audio.currentTime = clamped;
    statusText.textContent = `Seeked to ${formatDuration(clamped)}.`;
    isEditingSeekTime = false;
    seekTimeInput.blur();
    syncTimeline();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    seekTimeInput.textContent = formatDuration(audio.currentTime);
    isEditingSeekTime = false;
    seekTimeInput.blur();
    syncTimeline();
  }
});

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && isHelpOpen) {
    event.preventDefault();
    closeHelpModal();
    return;
  }

  if (isTypingContext(event.target)) {
    return;
  }

  if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
    event.preventDefault();
    openHelpModal();
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (event.metaKey || event.ctrlKey) {
      moveSelectedBy(-1);
    } else {
      selectAdjacentBy(-1);
    }
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (event.metaKey || event.ctrlKey) {
      moveSelectedBy(1);
    } else {
      selectAdjacentBy(1);
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePlayPause();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    stopPlayback();
  }
});

window.addEventListener("beforeunload", () => {
  getAllItems().forEach((item) => URL.revokeObjectURL(item.url));
});

syncTimeline();
updateQueueSummary();
updateNowPlaying();
updatePlayToggleLabel();
renderQueue();
setPersistenceStatus("Checking local storage…", "saving");
void restoreQueueFromPersistence();
