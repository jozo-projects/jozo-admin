// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberUsageHistory } from "./MemberUsageHistory";
import BillMemberSummary from "@/components/bill/BillMemberSummary";
import membershipApis from "@/apis/membership.apis";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/utils/http", () => ({ default: { get } }));

let host: HTMLDivElement;
let root: Root;
let client: QueryClient;
const fixture = (page = 1, totalCount = 11) => ({
  data: { result: { page, limit: 10, totalCount, totalAmount: 1100000,
    items: totalCount ? [{ billId: `bill-${page}`, invoiceCode: `TEST-${page}`, roomName: "Phòng fixture", totalAmount: 100000, createdAt: "2026-01-01T00:00:00Z" }] : [] } },
});
async function mount(node: React.ReactNode) {
  await act(async () => { root.render(React.createElement(QueryClientProvider, { client }, node)); });
  await flush();
}
async function flush() { await act(async () => { await new Promise(r => setTimeout(r, 30)); }); }
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
  await flush();
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  get.mockReset(); get.mockImplementation((_url, config) => Promise.resolve(fixture(config?.params?.page ?? 1)));
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); });

describe("membership feature — mounted admin + real API adapter, mocked HTTP transport", () => {
  it("uses the expected endpoint, encoded member ID and paging contract", async () => {
    await membershipApis.getMemberUsageHistory("member/id", 2, 10);
    expect(get).toHaveBeenCalledWith("/membership/members/member%2Fid/history", { params: { page: 2, limit: 10 } });
  });
  it("renders history and moves next/back through API pages", async () => {
    await mount(React.createElement(MemberUsageHistory, { memberId: "member-a" }));
    expect(host.textContent).toContain("TEST-1");
    expect(host.textContent).toContain("11 phiên");
    expect(host.textContent).toContain("Phòng fixture");
    await click("Sau");
    expect(host.textContent).toContain("TEST-2");
    expect(get).toHaveBeenLastCalledWith("/membership/members/member-a/history", { params: { page: 2, limit: 10 } });
    expect([...host.querySelectorAll("button")].find(b => b.textContent === "Sau")?.disabled).toBe(true);
    await click("Trước");
    expect(host.textContent).toContain("TEST-1");
  });
  it("shows an HTTP error and retries to an empty history", async () => {
    get.mockRejectedValueOnce(new Error("Fixture HTTP failure"));
    await mount(React.createElement(MemberUsageHistory, { memberId: "member-a" }));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Không thể tải lịch sử");
    get.mockResolvedValue(fixture(1, 0));
    await click("Thử lại");
    expect(host.textContent).toContain("Chưa có phiên đã thanh toán");
  });
  it("opens history from a no-benefit member's actual bill summary", async () => {
    await mount(React.createElement(BillMemberSummary, { membership: { found: true, userId: "member-a", name: "Fixture member" } }));
    expect(host.textContent).toContain("Fixture member");
    expect(get).not.toHaveBeenCalled();
    await click("Lịch sử sử dụng");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("TEST-1");
    expect(get).toHaveBeenCalledWith("/membership/members/member-a/history", { params: { page: 1, limit: 10 } });
  });
});
