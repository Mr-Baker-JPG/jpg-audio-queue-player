import { describe, expect, it } from "vitest";
import { formatDuration, parseTimeInput } from "./time";

describe("time utils", () => {
  it("formats mm:ss", () => {
    expect(formatDuration(65)).toBe("01:05");
  });

  it("formats hh:mm:ss when needed", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("returns 00:00 for negative or non-finite values", () => {
    expect(formatDuration(-1)).toBe("00:00");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("00:00");
    expect(formatDuration(Number.NaN)).toBe("00:00");
  });

  it("parses seconds", () => {
    expect(parseTimeInput("75")).toBe(75);
  });

  it("parses mm:ss", () => {
    expect(parseTimeInput("01:15")).toBe(75);
  });

  it("parses hh:mm:ss", () => {
    expect(parseTimeInput("01:02:03")).toBe(3723);
  });

  it("returns null for blank input", () => {
    expect(parseTimeInput("   ")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("1:2:3:4")).toBeNull();
    expect(parseTimeInput("1::2")).toBeNull();
  });
});
