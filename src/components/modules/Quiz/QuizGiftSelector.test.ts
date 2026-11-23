// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { QuizGiftSelector, type QuizGiftSelection } from "./QuizGiftSelector";

it("selects a catalog variant with quantity and displays the gift price", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  let current: QuizGiftSelection[] = [];
  function Wrapper() {
    const [value, setValue] = useState<QuizGiftSelection[]>([]);
    current = value;
    return createElement(QuizGiftSelector, { options: [{ menuItemId: "variant-1", label: "Trà — Lớn" }], value, onChange: setValue });
  }
  try {
    await act(async () => root.render(createElement(Wrapper)));
    const select = host.querySelector("select")!;
    await act(async () => { select.value = "variant-1"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => host.querySelector("button")!.click());
    expect(current).toEqual([{ menuItemId: "variant-1", quantity: 1 }]);
    expect(host.textContent).toContain("Trà — Lớn");
    expect(host.textContent).toContain("0đ");
    const input = host.querySelector('input[aria-label="Số lượng quà 1"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "2"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(current[0].quantity).toBe(2);
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
