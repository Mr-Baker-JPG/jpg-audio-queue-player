interface ShortcutsControllerDeps {
  isTypingContext: (target: EventTarget | null) => boolean;
  isHelpOpen: () => boolean;
  openHelpModal: () => void;
  closeHelpModal: () => void;
  moveSelectedBy: (delta: number) => void;
  selectAdjacentBy: (delta: number) => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
}

export function setupShortcutsController(deps: ShortcutsControllerDeps): void {
  const {
    isTypingContext,
    isHelpOpen,
    openHelpModal,
    closeHelpModal,
    moveSelectedBy,
    selectAdjacentBy,
    togglePlayPause,
    stopPlayback,
  } = deps;

  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && isHelpOpen()) {
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
}
