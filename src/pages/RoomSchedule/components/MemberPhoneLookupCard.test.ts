import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MemberPhoneLookupCard from "./MemberPhoneLookupCard";

describe("MemberPhoneLookupCard with staff-accessible reward progress", () => {
  const memberInfo = { phone_number: "0912345678", streakCount: 2 };

  it("shows an unclaimed reached reward without membership config", () => {
    const html = renderToStaticMarkup(createElement(MemberPhoneLookupCard, { phone: "0912345678", memberInfo, streakRewards: [{ streakCount: 2, itemCount: 1, claimed: false }] }));
    expect(html).toContain("Quà chưa nhận");
    expect(html).toContain("Streak 2");
  });

  it("shows the next reward when earlier rewards are claimed", () => {
    const html = renderToStaticMarkup(createElement(MemberPhoneLookupCard, { phone: "0912345678", memberInfo, streakRewards: [{ streakCount: 2, itemCount: 1, claimed: true }, { streakCount: 4, itemCount: 2, claimed: false }] }));
    expect(html).toContain("Còn streak 4");
    expect(html).not.toContain("Quà chưa nhận");
  });
});
