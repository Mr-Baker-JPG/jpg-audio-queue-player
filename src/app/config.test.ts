import { describe, expect, it } from "vitest";
import { DB_NAME, DB_VERSION, MOBILE_BREAKPOINT_QUERY, STATE_KEY, STORE_NAME } from "./config";

describe("app config", () => {
  it("exposes persistence constants", () => {
    expect(DB_NAME).toBe("audio-queue-player");
    expect(DB_VERSION).toBe(2);
    expect(STORE_NAME).toBe("app-state");
    expect(STATE_KEY).toBe("queue");
  });

  it("exposes the mobile breakpoint query", () => {
    expect(MOBILE_BREAKPOINT_QUERY).toBe("(max-width: 700px)");
  });
});
