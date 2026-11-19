import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ProcessBookedModal.tsx", import.meta.url), "utf8");

describe("dịch vụ trong modal xử lý booking", () => {
  it("hiển thị lựa chọn dịch vụ và gửi cập nhật lịch", () => {
    expect(source).toContain('aria-label="Dịch vụ"');
    expect(source).toContain('roomsScheduleApis.updateSchedule(schedule._id, { activityType })');
    expect(source).toContain('value="music-box-and-nintendo-switch"');
    expect(source).toContain('value="nintendo-switch"');
    expect(source).toContain('value="music-box"');
  });
});
