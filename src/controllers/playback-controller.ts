interface PlaybackControllerDeps {
  audio: HTMLAudioElement;
  playToggleButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  volumeSlider: HTMLInputElement;
  seekBar: HTMLInputElement;
  seekTimeInput: HTMLDivElement;
  statusText: HTMLParagraphElement;
  syncTimeline: () => void;
  updateBufferBar: () => void;
  updatePlayToggleLabel: () => void;
  updateNowPlaying: () => void;
  renderQueue: () => void;
  togglePlayPause: () => void;
  stopPlayback: () => void;
  onTrackEnded: () => void;
  formatDuration: (seconds: number) => string;
  parseTimeInput: (raw: string) => number | null;
  setIsEditingSeekTime: (value: boolean) => void;
}

export function setupPlaybackController(deps: PlaybackControllerDeps): void {
  const {
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
    onTrackEnded,
    formatDuration,
    parseTimeInput,
    setIsEditingSeekTime,
  } = deps;

  audio.addEventListener("ended", onTrackEnded);

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

  playToggleButton.addEventListener("click", () => {
    togglePlayPause();
  });

  stopButton.addEventListener("click", () => {
    stopPlayback();
  });

  volumeSlider.addEventListener("input", () => {
    const value = Number(volumeSlider.value);
    if (!Number.isNaN(value)) {
      audio.volume = Math.min(Math.max(value, 0), 1);
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
    setIsEditingSeekTime(true);
    seekTimeInput.textContent = formatDuration(audio.currentTime);
  });

  seekTimeInput.addEventListener("blur", () => {
    setIsEditingSeekTime(false);
    syncTimeline();
  });

  seekTimeInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        statusText.textContent = "Load and play a track before seeking.";
        setIsEditingSeekTime(false);
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
      setIsEditingSeekTime(false);
      seekTimeInput.blur();
      syncTimeline();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      seekTimeInput.textContent = formatDuration(audio.currentTime);
      setIsEditingSeekTime(false);
      seekTimeInput.blur();
      syncTimeline();
    }
  });
}
