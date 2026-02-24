import "./style.css";

interface QueueItem {
  id: number;
  file: File;
  url: string;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <main class="player-app">
    <header>
      <div class="header-row">
        <h1>Audio Queue Player</h1>
        <button id="open-help" type="button" class="help-button" aria-label="Open keyboard shortcuts help">?</button>
      </div>
      <p>Add audio files to your queue. Nothing plays until you click a track.</p>
    </header>

    <section class="controls">
      <label class="file-picker" for="audio-files">+ Add Audio Files</label>
      <input id="audio-files" type="file" accept="audio/*" multiple />

      <button id="play-selected" type="button">Play Selected</button>
      <button id="pause-playback" type="button">Pause</button>
      <button id="stop-playback" type="button">Stop</button>
      <button id="clear-queue" type="button" class="danger">Clear Queue</button>
    </section>

    <section class="timeline-panel">
      <input id="seek-bar" type="range" min="0" max="0" value="0" step="0.01" disabled />
      <div class="timeline-marks">
        <span id="current-time">00:00</span>
        <div
          id="seek-time-input"
          class="seek-time-input"
          contenteditable="true"
          role="textbox"
          aria-label="Seek time"
          spellcheck="false"
        >00:00</div>
        <span id="total-time">00:00</span>
      </div>
    </section>

    <section>
      <ul id="queue-list" class="queue-list"></ul>
    </section>

    <footer>
      <p id="status">No track selected.</p>
    </footer>

