import { describe, expect, it, vi } from "vitest";
import billApis from "@/apis/bill.apis";
import http from "@/utils/http";
import {
  birthdayPolicySchema,
  birthdaySelectionPayload,
  isBirthdaySelectionValid,
  type MemberBirthday,
} from "./memberBirthday";
vi.mock("@/utils/http", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const selection = { items: [{ itemId: "a", quantity: 2 }] };
const offer: MemberBirthday = {
  eligible: true,
  year: 2026,
  policy: {
    enabled: true,
    discountPercentage: 10,
    itemCount: 2,
    itemIds: ["a", "b"],
  },
  items: [
    { itemId: "a", name: "Trà", availableQuantity: 3 },
    { itemId: "b", name: "Cà phê", availableQuantity: null },
  ],
};
describe("birthday checkout contract", () => {
  it("omits unchecked selection entirely and retains checked quantities", () => {
    expect(birthdaySelectionPayload(false, selection)).toEqual({});
    expect(birthdaySelectionPayload(true, selection)).toEqual({
      birthdaySelection: selection,
    });
  });
  it("requires exact count using eligible endpoint SKUs and inventory", () => {
    expect(isBirthdaySelectionValid(offer, selection)).toBe(true);
    for (const items of [
      [],
      [{ itemId: "a", quantity: 1 }],
      [{ itemId: "a", quantity: 4 }],
      [{ itemId: "x", quantity: 2 }],
      [
        { itemId: "a", quantity: 1 },
        { itemId: "a", quantity: 1 },
      ],
      [
        { itemId: "a", quantity: 1.5 },
        { itemId: "b", quantity: 0.5 },
      ],
    ]) {
      expect(isBirthdaySelectionValid(offer, { items })).toBe(false);
    }
    expect(
      isBirthdaySelectionValid(
        { ...offer, eligible: false, reason: "already_used" },
        selection,
      ),
    ).toBe(false);
    expect(isBirthdaySelectionValid(undefined, selection)).toBe(false);
    expect(
      isBirthdaySelectionValid(
        { ...offer, items: [{ ...offer.items[0], availableQuantity: 1 }] },
        selection,
      ),
    ).toBe(false);
  });
  it("validates enabled policy, boundaries and unique drink identifiers", () => {
    expect(birthdayPolicySchema.safeParse(offer.policy).success).toBe(true);
    for (const patch of [
      { discountPercentage: 101 },
      { itemCount: 0 },
      { itemCount: 1.5 },
      { itemCount: 101 },
      { itemIds: [] },
      { itemIds: ["a", "a"] },
    ]) {
      expect(
        birthdayPolicySchema.safeParse({ ...offer.policy, ...patch }).success,
      ).toBe(false);
    }
    expect(
      birthdayPolicySchema.safeParse({
        ...offer.policy,
        enabled: false,
        itemIds: [],
      }).success,
    ).toBe(true);
  });
  it("serializes selection in the existing preview URL without changing phone or time parameters", async () => {
    await billApis.getBillByScheduleId(
      "schedule",
      undefined,
      undefined,
      undefined,
      undefined,
      "0901234567",
      selection,
    );
    const url = new URL(
      vi.mocked(http.get).mock.calls.at(-1)![0],
      "http://fixture.local",
    );
    expect(url.pathname).toBe("/bill/schedule");
    expect(url.searchParams.get("phone")).toBe("0901234567");
    expect(JSON.parse(url.searchParams.get("birthdaySelection")!)).toEqual(
      selection,
    );
    await billApis.getBillByScheduleId("schedule");
    expect(vi.mocked(http.get).mock.calls.at(-1)![0]).not.toContain(
      "birthdaySelection",
    );
  });
});
