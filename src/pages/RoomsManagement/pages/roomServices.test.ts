import { describe, expect, it } from "vitest";
import { toggleRoomService } from "./roomServices";

describe("room service selection", () => {
  it("can select singing and gaming independently", () => {
    expect(toggleRoomService(undefined, "singing", true)).toEqual(["singing"]);
    expect(toggleRoomService(["singing"], "gaming", true)).toEqual(["singing", "gaming"]);
    expect(toggleRoomService(["singing", "gaming"], "singing", false)).toEqual(["gaming"]);
  });
});
