import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ScheduleActivityIcon from "./ScheduleActivityIcon";

describe("ScheduleActivityIcon", () => {
  it("renders the game icon for Nintendo Switch", () => {
    const html = renderToStaticMarkup(createElement(ScheduleActivityIcon, { activityType: "nintendo-switch" }));
    expect(html).toContain('aria-label="Nintendo Switch"');
    expect(html).toContain("lucide-gamepad2");
  });

  it("renders the microphone for Music Box", () => {
    const html = renderToStaticMarkup(createElement(ScheduleActivityIcon, { activityType: "music-box" }));
    expect(html).toContain('aria-label="Music Box"');
    expect(html).toContain("lucide-mic-vocal");
  });

  it("does not guess for an unknown or missing activity", () => {
    expect(renderToStaticMarkup(createElement(ScheduleActivityIcon, { activityType: undefined }))).toBe("");
    expect(renderToStaticMarkup(createElement(ScheduleActivityIcon, { activityType: "unknown" as never }))).toBe("");
  });
});
