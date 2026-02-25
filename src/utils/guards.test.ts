import { describe, expect, it } from "vitest";
import { isPersistableAudioFile } from "./guards";

describe("guards", () => {
  it("accepts valid audio files", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.mp3", { type: "audio/mpeg" });
    expect(isPersistableAudioFile(file)).toBe(true);
  });

  it("rejects empty files", () => {
    const file = new File([new Uint8Array([])], "a.mp3", { type: "audio/mpeg" });
    expect(isPersistableAudioFile(file)).toBe(false);
  });

  it("rejects non-audio files", () => {
    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(isPersistableAudioFile(file)).toBe(false);
  });

  it("rejects non-File values", () => {
    const fakeFile = { size: 10, type: "audio/mpeg" } as unknown as File;
    expect(isPersistableAudioFile(fakeFile)).toBe(false);
  });
});
