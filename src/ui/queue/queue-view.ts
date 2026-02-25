import type { QueueFolder } from "../../domain/types";
import { icons } from "../icons";

interface DraggedTrackState {
  itemId: number;
  sourceFolderId: number;
}

interface QueueViewOptions {
  queueList: HTMLUListElement;
  folders: QueueFolder[];
  selectedFolderId: number | null;
  selectedId: number | null;
  playingId: number | null;
  audioPaused: boolean;
  audioCurrentTime: number;
  getDraggedTrack: () => DraggedTrackState | null;
  formatDuration: (seconds: number) => string;
  onFolderSelect: (folderId: number) => void;
  onFolderToggle: (folderId: number) => void;
  onFolderRename: (folderId: number, nextName: string) => void;
  onTrackMoveToFolderEnd: (itemId: number, folderId: number) => boolean;
  onTrackSelect: (itemId: number, folderId: number) => void;
  onTrackPlay: (itemId: number, folderId: number) => void;
  onTrackMoveBefore: (sourceId: number, targetId: number) => boolean;
  onTrackRemove: (itemId: number) => void;
  onTrackDragStart: (itemId: number, sourceFolderId: number) => void;
  onTrackDragEnd: () => void;
  setStatus: (message: string) => void;
}

function startInlineRename(
  element: HTMLSpanElement,
  originalName: string,
  onCommit: (nextName: string) => void,
): void {
  if (element.dataset.editing === "true") {
    return;
  }

  element.dataset.editing = "true";
  element.classList.add("editing");
  element.contentEditable = "true";
  element.spellcheck = false;
  element.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const cleanup = () => {
    element.contentEditable = "false";
    element.classList.remove("editing");
    delete element.dataset.editing;
    element.removeEventListener("keydown", onKeyDown);
    element.removeEventListener("blur", onBlur);
  };

  const commit = () => {
    const nextName = (element.textContent ?? "").trim() || originalName;
    cleanup();
    onCommit(nextName);
  };

  const cancel = () => {
    element.textContent = originalName;
    cleanup();
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

  element.addEventListener("keydown", onKeyDown);
  element.addEventListener("blur", onBlur);
}

export function renderQueueView(options: QueueViewOptions): void {
  const {
    queueList,
    folders,
    selectedFolderId,
    selectedId,
    playingId,
    audioPaused,
    audioCurrentTime,
    getDraggedTrack,
    formatDuration,
    onFolderSelect,
    onFolderToggle,
    onFolderRename,
    onTrackMoveToFolderEnd,
    onTrackSelect,
    onTrackPlay,
    onTrackMoveBefore,
    onTrackRemove,
    onTrackDragStart,
    onTrackDragEnd,
    setStatus,
  } = options;

  queueList.innerHTML = "";

  if (folders.length === 0) {
    queueList.innerHTML = `
      <li class="empty">
        No folders yet.
        <span>Click “+ Folder”, then add audio files into it.</span>
      </li>
    `;
    return;
  }

  folders.forEach((folder) => {
    const folderSection = document.createElement("li");
    folderSection.className = `folder-section${selectedFolderId === folder.id ? " selected-folder" : ""}`;

    const header = document.createElement("div");
    header.className = "folder-header";
    header.addEventListener("click", () => {
      onFolderSelect(folder.id);
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "folder-toggle";
    toggleButton.innerHTML = folder.isOpen ? icons.chevronDown : icons.chevronRight;
    toggleButton.addEventListener("click", (event: MouseEvent) => {
      event.stopPropagation();
      onFolderToggle(folder.id);
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
      startInlineRename(folderName, folder.name, (nextName) => onFolderRename(folder.id, nextName));
    });

    const folderDuration = folder.items.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
    const folderMeta = document.createElement("span");
    folderMeta.className = "folder-meta";
    folderMeta.textContent = `${folder.items.length} • ${formatDuration(folderDuration)}`;

    header.append(toggleButton, folderName, folderMeta);

    const body = document.createElement("div");
    body.className = `folder-body${folder.isOpen ? "" : " hidden"}`;

    body.addEventListener("dragover", (event: DragEvent) => {
      const draggedTrack = getDraggedTrack();
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
      const draggedTrack = getDraggedTrack();
      if (!draggedTrack) {
        return;
      }

      const moved = onTrackMoveToFolderEnd(draggedTrack.itemId, folder.id);
      if (moved) {
        setStatus("Queue order updated.");
      }
    });

    if (folder.items.length === 0) {
      const empty = document.createElement("p");
      empty.className = "folder-empty";
      empty.textContent = "No tracks in this folder yet.";
      body.append(empty);
    } else {
      folder.items.forEach((item, itemIndex) => {
        const row = document.createElement("div");
        const isSelected = selectedId === item.id;
        const isPlaying = playingId === item.id && !audioPaused;
        const isPaused = playingId === item.id && audioPaused && audioCurrentTime > 0;

        row.className = `queue-item${isSelected ? " selected" : ""}${isPlaying ? " playing" : ""}${isPaused ? " paused" : ""}`;
        row.draggable = true;

        row.addEventListener("click", (event: MouseEvent) => {
          const target = event.target as { closest?: (selector: string) => Element | null } | null;
          if (target?.closest?.("button")) {
            return;
          }

          onTrackSelect(item.id, folder.id);
        });

        row.addEventListener("dragstart", () => {
          onTrackDragStart(item.id, folder.id);
          row.classList.add("dragging");
        });

        row.addEventListener("dragover", (event: DragEvent) => {
          const draggedTrack = getDraggedTrack();
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
          event.stopPropagation();
          row.classList.remove("drag-over");
          const draggedTrack = getDraggedTrack();
          if (!draggedTrack || draggedTrack.itemId === item.id) {
            return;
          }

          const rowBounds = row.getBoundingClientRect();
          const droppedInLowerHalf = event.clientY >= rowBounds.top + rowBounds.height / 2;
          const isLastRow = itemIndex === folder.items.length - 1;

          const moved = isLastRow && droppedInLowerHalf
            ? onTrackMoveToFolderEnd(draggedTrack.itemId, folder.id)
            : onTrackMoveBefore(draggedTrack.itemId, item.id);

          if (moved) {
            setStatus("Queue order updated.");
          }
        });

        row.addEventListener("dragend", () => {
          onTrackDragEnd();
          row.classList.remove("dragging", "drag-over");
        });

        const stateIcon = document.createElement("span");
        stateIcon.className = "state-icon";
        stateIcon.innerHTML = isPlaying ? icons.play : isPaused ? icons.pause : icons.gripHorizontal;

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "icon-button track-play";
        const isCurrentPlaying = playingId === item.id && !audioPaused;
        playButton.setAttribute("aria-label", `${isCurrentPlaying ? "Pause" : "Play"} ${item.file.name}`);
        playButton.title = isCurrentPlaying ? "Pause" : "Play";
        playButton.innerHTML = isCurrentPlaying ? icons.pause : icons.play;
        playButton.addEventListener("click", () => {
          onTrackPlay(item.id, folder.id);
        });

        const title = document.createElement("span");
        title.className = "track-title";
        title.textContent = item.file.name;

        const meta = document.createElement("span");
        meta.className = "track-meta";
        meta.textContent = item.durationSeconds === null ? "--:--" : formatDuration(item.durationSeconds);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "icon-button danger";
        removeButton.setAttribute("aria-label", `Remove ${item.file.name}`);
        removeButton.title = "Remove";
        removeButton.innerHTML = icons.x;
        removeButton.addEventListener("click", () => {
          onTrackRemove(item.id);
        });

        row.append(stateIcon, playButton, title, meta, removeButton);
        body.append(row);
      });
    }

    folderSection.append(header, body);
    queueList.append(folderSection);
  });

  if (folders.every((folder) => folder.items.length === 0)) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.innerHTML = `No tracks yet.<span>Select a folder and add audio files.</span>`;
    queueList.append(empty);
  }
}
