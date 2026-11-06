import { describe, expect, it } from "vitest";
import { getSkyState } from "./DaySky";

const at = (hour: number, minute = 0) => new Date(2026, 0, 1, hour, minute);

describe("getSkyState", () => {
  it("moves the sun from left to right through the day", () => {
    expect(getSkyState(at(6))).toMatchObject({ isDay: true, progress: 0 });
    expect(getSkyState(at(9))).toMatchObject({ isDay: true, progress: 0.25 });
    expect(getSkyState(at(12))).toMatchObject({ isDay: true, progress: 0.5 });
    expect(getSkyState(at(17, 30))).toMatchObject({ isDay: true, progress: 11.5 / 12 });
  });

  it("moves the moon across midnight until sunrise", () => {
    expect(getSkyState(at(18))).toMatchObject({ isDay: false, progress: 0 });
    expect(getSkyState(at(0))).toMatchObject({ isDay: false, progress: 0.5 });
    expect(getSkyState(at(5, 30))).toMatchObject({ isDay: false, progress: 11.5 / 12 });
  });
});
