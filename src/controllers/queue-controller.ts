interface QueueControllerDeps {
  fileInput: HTMLInputElement;
  addFolderButton: HTMLButtonElement;
  clearQueueButton: HTMLButtonElement;
  dropZone: HTMLDivElement;
  openHelpButton: HTMLButtonElement;
  closeHelpButton: HTMLButtonElement;
  resetStorageButton: HTMLButtonElement;
  helpModal: HTMLDivElement;
  addFiles: (files: FileList | File[]) => void;
  createFolder: () => { name: string };
  clearQueue: () => void;
  persistQueueState: () => void;
  renderQueue: () => void;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  clearPersistedQueueState: () => Promise<void>;
  showToast: (message: string, state?: "saved" | "saving" | "error", durationMs?: number) => void;
  setStatus: (message: string) => void;
}

export function setupQueueController(deps: QueueControllerDeps): void {
  const {
    fileInput,
    addFolderButton,
    clearQueueButton,
    dropZone,
    openHelpButton,
    closeHelpButton,
    resetStorageButton,
    helpModal,
    addFiles,
    createFolder,
    clearQueue,
    persistQueueState,
    renderQueue,
    openHelpModal,
    closeHelpModal,
    clearPersistedQueueState,
    showToast,
    setStatus,
  } = deps;

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
    setStatus(`${folder.name} created. Double-click folder name to rename.`);
    persistQueueState();
    renderQueue();
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
}
