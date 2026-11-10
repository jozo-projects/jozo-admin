// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
import OnlineGameBookingConfig from "./OnlineGameBookingConfig";
const mocks = vi.hoisted(() => ({ admin: true, get: vi.fn(), put: vi.fn() }));
vi.mock("@/hooks/usePermission", () => ({ useIsAdmin: () => mocks.admin }));
vi.mock("@/utils/http", () => ({ default: { get: mocks.get, put: mocks.put } }));
describe("game machine capacity setting", () => {
  it("hides from staff and saves a capacity then rereads for admin", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    let capacity = 2;
    mocks.get.mockImplementation(async () => ({ data: { capacity } }));
    mocks.put.mockImplementation(async (_url, body) => { capacity = body.capacity; });
    const node = document.createElement("div"); document.body.appendChild(node);
    const root = createRoot(node); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const render = () => React.createElement(QueryClientProvider, { client }, React.createElement(OnlineGameBookingConfig));
    mocks.admin = false;
    await act(async () => { root.render(render()); });
    expect(node.textContent).toBe(""); expect(mocks.get).not.toHaveBeenCalled();
    mocks.admin = true;
    await act(async () => { root.render(render()); await new Promise(r => setTimeout(r, 30)); });
    await act(async () => { await new Promise(r => setTimeout(r, 30)); });
    const input = node.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe("2");
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "3"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    const button = Array.from(node.querySelectorAll('button')).find(b => b.textContent === 'Lưu')!;
    await act(async () => { button.click(); await new Promise(r => setTimeout(r, 30)); });
    expect(mocks.put).toHaveBeenCalledWith("/bookings/game-config", { capacity: 3 });
    expect(mocks.get.mock.calls.length).toBeGreaterThan(1);
    await act(async () => { root.unmount(); }); client.clear(); node.remove();
  });
});
