// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import RevenueStatisticsPage from "./RevenueStatisticsPage";
import billApis from "@/apis/bill.apis";
const { get, role } = vi.hoisted(() => ({
  get: vi.fn(),
  role: { staff: false },
}));
vi.mock("@tanstack/react-router", () => ({ useRouter: () => ({}) }));
vi.mock("@/utils/http", () => ({ default: { get } }));
vi.mock("@/hooks/usePermission", () => ({
  useIsStaff: () => role.staff,
  useIsAdmin: () => !role.staff,
}));
let host: HTMLDivElement, root: Root, client: QueryClient;
const calls = () =>
  get.mock.calls.filter(([url]) => url.startsWith("/bill/revenue?"));
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
}
async function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
  );
  expect(button, text).toBeTruthy();
  await act(async () => {
    button!.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 }),
    );
    button!.click();
  });
  await flush();
}
async function input(label: string, value: string) {
  const el = document.querySelector(
    `input[aria-label="${label}"]`,
  ) as HTMLInputElement;
  expect(el, label).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function mount() {
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(RevenueStatisticsPage),
      ),
    ),
  );
  await flush();
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T02:00:00+07:00"));
  role.staff = false;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  get.mockReset();
  get.mockImplementation((url: string) => {
    if (!url.startsWith("/bill/revenue?"))
      return Promise.resolve({ data: { result: [] } });
    const params = new URL(url, "https://fixture.invalid").searchParams;
    return Promise.resolve({
      data: {
        result: {
          startDate: params.get("startDate"),
          endDate: params.get("endDate"),
          totalRevenue: 2000,
          serviceRoomRevenue: 500,
          fnbRevenue: 1500,
          byCategory: {
            SERVICE_ROOM: 500,
            FNB_RETAIL: 1000,
            FNB_PREPARED: 500,
            OTHER: 0,
          },
          billCount: 1,
          bills: [
            {
              _id: "inside",
              invoiceCode: "INSIDE",
              startTime: params.get("startDate"),
              createdAt: params.get("startDate"),
              totalAmount: 2000,
              paymentMethod: "cash",
            },
          ],
        },
      },
    });
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.useRealTimers();
});
it("keeps the toolbar compact without redundant shortcuts or instructions", async () => {
  await mount();
  for (const text of ["Hôm nay", "Hôm qua", "Hiện tại", "Làm mới", "Tính từ mốc", "Kỳ đang xem"]) {
    expect(host.textContent).not.toContain(text);
  }
  const toolbar = host.querySelector('[aria-label="Chọn kỳ doanh thu"]')!;
  expect(toolbar.querySelectorAll("button")).toHaveLength(8);
});
it("requests exact daily bounds and preserves authoritative backend category totals", async () => {
  await mount();
  expect(host.textContent).toContain("09:00 05/11/2026");
  expect(host.textContent).toContain("03:00 06/11/2026");
  expect(host.textContent).toContain("INSIDE");
  expect(host.textContent).not.toContain("OUTSIDE");
  expect(host.textContent).not.toContain("EXACT-END");
  expect(host.textContent).toContain("1.500");
  expect(host.textContent).toContain("500");
  const params = new URL(calls().at(-1)![0], "https://fixture.invalid")
    .searchParams;
  expect(params.get("startDate")).toBe("2026-11-05T02:00:00.000Z");
  expect(params.get("endDate")).toBe("2026-11-05T20:00:00.000Z");
  expect(params.get("rangeMode")).toBe("exact");
  await click("Kỳ trước");
  expect(host.textContent).toContain("09:00 04/11/2026");
  await click("Kỳ sau");
  expect(host.textContent).toContain("09:00 05/11/2026");
});
it("supports direct month, quarter, previous/next and a single whole-week picker", async () => {
  await mount();
  await click("Tháng");
  await click("Chọn tháng");
  await input("Chọn tháng", "2026-11");
  await flush();
  expect(host.textContent).toContain("09:00 06/11/2026");
  expect(host.textContent).toContain("03:00 06/12/2026");
  await click("Kỳ sau");
  expect(host.textContent).toContain("09:00 06/12/2026");
  await click("Kỳ trước");
  expect(host.textContent).toContain("09:00 06/11/2026");
  await click("Quý");
  expect(host.textContent).toContain("09:00 06/10/2026");
  expect(host.textContent).toContain("03:00 06/01/2027");
  await click("Kỳ sau");
  expect(host.textContent).toContain("09:00 06/01/2027");
  expect(host.textContent).toContain("03:00 06/04/2027");
  await click("Chọn quý");
  await input("Năm của quý", "202");
  expect(
    (document.querySelector('[aria-label="Năm của quý"]') as HTMLInputElement)
      .value,
  ).toBe("202");
  await input("Năm của quý", "2026");
  await flush();
  expect(host.textContent).toContain("09:00 06/01/2026");
  await click("Tuần");
  await click("Chọn tuần");
  expect(
    document.querySelectorAll('[aria-selected="true"]').length,
  ).toBeGreaterThanOrEqual(7);
  expect(document.body.textContent).not.toContain("Đến:");
  await click("12");
  expect(host.textContent).toContain("09:00 12/01/2026");
  expect(host.textContent).toContain("03:00 19/01/2026");
});
it("custom business dates default 09–03, accepts arbitrary exact datetimes only on Apply, rejects reversed range", async () => {
  await mount();
  await click("Tùy chọn");
  expect(
    (host.querySelector('[aria-label="Bắt đầu (giờ VN)"]') as HTMLInputElement)
      .value,
  ).toBe("2026-11-05T09:00");
  expect(
    (host.querySelector('[aria-label="Kết thúc (giờ VN)"]') as HTMLInputElement)
      .value,
  ).toBe("2026-11-06T03:00");
  expect(host.querySelectorAll('input[type="date"]')).toHaveLength(0);
  const count = calls().length;
  await input("Bắt đầu (giờ VN)", "2026-11-05T10:15");
  await input("Kết thúc (giờ VN)", "2026-11-08T04:45");
  expect(calls()).toHaveLength(count);
  await click("Áp dụng");
  expect(host.textContent).toContain("10:15 05/11/2026");
  expect(host.textContent).toContain("04:45 08/11/2026");
  const params = new URL(calls().at(-1)![0], "https://fixture.invalid")
    .searchParams;
  expect(params.get("startDate")).toBe("2026-11-05T03:15:00.000Z");
  expect(params.get("endDate")).toBe("2026-11-07T21:45:00.000Z");
  expect(params.get("rangeMode")).toBe("exact");
  await input("Kết thúc (giờ VN)", "2026-11-04T04:45");
  expect(
    (host.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(host.textContent).toContain("Kết thúc phải sau bắt đầu");
  await input("Kết thúc (giờ VN)", "");
  expect(
    (host.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
  ).toBe(true);
  await input("Kết thúc (giờ VN)", "2026-11-05T10:15");
  expect(
    (host.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
  ).toBe(true);
});
it("staff remains daily-only", async () => {
  role.staff = true;
  await mount();
  expect(host.textContent).not.toContain("Tùy chọn");
  expect(host.textContent).not.toContain("Quý");
  expect(host.textContent).not.toContain("Tổng doanh thu");
});
it("legacy adapter callers omit rangeMode and preserve supplied bounds", async () => {
  await billApis.getBillRevenue("2026-11-05", "2026-11-05");
  const params = new URL(calls().at(-1)![0], "https://fixture.invalid")
    .searchParams;
  expect(params.get("rangeMode")).toBeNull();
  expect(params.get("startDate")).toBe("2026-11-05");
  expect(params.get("endDate")).toBe("2026-11-05");
});
