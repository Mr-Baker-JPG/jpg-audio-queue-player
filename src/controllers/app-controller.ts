import type { PersistedQueueFolder, PersistedQueueItem, PersistedQueueState, QueueFolder, QueueItem } from "../domain/types";
import {
  createFolder as createFolderModel,
  findTrackLocation,
  getAllItems,
  getFlattenedTrackIds,
  getVisibleTrackIds,
  moveTrackAfterTarget as moveTrackAfterTargetModel,
  moveTrackBeforeTarget as moveTrackBeforeTargetModel,
  moveTrackToFolderEnd as moveTrackToFolderEndModel,
} from "../domain/queue-model";
import { clearQueueState, loadQueueState, saveQueueState } from "../services/persistence/queue-storage";
import { icons } from "../ui/icons";
import { appShellHtml } from "../ui/layout/app-shell";
import { renderQueueView } from "../ui/queue/queue-view";
import { isPersistableAudioFile } from "../utils/guards";
import { formatDuration, parseTimeInput } from "../utils/time";
import { setupPlaybackController } from "./playback-controller";
import { setupQueueController } from "./queue-controller";
import { setupShortcutsController } from "./shortcuts-controller";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = appShellHtml;

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

function buildPersistedState(): PersistedQueueState {
  const persistedFolders: PersistedQueueFolder[] = folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    isOpen: folder.isOpen,
    items: folder.items
      .filter((item) => isPersistableAudioFile(item.file))
      .map<PersistedQueueItem>((item) => ({
        id: item.id,
        file: item.file,
        durationSeconds: item.durationSeconds,
      })),
  }));

  return {
    nextItemId,
    nextFolderId,
    selectedId,
    selectedFolderId,
    folders: persistedFolders,
  };
}

async function savePersistedQueueState(): Promise<void> {
  if (!persistenceEnabled) {
    return;
  }

  await saveQueueState(buildPersistedState());
}

