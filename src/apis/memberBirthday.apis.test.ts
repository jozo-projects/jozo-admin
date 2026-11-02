import { beforeEach, describe, expect, it, vi } from "vitest";
import billApis from "./bill.apis";
import membershipApis from "./membership.apis";
import http from "@/utils/http";
import scheduleApis from "./roomSchedule.api";
vi.mock("@/utils/http", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
const selection = {
  items: [
    { itemId: "tea", quantity: 2 },
    { itemId: "coffee", quantity: 1 },
  ],
};
beforeEach(() => vi.resetAllMocks());
describe("birthday integration API boundaries", () => {
  it("persists selection only on the shared schedule draft and reopens by the detail endpoint", async () => {
    const draft = { userId: "member", selection };
    await scheduleApis.createSchedule({ roomId: "room", startTime: "2027-10-15T10:00:00Z", endTime: "2027-10-15T11:00:00Z", status: "booked" as never, birthdayDraft: draft });
    expect(http.post).toHaveBeenLastCalledWith("/room-schedule", expect.objectContaining({ birthdayDraft: draft }));
    await scheduleApis.updateSchedule("schedule", { birthdayDraft: draft });
    expect(http.put).toHaveBeenLastCalledWith("/room-schedule/schedule", { birthdayDraft: draft });
    await scheduleApis.getScheduleById("schedule");
    expect(http.get).toHaveBeenLastCalledWith("/room-schedule/detail/schedule");
    await scheduleApis.updateSchedule("schedule", { birthdayDraft: null });
    expect(http.put).toHaveBeenLastCalledWith("/room-schedule/schedule", { birthdayDraft: null });
  });
  it("looks up future booking eligibility at its service date without changing checkout's server-time lookup", async () => {
    const at = "2027-10-15T10:00:00Z";
    await membershipApis.getMemberBirthday("member", at);
    expect(http.get).toHaveBeenLastCalledWith("/membership/members/member/birthday", { params: { at } });
    await membershipApis.getMemberBirthday("member");
    expect(http.get).toHaveBeenLastCalledWith("/membership/members/member/birthday");
  });
  it("uses staff eligibility and paginated member history routes", async () => {
    await membershipApis.getMemberBirthday("member");
    expect(http.get).toHaveBeenLastCalledWith(
      "/membership/members/member/birthday",
    );
    await membershipApis.getMemberBirthdayHistory("member", 2, 20);
    expect(http.get).toHaveBeenLastCalledWith(
      "/membership/members/member/birthday/history?page=2&limit=20",
    );
  });
  it("retains exact selection quantities on the real existing print POST", async () => {
    const body = {
      paymentMethod: "cash",
      actualEndTime: "2026-10-27T10:00:00Z",
      phone: "0901234567",
      birthdaySelection: selection,
    };
    await billApis.printBill("schedule", body);
    expect(http.post).toHaveBeenCalledWith("/bill/schedule", body);
  });
  it("saves selection with canonical bill without client pricing override", async () => {
    const body = {
      scheduleId: "schedule",
      roomId: "room",
      items: [{ description: "Room", price: 100000, quantity: 1 }],
      totalAmount: 90000,
      startTime: "2026-10-27T09:00:00Z",
      endTime: "2026-10-27T10:00:00Z",
      paymentMethod: "cash",
      birthdaySelection: selection,
    };
    await billApis.saveBill(body);
    expect(http.post).toHaveBeenCalledWith("/bill/save", body);
    expect(body.birthdaySelection).not.toHaveProperty("discountPercentage");
  });
  it("does not insert a birthday selection when printing unchecked", async () => {
    await billApis.printBill("schedule", {
      paymentMethod: "cash",
      actualEndTime: "2026-10-27T10:00:00Z",
    });
    expect(vi.mocked(http.post).mock.calls[0][1]).not.toHaveProperty(
      "birthdaySelection",
    );
  });
  it("uses gift-applied source filter alongside existing kind, search and date filters", async () => {
    await billApis.getGiftAppliedBills({
      page: 2,
      source: "birthday",
      kind: "fnb",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      search: "0901",
    });
    const url = new URL(
      vi.mocked(http.get).mock.calls[0][0],
      "http://fixture.local",
    );
    expect(url.pathname).toBe("/bill/gift-applied");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      source: "birthday",
      kind: "fnb",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      search: "0901",
    });
  });
  it("preserves 409 conflict and never retries save blindly", async () => {
    const conflict = {
      response: { status: 409, data: { message: "Đã sử dụng" } },
    };
    vi.mocked(http.post).mockRejectedValue(conflict);
    await expect(
      billApis.printBill("schedule", {
        paymentMethod: "cash",
        actualEndTime: "2026-10-27T10:00:00Z",
        birthdaySelection: selection,
      }),
    ).rejects.toBe(conflict);
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});
