import { describe, expect, it, vi } from "vitest";
import { setupPlaybackController } from "./playback-controller";

class MockAudio extends EventTarget {
  duration = Number.NaN;
  currentTime = 0;
  volume = 1;
}

class MockElement extends EventTarget {
  value = "";
  textContent = "";
  blur = vi.fn<() => void>();
}

function keyDownEvent(key: string): Event {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperty(event, "key", { value: key, configurable: true });
  return event;
}

describe("setupPlaybackController", () => {
  it("wires audio and button events to callbacks", () => {
    const audio = new MockAudio();
    const playToggleButton = new MockElement();
    const stopButton = new MockElement();
    const seekTimeInput = new MockElement();

    const syncTimeline = vi.fn<() => void>();
    const updateBufferBar = vi.fn<() => void>();
    const updatePlayToggleLabel = vi.fn<() => void>();
    const updateNowPlaying = vi.fn<() => void>();
    const renderQueue = vi.fn<() => void>();
    const togglePlayPause = vi.fn<() => void>();
    const stopPlayback = vi.fn<() => void>();
    const onTrackEnded = vi.fn<() => void>();
    const setIsEditingSeekTime = vi.fn<(value: boolean) => void>();

    setupPlaybackController({
      audio: audio as unknown as HTMLAudioElement,
      playToggleButton: playToggleButton as unknown as HTMLButtonElement,
      stopButton: stopButton as unknown as HTMLButtonElement,
      volumeSlider: new MockElement() as unknown as HTMLInputElement,
      seekBar: new MockElement() as unknown as HTMLInputElement,
      seekTimeInput: seekTimeInput as unknown as HTMLDivElement,
      statusText: new MockElement() as unknown as HTMLParagraphElement,
      syncTimeline,
      updateBufferBar,
      updatePlayToggleLabel,
      updateNowPlaying,
      renderQueue,
      togglePlayPause,
      stopPlayback,
      onTrackEnded,
      formatDuration: (seconds) => `F${Math.floor(seconds)}`,
      parseTimeInput: vi.fn(),
      setIsEditingSeekTime,
    });

    audio.currentTime = 12;
    seekTimeInput.dispatchEvent(new Event("focus"));
    expect(setIsEditingSeekTime).toHaveBeenCalledWith(true);
    expect(seekTimeInput.textContent).toBe("F12");

    seekTimeInput.dispatchEvent(new Event("blur"));
    expect(setIsEditingSeekTime).toHaveBeenCalledWith(false);
    expect(syncTimeline).toHaveBeenCalled();

    audio.dispatchEvent(new Event("ended"));
    expect(onTrackEnded).toHaveBeenCalledTimes(1);

    audio.dispatchEvent(new Event("loadedmetadata"));
    audio.dispatchEvent(new Event("progress"));
    audio.dispatchEvent(new Event("timeupdate"));
    expect(updateBufferBar).toHaveBeenCalled();
    expect(syncTimeline).toHaveBeenCalled();

    audio.dispatchEvent(new Event("pause"));
    audio.dispatchEvent(new Event("play"));
    expect(updatePlayToggleLabel).toHaveBeenCalled();
    expect(updateNowPlaying).toHaveBeenCalled();
    expect(renderQueue).toHaveBeenCalled();

    playToggleButton.dispatchEvent(new Event("click"));
    stopButton.dispatchEvent(new Event("click"));
    expect(togglePlayPause).toHaveBeenCalledTimes(1);
    expect(stopPlayback).toHaveBeenCalledTimes(1);
  });

  it("updates volume and clamps seek input", () => {
    const audio = new MockAudio();
    const volumeSlider = new MockElement();
    const seekBar = new MockElement();
    const syncTimeline = vi.fn<() => void>();

    setupPlaybackController({
      audio: audio as unknown as HTMLAudioElement,
      playToggleButton: new MockElement() as unknown as HTMLButtonElement,
      stopButton: new MockElement() as unknown as HTMLButtonElement,
      volumeSlider: volumeSlider as unknown as HTMLInputElement,
      seekBar: seekBar as unknown as HTMLInputElement,
      seekTimeInput: new MockElement() as unknown as HTMLDivElement,
      statusText: new MockElement() as unknown as HTMLParagraphElement,
      syncTimeline,
      updateBufferBar: vi.fn(),
      updatePlayToggleLabel: vi.fn(),
      updateNowPlaying: vi.fn(),
      renderQueue: vi.fn(),
      togglePlayPause: vi.fn(),
      stopPlayback: vi.fn(),
      onTrackEnded: vi.fn(),
      formatDuration: (seconds) => `${Math.floor(seconds)}`,
      parseTimeInput: vi.fn(),
      setIsEditingSeekTime: vi.fn(),
    });

    volumeSlider.value = "2";
    volumeSlider.dispatchEvent(new Event("input"));
    expect(audio.volume).toBe(1);

    volumeSlider.value = "-1";
    volumeSlider.dispatchEvent(new Event("input"));
    expect(audio.volume).toBe(0);

    audio.duration = 100;
    seekBar.value = "150";
    seekBar.dispatchEvent(new Event("input"));
    expect(audio.currentTime).toBe(100);
    expect(syncTimeline).toHaveBeenCalled();
  });

  it("shows a helpful message when seeking before track is loaded", () => {
    const audio = new MockAudio();
    const seekTimeInput = new MockElement();
    const statusText = new MockElement();

    setupPlaybackController({
      audio: audio as unknown as HTMLAudioElement,
      playToggleButton: new MockElement() as unknown as HTMLButtonElement,
      stopButton: new MockElement() as unknown as HTMLButtonElement,
      volumeSlider: new MockElement() as unknown as HTMLInputElement,
      seekBar: new MockElement() as unknown as HTMLInputElement,
      seekTimeInput: seekTimeInput as unknown as HTMLDivElement,
      statusText: statusText as unknown as HTMLParagraphElement,
      syncTimeline: vi.fn(),
      updateBufferBar: vi.fn(),
      updatePlayToggleLabel: vi.fn(),
      updateNowPlaying: vi.fn(),
      renderQueue: vi.fn(),
      togglePlayPause: vi.fn(),
      stopPlayback: vi.fn(),
      onTrackEnded: vi.fn(),
      formatDuration: (seconds) => `${Math.floor(seconds)}`,
      parseTimeInput: vi.fn(),
      setIsEditingSeekTime: vi.fn(),
    });

    audio.duration = Number.NaN;
    seekTimeInput.dispatchEvent(keyDownEvent("Enter"));

    expect(statusText.textContent).toBe("Load and play a track before seeking.");
  });

  it("shows invalid format message when parsed seek is NaN", () => {
    const audio = new MockAudio();
    audio.duration = 120;
    const seekTimeInput = new MockElement();
    const statusText = new MockElement();

    setupPlaybackController({
      audio: audio as unknown as HTMLAudioElement,
      playToggleButton: new MockElement() as unknown as HTMLButtonElement,
      stopButton: new MockElement() as unknown as HTMLButtonElement,
      volumeSlider: new MockElement() as unknown as HTMLInputElement,
      seekBar: new MockElement() as unknown as HTMLInputElement,
      seekTimeInput: seekTimeInput as unknown as HTMLDivElement,
      statusText: statusText as unknown as HTMLParagraphElement,
      syncTimeline: vi.fn(),
      updateBufferBar: vi.fn(),
      updatePlayToggleLabel: vi.fn(),
      updateNowPlaying: vi.fn(),
      renderQueue: vi.fn(),
      togglePlayPause: vi.fn(),
      stopPlayback: vi.fn(),
      onTrackEnded: vi.fn(),
      formatDuration: (seconds) => `T${Math.floor(seconds)}`,
      parseTimeInput: () => Number.NaN,
      setIsEditingSeekTime: vi.fn(),
    });

    seekTimeInput.dispatchEvent(keyDownEvent("Enter"));
    expect(statusText.textContent).toBe("Invalid time format. Use ss, mm:ss, or hh:mm:ss.");
  });

  it("seeks on valid Enter input and handles Escape reset", () => {
    const audio = new MockAudio();
    audio.duration = 120;
    audio.currentTime = 10;

    const seekTimeInput = new MockElement();
    const statusText = new MockElement();
    const setIsEditingSeekTime = vi.fn<(value: boolean) => void>();
    const syncTimeline = vi.fn<() => void>();

    setupPlaybackController({
      audio: audio as unknown as HTMLAudioElement,
      playToggleButton: new MockElement() as unknown as HTMLButtonElement,
      stopButton: new MockElement() as unknown as HTMLButtonElement,
      volumeSlider: new MockElement() as unknown as HTMLInputElement,
      seekBar: new MockElement() as unknown as HTMLInputElement,
      seekTimeInput: seekTimeInput as unknown as HTMLDivElement,
      statusText: statusText as unknown as HTMLParagraphElement,
      syncTimeline,
      updateBufferBar: vi.fn(),
      updatePlayToggleLabel: vi.fn(),
      updateNowPlaying: vi.fn(),
      renderQueue: vi.fn(),
      togglePlayPause: vi.fn(),
      stopPlayback: vi.fn(),
      onTrackEnded: vi.fn(),
      formatDuration: (seconds) => `T${Math.floor(seconds)}`,
      parseTimeInput: (raw) => (raw === "bad" ? null : 130),
      setIsEditingSeekTime,
    });

    seekTimeInput.textContent = "130";
    seekTimeInput.dispatchEvent(keyDownEvent("Enter"));

    expect(audio.currentTime).toBe(120);
    expect(statusText.textContent).toBe("Seeked to T120.");
    expect(setIsEditingSeekTime).toHaveBeenCalledWith(false);
    expect(seekTimeInput.blur).toHaveBeenCalled();

    seekTimeInput.textContent = "bad";
    seekTimeInput.dispatchEvent(keyDownEvent("Enter"));
    expect(statusText.textContent).toBe("Invalid time format. Use ss, mm:ss, or hh:mm:ss.");
    expect(seekTimeInput.textContent).toBe("T120");

    seekTimeInput.textContent = "anything";
    seekTimeInput.dispatchEvent(keyDownEvent("Escape"));
    expect(seekTimeInput.textContent).toBe("T120");
    expect(syncTimeline).toHaveBeenCalled();
  });
});
