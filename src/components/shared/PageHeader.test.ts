// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PageHeader } from "./PageHeader";
import { PageHeaderTargetContext } from "@/components/Layout/page-header-context";

const { navigate, back } = vi.hoisted(() => ({ navigate: vi.fn(), back: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate, history: { back } }),
}));

it("moves title and back button to layout while keeping actions in the page", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.createElement("div");
  const header = document.createElement("header");
  document.body.append(header, host);
  const root = createRoot(host);
  await act(async () => {
    root.render(createElement(PageHeaderTargetContext.Provider, { value: header },
      createElement(PageHeader, { title: "Sửa phòng", description: "Thông tin phòng", showBackButton: true, backUrl: "/rooms", actions: createElement("button", null, "Thêm") }),
    ));
  });
  expect(header.querySelector("h1")?.textContent).toBe("Sửa phòng");
  expect(host.querySelector("h1")).toBeNull();
  expect(host.textContent).toContain("Thông tin phòng");
  expect(host.textContent).toContain("Thêm");
  await act(async () => header.querySelector<HTMLButtonElement>('[aria-label="Quay lại"]')?.click());
  expect(navigate).toHaveBeenCalledWith({ to: "/rooms" });
  await act(async () => {
    root.render(createElement(PageHeaderTargetContext.Provider, { value: header },
      createElement(PageHeader, { title: "Danh sách phòng" }),
    ));
  });
  expect(header.querySelectorAll("h1")).toHaveLength(1);
  expect(header.querySelector("h1")?.textContent).toBe("Danh sách phòng");
  await act(async () => root.unmount());
  expect(header.textContent).toBe("");
  host.remove();
  header.remove();
});

it("keeps title in page when no layout target exists", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(PageHeader, { title: "Trang riêng" })));
  expect(host.querySelector("h1")?.textContent).toBe("Trang riêng");
  await act(async () => root.unmount());
  host.remove();
});
