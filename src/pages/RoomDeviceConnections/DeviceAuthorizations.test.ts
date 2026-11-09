// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DeviceAuthorizations from "./DeviceAuthorizations";

const mocks = vi.hoisted(() => ({ list: vi.fn(), approve: vi.fn(), revoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/apis/roomDeviceAuthorization.apis", () => ({ default: mocks }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: React.PropsWithChildren<{ open: boolean }>) => open ? React.createElement("div", null, children) : null,
  DialogContent: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children),
  DialogDescription: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children),
  DialogFooter: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children),
  DialogHeader: ({ children }: React.PropsWithChildren) => React.createElement("div", null, children),
  DialogTitle: ({ children }: React.PropsWithChildren) => React.createElement("h2", null, children),
}));
const pending = { id: "request-id", roomId: 1, roomName: "Phòng Một", clientType: "video" as const, createdAt: "2026-01-01T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" };
const active = { id: "active-id", roomId: 1, roomName: "Phòng Một", clientType: "video" as const };
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
async function flush() { await act(async () => { await new Promise((r) => setTimeout(r, 30)); }); }
async function click(text: string) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  expect(button, `button ${text}`).toBeTruthy();
  await act(async () => { button!.click(); });
}
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
afterEach(() => { act(() => root.unmount()); client.clear(); container.remove(); });
async function render(snapshot: object) {
  mocks.list.mockResolvedValue({ data: snapshot });
  await act(async () => { root.render(React.createElement(QueryClientProvider, { client }, React.createElement(DeviceAuthorizations))); });
  await flush();
}
describe("device authorization management", () => {
  it("uses server expiry and disables expired or invalid requests", async () => {

    await render({ pending: [{ ...pending, expiresAt: "2020-01-01T00:00:00Z" }], active: [], truncated: false });
    expect(container.textContent).toContain("Đã hết hạn");
    expect([...container.querySelectorAll("button")].find((b) => b.textContent === "Duyệt")?.disabled).toBe(true);
  });
  it("approves an empty slot with a null expected id", async () => {
    mocks.approve.mockResolvedValue({ data: { approved: true } });
    await render({ pending: [pending], active: [], truncated: false });
    await click("Duyệt"); await flush();
    expect(mocks.approve).toHaveBeenCalledWith({ id: pending.id, roomId: 1, clientType: "video", expectedActiveId: null });
    expect(mocks.list.mock.calls.length).toBeGreaterThan(1);
  });
  it("requires explicit replacement confirmation and sends current active id", async () => {
    mocks.approve.mockResolvedValue({ data: { approved: true } });
    await render({ pending: [pending], active: [active], truncated: false });
    await click("Thay thế quyền");
    expect(mocks.approve).not.toHaveBeenCalled();
    expect(container.textContent).toContain("active-id");
    await click("Xác nhận"); await flush();
    expect(mocks.approve).toHaveBeenCalledWith({ id: pending.id, roomId: 1, clientType: "video", expectedActiveId: active.id });
  });
  it("confirms revoke for an offline-independent active slot", async () => {
    mocks.revoke.mockResolvedValue({ data: { revoked: true } });
    await render({ pending: [], active: [active], truncated: false });
    await click("Thu hồi"); expect(mocks.revoke).not.toHaveBeenCalled();
    await click("Xác nhận"); await flush();
    expect(mocks.revoke).toHaveBeenCalledWith({ roomId: 1, clientType: "video", expectedActiveId: active.id });
  });
  it("notifies and refreshes on conflict and warns about truncated results", async () => {
    mocks.approve.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    await render({ pending: [pending], active: [], truncated: true });
    expect(container.textContent).toContain("danh sách bị giới hạn".toLowerCase().replace(/^d/, "D"));
    await click("Duyệt"); await flush();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("hết hạn") }));
    expect(mocks.list.mock.calls.length).toBeGreaterThan(1);
  });
  it("prevents duplicate submissions while approval is in flight", async () => {
    let resolve!: (value: unknown) => void;
    mocks.approve.mockReturnValue(new Promise((r) => { resolve = r; }));
    await render({ pending: [pending], active: [], truncated: false });
    const button = [...container.querySelectorAll("button")].find((b) => b.textContent === "Duyệt")!;
    await act(async () => { button.click(); button.click(); });
    expect(mocks.approve).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ data: { approved: true } }); });
    await flush();
  });
  it("shows load failure rather than an empty list", async () => {
    mocks.list.mockRejectedValue(new Error("offline"));
    await act(async () => { root.render(React.createElement(QueryClientProvider, { client }, React.createElement(DeviceAuthorizations))); });
    await flush();
    expect(container.textContent).toContain("Không tải được danh sách quyền");
    expect(container.textContent).not.toContain("Không có yêu cầu chờ");
  });
});
