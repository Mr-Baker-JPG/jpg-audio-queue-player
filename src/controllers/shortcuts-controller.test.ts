import { afterEach, describe, expect, it, vi } from "vitest";
import { setupShortcutsController } from "./shortcuts-controller";

class MockDocument extends EventTarget {}

function keyDownEvent(
  key: string,
  options: { code?: string; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {},
): Event {
  const event = new Event("keydown", { cancelable: true });
  Object.defineProperties(event, {
    key: { value: key, configurable: true },
    code: { value: options.code ?? "", configurable: true },
    shiftKey: { value: options.shiftKey ?? false, configurable: true },
    ctrlKey: { value: options.ctrlKey ?? false, configurable: true },
    metaKey: { value: options.metaKey ?? false, configurable: true },
  });
  return event;
}

describe("setupShortcutsController", () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    globalThis.document = originalDocument;
    vi.restoreAllMocks();
  });

  it("handles help modal and navigation shortcuts", () => {
    const mockDocument = new MockDocument();
    globalThis.document = mockDocument as unknown as Document;

    const closeHelpModal = vi.fn<() => void>();
    const openHelpModal = vi.fn<() => void>();
    const selectAdjacentBy = vi.fn<(delta: number) => void>();
    const moveSelectedBy = vi.fn<(delta: number) => void>();
    const togglePlayPause = vi.fn<() => void>();
    const stopPlayback = vi.fn<() => void>();

    let helpOpen = true;

    setupShortcutsController({
      isTypingContext: () => false,
      isHelpOpen: () => helpOpen,
      openHelpModal,
      closeHelpModal,
      moveSelectedBy,
      selectAdjacentBy,
      togglePlayPause,
      stopPlayback,
    });

    mockDocument.dispatchEvent(keyDownEvent("Escape"));
    expect(closeHelpModal).toHaveBeenCalledTimes(1);

    helpOpen = false;

    mockDocument.dispatchEvent(keyDownEvent("?"));
    mockDocument.dispatchEvent(keyDownEvent("/", { shiftKey: true }));
    expect(openHelpModal).toHaveBeenCalledTimes(2);

    mockDocument.dispatchEvent(keyDownEvent("ArrowUp", { ctrlKey: true }));
    expect(moveSelectedBy).toHaveBeenCalledWith(-1);

    mockDocument.dispatchEvent(keyDownEvent("ArrowDown", { ctrlKey: true }));
    expect(moveSelectedBy).toHaveBeenCalledWith(1);

    mockDocument.dispatchEvent(keyDownEvent("ArrowDown"));
    expect(selectAdjacentBy).toHaveBeenCalledWith(1);

    mockDocument.dispatchEvent(keyDownEvent(" ", { code: "Space" }));
    expect(togglePlayPause).toHaveBeenCalledTimes(1);

    mockDocument.dispatchEvent(keyDownEvent("Escape"));
    expect(stopPlayback).toHaveBeenCalledTimes(1);
  });

  it("ignores shortcuts while typing", () => {
    const mockDocument = new MockDocument();
    globalThis.document = mockDocument as unknown as Document;

    const openHelpModal = vi.fn<() => void>();
    const selectAdjacentBy = vi.fn<(delta: number) => void>();

    setupShortcutsController({
      isTypingContext: () => true,
      isHelpOpen: () => false,
      openHelpModal,
      closeHelpModal: vi.fn(),
      moveSelectedBy: vi.fn(),
      selectAdjacentBy,
      togglePlayPause: vi.fn(),
      stopPlayback: vi.fn(),
    });

    mockDocument.dispatchEvent(keyDownEvent("?"));
    mockDocument.dispatchEvent(keyDownEvent("ArrowDown"));

    expect(openHelpModal).not.toHaveBeenCalled();
    expect(selectAdjacentBy).not.toHaveBeenCalled();
  });
});