async function clearPersistedQueueState(): Promise<void> {
  await clearQueueState();
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

function getAllItemsState(): QueueItem[] {
  return getAllItems(folders);
}

function getVisibleTrackIdsState(): number[] {
  return getVisibleTrackIds(folders);
}

function findTrackLocationState(itemId: number) {
  return findTrackLocation(folders, itemId);
}

function getCurrentItem(): QueueItem | undefined {
  const location = playingId === null ? null : findTrackLocationState(playingId);
  return location?.item;
}

function updatePlayToggleLabel(): void {
  const isPlaying = playingId !== null && !audio.paused;
  playToggleButton.innerHTML = isPlaying ? icons.pause : icons.play;
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
  const items = getAllItemsState();
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
  const created = createFolderModel(folders, nextFolderId, name, isOpen);
  folders = created.folders;
  nextFolderId = created.nextFolderId;
  selectedFolderId = created.folder.id;
  return created.folder;
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
  const visibleIds = getVisibleTrackIdsState();
  if (visibleIds.length === 0) {
    return;
  }

  if (selectedId === null) {
    selectedId = delta > 0 ? visibleIds[0]! : visibleIds[visibleIds.length - 1]!;
    const selectedLocation = findTrackLocationState(selectedId);
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
  const selectedLocation = findTrackLocationState(selectedId);
  selectedFolderId = selectedLocation?.folder.id ?? selectedFolderId;
  statusText.textContent = selectedLocation ? `Selected: ${selectedLocation.item.file.name}` : statusText.textContent;
  renderQueue();
}

function moveTrackBeforeTarget(sourceId: number, targetId: number): boolean {
  const moved = moveTrackBeforeTargetModel(folders, sourceId, targetId);
  if (moved) {
    const target = findTrackLocationState(targetId);
    selectedFolderId = target?.folder.id ?? selectedFolderId;
  }
  return moved;
}

function moveTrackAfterTarget(sourceId: number, targetId: number): boolean {
  const moved = moveTrackAfterTargetModel(folders, sourceId, targetId);
  if (moved) {
    const target = findTrackLocationState(targetId);
    selectedFolderId = target?.folder.id ?? selectedFolderId;
  }
  return moved;
}

function moveTrackToFolderEnd(sourceId: number, targetFolderId: number): boolean {
  const moved = moveTrackToFolderEndModel(folders, sourceId, targetFolderId);
  if (moved) {
    selectedFolderId = targetFolderId;
  }
  return moved;
}

function moveSelectedBy(delta: number): void {
  if (selectedId === null) {
    statusText.textContent = "Select a track first.";
    return;
  }

  const visibleIds = getVisibleTrackIdsState();
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

function renderQueue(): void {
  renderQueueView({
    queueList,
    folders,
    selectedFolderId,
    selectedId,
    playingId,
    audioPaused: audio.paused,
    audioCurrentTime: audio.currentTime,
    getDraggedTrack: () => draggedTrack,
    formatDuration,
    onFolderSelect: (folderId) => {
      if (selectedFolderId === folderId) {
        return;
      }
      selectedFolderId = folderId;
      renderQueue();
    },
    onFolderToggle: (folderId) => {
      const folder = folders.find((entry) => entry.id === folderId);
      if (!folder) {
        return;
      }
      folder.isOpen = !folder.isOpen;
      selectedFolderId = folder.id;
      renderQueue();
    },
    onFolderRename: (folderId, nextName) => {
      const folder = folders.find((entry) => entry.id === folderId);
      if (!folder) {
        return;
      }
      folder.name = nextName;
      persistQueueState();
      renderQueue();
    },
    onTrackMoveToFolderEnd: (itemId, folderId) => {
      const moved = moveTrackToFolderEnd(itemId, folderId);
      if (moved) {
        persistQueueState();
        renderQueue();
      }
      return moved;
    },
    onTrackSelect: (itemId, folderId) => {
      selectedId = itemId;
      selectedFolderId = folderId;
      const track = findTrackLocationState(itemId);
      if (track) {
        statusText.textContent = `Selected: ${track.item.file.name}`;
      }
      renderQueue();
    },
    onTrackPlay: (itemId, folderId) => {
      selectedId = itemId;
      selectedFolderId = folderId;

      if (playingId === itemId && !audio.paused) {
        audio.pause();
        const current = getCurrentItem();
        statusText.textContent = current ? `Paused: ${current.file.name}` : "Playback paused.";
        updatePlayToggleLabel();
        updateNowPlaying();
        renderQueue();
        return;
      }

      playItem(itemId);
    },
    onTrackMoveBefore: (sourceId, targetId) => {
      const moved = moveTrackBeforeTarget(sourceId, targetId);
      if (moved) {
        persistQueueState();
        renderQueue();
      }
      return moved;
    },
    onTrackRemove: (itemId) => {
      removeItem(itemId);
    },
    onTrackDragStart: (itemId, sourceFolderId) => {
      draggedTrack = { itemId, sourceFolderId };
    },
    onTrackDragEnd: () => {
      draggedTrack = null;
    },
    setStatus: (message) => {
      statusText.textContent = message;
    },
  });

  updateQueueSummary();
  updateNowPlaying();
  updatePlayToggleLabel();
}

function playItem(id: number): void {
  const location = findTrackLocationState(id);
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
  const location = findTrackLocationState(id);
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
  const allItems = getAllItemsState();
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
    const saved = await loadQueueState();
    const savedFolders = Array.isArray(saved?.folders) ? saved.folders : [];

    if (!saved || savedFolders.length === 0) {
      setPersistenceStatus("Saved locally", "saved");
      return;
    }

    getAllItemsState().forEach((item) => URL.revokeObjectURL(item.url));

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

    nextItemId = Math.max(saved.nextItemId ?? 1, ...getAllItemsState().map((item) => item.id + 1), 1);
    nextFolderId = Math.max(saved.nextFolderId ?? 1, ...folders.map((folder) => folder.id + 1), 1);

    selectedId = saved.selectedId ?? null;
    if (selectedId !== null && !findTrackLocationState(selectedId)) {
      selectedId = null;
    }

    selectedFolderId = saved.selectedFolderId ?? null;
    if (selectedFolderId !== null && !folders.some((folder) => folder.id === selectedFolderId)) {
      selectedFolderId = folders[0]?.id ?? null;
    }

    setPersistenceStatus("Restored from local storage", "saved");
    statusText.textContent = `Restored ${getAllItemsState().length} track(s) from local storage.`;
    renderQueue();
  } catch (error: unknown) {
    console.error("Failed to restore queue", error);
    persistenceEnabled = false;
    setPersistenceStatus("Local restore failed (disabled)", "error");
    statusText.textContent = "Could not restore saved queue.";
  }
}

function getFlattenedTrackIdsState(): number[] {
  return getFlattenedTrackIds(folders);
}

setupPlaybackController({
  audio,
  playToggleButton,
  stopButton,
  volumeSlider,
  seekBar,
  seekTimeInput,
  statusText,
  syncTimeline,
  updateBufferBar,
  updatePlayToggleLabel,
  updateNowPlaying,
  renderQueue,
  togglePlayPause,
  stopPlayback,
  onTrackEnded: () => {
    if (playingId === null) {
      return;
    }

    const allTrackIds = getFlattenedTrackIdsState();
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
  },
  formatDuration,
  parseTimeInput,
  setIsEditingSeekTime: (value) => {
    isEditingSeekTime = value;
  },
});

setupQueueController({
  fileInput,
  addFolderButton,
  clearQueueButton,
  dropZone,
  openHelpButton,
  closeHelpButton,
  resetStorageButton,
  helpModal,
  addFiles,
  createFolder: () => createFolder(),
  clearQueue,
  persistQueueState,
  renderQueue,
  openHelpModal,
  closeHelpModal,
  clearPersistedQueueState,
  showToast,
  setStatus: (message) => {
    statusText.textContent = message;
  },
});

setupShortcutsController({
  isTypingContext,
  isHelpOpen: () => isHelpOpen,
  openHelpModal,
  closeHelpModal,
  moveSelectedBy,
  selectAdjacentBy,
  togglePlayPause,
  stopPlayback,
});

window.addEventListener("beforeunload", () => {
  getAllItemsState().forEach((item) => URL.revokeObjectURL(item.url));
});

syncTimeline();
updateQueueSummary();
updateNowPlaying();
updatePlayToggleLabel();
renderQueue();
setPersistenceStatus("Checking local storage…", "saving");
void restoreQueueFromPersistence();