    <div id="help-modal" class="help-modal hidden" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-modal-card">
        <div class="help-modal-header">
          <h2 id="help-title">Keyboard Shortcuts</h2>
          <button id="close-help" type="button" class="help-close" aria-label="Close help">✕</button>
        </div>
        <ul class="help-shortcuts">
          <li><kbd>↑</kbd> / <kbd>↓</kbd> <span>Select previous / next track</span></li>
          <li><kbd>⌘ / Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> <span>Move selected track</span></li>
          <li><kbd>Space</kbd> <span>Play / Pause selected track</span></li>
          <li><kbd>Esc</kbd> <span>Stop playback (or close help)</span></li>
          <li><kbd>?</kbd> <span>Open this help modal</span></li>
        </ul>
      </div>
    </div>
  </main>
`;

const fileInput = document.querySelector<HTMLInputElement>("#audio-files")!;
const playSelectedButton = document.querySelector<HTMLButtonElement>("#play-selected")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pause-playback")!;
const stopButton = document.querySelector<HTMLButtonElement>("#stop-playback")!;
const clearQueueButton = document.querySelector<HTMLButtonElement>("#clear-queue")!;
const queueList = document.querySelector<HTMLUListElement>("#queue-list")!;
const statusText = document.querySelector<HTMLParagraphElement>("#status")!;
const seekBar = document.querySelector<HTMLInputElement>("#seek-bar")!;
const currentTimeText = document.querySelector<HTMLSpanElement>("#current-time")!;
const totalTimeText = document.querySelector<HTMLSpanElement>("#total-time")!;
const seekTimeInput = document.querySelector<HTMLDivElement>("#seek-time-input")!;
const openHelpButton = document.querySelector<HTMLButtonElement>("#open-help")!;
const closeHelpButton = document.querySelector<HTMLButtonElement>("#close-help")!;
const helpModal = document.querySelector<HTMLDivElement>("#help-modal")!;

const audio = new Audio();
let queue: QueueItem[] = [];
let selectedId: number | null = null;
let playingId: number | null = null;
let draggedId: number | null = null;
let nextId = 1;
let isEditingSeekTime = false;
let isHelpOpen = false;

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
  const normalized = rawValue.trim().split("/")[0]?.trim() ?? "";
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

function syncTimeline(): void {
  const hasDuration = Number.isFinite(audio.duration) && audio.duration > 0;
  seekBar.disabled = !hasDuration;

  if (!hasDuration) {
    seekBar.max = "0";
    seekBar.value = "0";
    currentTimeText.textContent = "00:00";
    totalTimeText.textContent = "00:00";
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

function moveItemInQueue(sourceId: number, targetId: number): void {
  if (sourceId === targetId) {
    return;
  }

  const sourceIndex = queue.findIndex((item) => item.id === sourceId);
  const targetIndex = queue.findIndex((item) => item.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return;
  }

  const updatedQueue = [...queue];
  const [movedItem] = updatedQueue.splice(sourceIndex, 1);
  updatedQueue.splice(targetIndex, 0, movedItem);
  queue = updatedQueue;
}

function selectAdjacentBy(delta: number): void {
  if (queue.length === 0) {
    return;
  }

  if (selectedId === null) {
    const fallbackIndex = delta > 0 ? 0 : queue.length - 1;
    selectedId = queue[fallbackIndex]?.id ?? null;
    if (selectedId !== null) {
      statusText.textContent = `Selected: ${queue[fallbackIndex]!.file.name}`;
      renderQueue();
    }
    return;
  }

  const currentIndex = queue.findIndex((item) => item.id === selectedId);
  if (currentIndex === -1) {
    return;
  }

  const targetIndex = Math.min(Math.max(currentIndex + delta, 0), queue.length - 1);
  if (targetIndex === currentIndex) {
    return;
  }

  selectedId = queue[targetIndex]!.id;
  statusText.textContent = `Selected: ${queue[targetIndex]!.file.name}`;
  renderQueue();
}

function moveSelectedBy(delta: number): void {
  if (selectedId === null) {
    statusText.textContent = "Select a track first.";
    return;
  }

  const currentIndex = queue.findIndex((item) => item.id === selectedId);
  if (currentIndex === -1) {
    return;
  }

  const targetIndex = currentIndex + delta;
  if (targetIndex < 0 || targetIndex >= queue.length) {
    return;
  }

  const selectedItem = queue[currentIndex]!;
  const targetItem = queue[targetIndex]!;
  moveItemInQueue(selectedId, targetItem.id);
  statusText.textContent = `Moved: ${selectedItem.file.name}`;
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
  queueList.innerHTML = "";

  if (queue.length === 0) {
    queueList.innerHTML = `<li class="empty">Queue is empty. Add audio files to begin.</li>`;
    return;
  }

  queue.forEach((item, index) => {
    const li = document.createElement("li");
    const isSelected = selectedId === item.id;
    const isPlaying = playingId === item.id;

    li.className = `queue-item${isSelected ? " selected" : ""}${isPlaying ? " playing" : ""}`;
    li.dataset.id = String(item.id);
    li.draggable = true;

    li.addEventListener("click", (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("button")) {
        return;
      }

      selectedId = item.id;
      statusText.textContent = `Selected: ${item.file.name}`;
      renderQueue();
    });

    li.addEventListener("dragstart", (event: DragEvent) => {
      draggedId = item.id;
      li.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(item.id));
      }
    });

    li.addEventListener("dragover", (event: DragEvent) => {
      if (draggedId === null || draggedId === item.id) {
        return;
      }

      event.preventDefault();
      li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });

    li.addEventListener("drop", (event: DragEvent) => {
      event.preventDefault();
      li.classList.remove("drag-over");

      if (draggedId === null || draggedId === item.id) {
        return;
      }

      moveItemInQueue(draggedId, item.id);
      statusText.textContent = "Queue order updated.";
      renderQueue();
    });

    li.addEventListener("dragend", () => {
      draggedId = null;
      li.classList.remove("dragging", "drag-over");
    });

    const title = document.createElement("button");
    title.type = "button";
    title.className = "track-title";
    title.textContent = `${index + 1}. ${item.file.name}`;
    title.addEventListener("click", () => {
      selectedId = item.id;
      playItem(item.id);
    });

    const meta = document.createElement("span");
    meta.className = "track-meta";
    meta.textContent = `${(item.file.size / (1024 * 1024)).toFixed(2)} MB`;

    const actions = document.createElement("div");
    actions.className = "track-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      removeItem(item.id);
    });

    actions.append(removeButton);
    li.append(title, meta, actions);
    queueList.append(li);
  });
}

function playItem(id: number): void {
  const item = queue.find((queueItem) => queueItem.id === id);
  if (!item) {
    statusText.textContent = "Track not found.";
    return;
  }

  selectedId = id;
  playingId = id;
  audio.src = item.url;

  void audio
    .play()
    .then(() => {
      statusText.textContent = `Playing: ${item.file.name}`;
      syncTimeline();
      renderQueue();
    })
    .catch((error: unknown) => {
      console.error("Playback failed", error);
      statusText.textContent = `Could not play ${item.file.name}`;
      playingId = null;
      renderQueue();
    });
}

function pausePlayback(): void {
  if (playingId === null || audio.paused) {
    return;
  }

  audio.pause();
  const current = queue.find((item) => item.id === playingId);
  statusText.textContent = current ? `Paused: ${current.file.name}` : "Playback paused.";
  syncTimeline();
}

function playSelectedOrResume(): void {
  if (selectedId === null) {
    statusText.textContent = "Select a track first, then press Space to play.";
    return;
  }

  if (playingId === selectedId && audio.src && audio.paused) {
    void audio.play().then(() => {
      const current = queue.find((item) => item.id === selectedId);
      statusText.textContent = current ? `Playing: ${current.file.name}` : "Playback resumed.";
      syncTimeline();
      renderQueue();
    }).catch((error: unknown) => {
      console.error("Resume failed", error);
      statusText.textContent = "Could not resume playback.";
    });
    return;
  }

  playItem(selectedId);
}

function stopPlayback(): void {
  const wasPlaying = playingId;
  audio.pause();
  audio.currentTime = 0;
  playingId = null;

  if (wasPlaying !== null) {
    const current = queue.find((item) => item.id === wasPlaying);
    statusText.textContent = current ? `Stopped: ${current.file.name}` : "Playback stopped.";
  } else {
    statusText.textContent = "Playback stopped.";
  }

  syncTimeline();
  renderQueue();
}

function removeItem(id: number): void {
  const item = queue.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  const wasPlaying = playingId === id;
  URL.revokeObjectURL(item.url);
  queue = queue.filter((entry) => entry.id !== id);

  if (selectedId === id) {
    selectedId = null;
  }

  if (wasPlaying) {
    stopPlayback();
  }

  renderQueue();
}

function clearQueue(): void {
  stopPlayback();
  queue.forEach((item) => URL.revokeObjectURL(item.url));
  queue = [];
  selectedId = null;
  audio.removeAttribute("src");
  audio.load();
  statusText.textContent = "Queue cleared.";
  syncTimeline();
  renderQueue();
}

audio.addEventListener("ended", () => {
  if (playingId === null) {
    return;
  }

  const currentIndex = queue.findIndex((item) => item.id === playingId);
  const nextItem = queue[currentIndex + 1];

  if (!nextItem) {
    playingId = null;
    statusText.textContent = "Playback finished.";
    syncTimeline();
    renderQueue();
    return;
  }

  playItem(nextItem.id);
});

audio.addEventListener("loadedmetadata", () => {
  syncTimeline();
});

audio.addEventListener("timeupdate", () => {
  syncTimeline();
});

fileInput.addEventListener("change", () => {
  const files = fileInput.files;
  if (!files || files.length === 0) {
    return;
  }

  const items = Array.from(files).map<QueueItem>((file) => ({
    id: nextId++,
    file,
    url: URL.createObjectURL(file),
  }));

  queue = [...queue, ...items];
  statusText.textContent = `${items.length} file(s) added to queue.`;
  fileInput.value = "";
  renderQueue();
});

playSelectedButton.addEventListener("click", () => {
  playSelectedOrResume();
});

pauseButton.addEventListener("click", () => {
  pausePlayback();
});

stopButton.addEventListener("click", () => {
  stopPlayback();
});

clearQueueButton.addEventListener("click", () => {
  clearQueue();
});

openHelpButton.addEventListener("click", () => {
  openHelpModal();
});

closeHelpButton.addEventListener("click", () => {
  closeHelpModal();
});

helpModal.addEventListener("click", (event: MouseEvent) => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
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

    if (playingId !== null && !audio.paused) {
      pausePlayback();
      return;
    }

    playSelectedOrResume();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    stopPlayback();
  }
});

window.addEventListener("beforeunload", () => {
  queue.forEach((item) => URL.revokeObjectURL(item.url));
});

syncTimeline();
renderQueue();
