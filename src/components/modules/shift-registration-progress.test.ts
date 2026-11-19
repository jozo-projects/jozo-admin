import { describe, expect, it } from "vitest";
import { registrationSuccessDescription } from "./shift-registration-progress";

describe("registration success progress", () => {
  const progress = { enabled: true, activePeriod: "week" as const, week: "2026-11-16", requiredDays: 3, registeredDays: 2 };
  it("reports remaining days using the fresh backend count", () => {
    expect(registrationSuccessDescription(progress, "2026-11-17")).toContain("2/3 ngày. Còn 1 ngày");
  });
  it("reports completion including a zero requirement", () => {
    expect(registrationSuccessDescription({ ...progress, registeredDays: 3 }, "2026-11-17")).toContain("Đã đủ");
    expect(registrationSuccessDescription({ ...progress, requiredDays: 0, registeredDays: 0 }, "2026-11-17")).toContain("Đã đủ");
  });
  it("labels outside-period registration without implying it counts", () => {
    expect(registrationSuccessDescription(progress, "2026-11-23")).toContain("ngoài tuần tới");
  });
  it("keeps success generic when progress is unavailable or disabled", () => {
    expect(registrationSuccessDescription(undefined, "2026-11-17")).toContain("Đăng ký ca thành công");
    expect(registrationSuccessDescription(undefined, "2026-11-17")).not.toContain("0/0");
    expect(registrationSuccessDescription({ ...progress, enabled: false }, "2026-11-17")).not.toContain("2/3");
  });
  it("handles month boundaries", () => {
    const month = { ...progress, activePeriod: "month" as const, month: "2026-12-01" };
    expect(registrationSuccessDescription(month, "2026-12-31")).toContain("2/3");
    expect(registrationSuccessDescription(month, "2027-01-01")).toContain("ngoài tháng tới");
  });
});
