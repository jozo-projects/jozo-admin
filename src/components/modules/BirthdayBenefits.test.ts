// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  BirthdayBenefits,
  type BirthdayBenefitsProps,
} from "./BirthdayBenefits";
const props: BirthdayBenefitsProps = {
  checked: false,
  selection: { items: [] },
  onCheckedChange: vi.fn(),
  onSelectionChange: vi.fn(),
  onRetry: vi.fn(),
  onOpenBill: vi.fn(),
  offer: {
    eligible: true,
    year: 2026,
    policy: {
      enabled: true,
      discountPercentage: 15,
      itemCount: 3,
      itemIds: ["tea"],
    },
    items: [{ itemId: "tea", name: "Trà đào", availableQuantity: 4 }],
  },
};
const render = (overrides: Partial<BirthdayBenefitsProps> = {}) =>
  renderToStaticMarkup(
    React.createElement(BirthdayBenefits, { ...props, ...overrides }),
  );
describe("BirthdayBenefits mounted gift picker", () => {
  let root: Root;
  let container: HTMLDivElement;
  let current: BirthdayBenefitsProps;
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.clearAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    current = {
      ...props,
      checked: true,
      offer: {
        ...props.offer!,
        items: [
          ...props.offer!.items,
          { itemId: "coffee", name: "Cà phê", availableQuantity: 1 },
        ],
      },
    };
    update();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  function update(overrides: Partial<BirthdayBenefitsProps> = {}) {
    current = { ...current, ...overrides };
    act(() => root.render(React.createElement(BirthdayBenefits, current)));
  }
  function button(text: string): HTMLButtonElement {
    const found = [...document.querySelectorAll("button")].find(
      (node) => node.textContent === text,
    );
    expect(found, `button ${text}`).toBeDefined();
    return found!;
  }
  function click(text: string) {
    act(() => button(text).click());
  }
  function input(label: string): HTMLInputElement {
    const found = document.querySelector<HTMLInputElement>(
      `input[aria-label="${label}"]`,
    );
    expect(found, `input ${label}`).not.toBeNull();
    return found!;
  }
  function change(label: string, value: string) {
    act(() => {
      const node = input(label);
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(node, value);
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("opens a searchable dialog, preserves hidden quantities, and confirms only a valid full draft", () => {
    expect(document.querySelector('input[type="number"]')).toBeNull();
    click("Chọn quà");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(button("Xác nhận").disabled).toBe(true);
    change("Số lượng Trà đào", "2");
    change("Tìm đồ uống", "ca phe");
    expect(
      document.querySelector('input[aria-label="Số lượng Trà đào"]'),
    ).toBeNull();
    expect(input("Số lượng Cà phê").max).toBe("1");
    change("Số lượng Cà phê", "1");
    expect(document.body.textContent).toContain("Đã chọn 3/3 đồ uống");
    expect(button("Xác nhận").disabled).toBe(false);
    change("Tìm đồ uống", "không tồn tại");
    expect(document.body.textContent).toContain(
      "Không tìm thấy đồ uống phù hợp",
    );
    click("Xóa tìm kiếm");
    expect(input("Số lượng Trà đào").value).toBe("2");
    expect(input("Số lượng Cà phê").value).toBe("1");
    expect(current.onSelectionChange).not.toHaveBeenCalled();
    click("Xác nhận");
    expect(current.onSelectionChange).toHaveBeenCalledExactlyOnceWith({
      items: [
        { itemId: "tea", quantity: 2 },
        { itemId: "coffee", quantity: 1 },
      ],
    });
    expect(current.onCheckedChange).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    update({ selection: { items: [{ itemId: "tea", quantity: 3 }] } });
    expect(container.textContent).toContain("Trà đào × 3");
    expect(button("Đổi quà")).toBeDefined();
  });
  it.each(["Hủy", "Close", "Escape"])(
    "discards edits when dismissed via %s",
    (method) => {
      update({ selection: { items: [{ itemId: "tea", quantity: 3 }] } });
      click("Đổi quà");
      change("Số lượng Trà đào", "1");
      if (method === "Escape") {
        act(() =>
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
          ),
        );
      } else click(method);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(current.onSelectionChange).not.toHaveBeenCalled();
      click("Đổi quà");
      expect(input("Số lượng Trà đào").value).toBe("3");
      expect(input("Tìm đồ uống").value).toBe("");
    },
  );
  it("rejects excess, fractional and out-of-stock quantities", () => {
    click("Chọn quà");
    for (const quantity of ["4", "1.5", "0.3", "-3"]) {
      change("Số lượng Trà đào", quantity);
      expect(button("Xác nhận").disabled).toBe(true);
    }
    change("Số lượng Trà đào", "1");
    change("Số lượng Cà phê", "2");
    expect(button("Xác nhận").disabled).toBe(true);
    expect(current.onSelectionChange).not.toHaveBeenCalled();
  });
  it.each([
    { busy: true },
    { error: true },
    { offer: { ...props.offer!, eligible: false } },
  ])(
    "disables picker and confirmation if eligibility becomes unavailable: %j",
    (overrides) => {
      click("Chọn quà");
      change("Số lượng Trà đào", "3");
      update(overrides);
      expect(input("Số lượng Trà đào").disabled).toBe(true);
      expect(button("Xác nhận").disabled).toBe(true);
      click("Xác nhận");
      expect(current.onSelectionChange).not.toHaveBeenCalled();
      click("Hủy");
      expect(button("Chọn quà").disabled).toBe(true);
      const checkbox = container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )!;
      expect(checkbox.disabled).toBe(!!overrides.busy);
      act(() => checkbox.click());
      if (!overrides.busy)
        expect(current.onCheckedChange).toHaveBeenCalledWith(false);
    },
  );
  it("discards the draft on an outside pointer dismissal", async () => {
    click("Chọn quà");
    change("Số lượng Trà đào", "3");
    // Radix registers its outside-pointer listener after the opening event.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const overlay = document.querySelector(
      '[data-state="open"].fixed.inset-0',
    )!;
    expect(overlay).not.toBeNull();
    act(() => {
      overlay.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
      );
      overlay.dispatchEvent(
        new MouseEvent("click", { bubbles: true, button: 0 }),
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(current.onSelectionChange).not.toHaveBeenCalled();
    click("Chọn quà");
    expect(input("Số lượng Trà đào").value).toBe("0");
  });
  it("shows a clear empty catalog rather than quantity controls", () => {
    update({ offer: { ...props.offer!, items: [] } });
    click("Chọn quà");
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain(
      "Chưa có đồ uống khả dụng",
    );
    expect(document.querySelector('input[type="number"]')).toBeNull();
    expect(button("Xác nhận").disabled).toBe(true);
  });
  it("preserves retry and used-bill callbacks", () => {
    update({ error: true });
    click("Thử lại");
    expect(current.onRetry).toHaveBeenCalledOnce();
    update({
      error: false,
      offer: {
        ...props.offer!,
        eligible: false,
        usedBill: {
          billId: "bill-1",
          invoiceCode: "INV-1",
          appliedAt: "2026-10-10T01:00:00.000Z",
        },
      },
    });
    click("INV-1");
    expect(current.onOpenBill).toHaveBeenCalledWith("bill-1");
  });
  it("does not restore a draft after the controlled benefit is unchecked", () => {
    click("Chọn quà");
    change("Số lượng Trà đào", "3");
    update({ checked: false });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    update({ checked: true });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(current.onSelectionChange).not.toHaveBeenCalled();
  });
});

describe("BirthdayBenefits checkout controls", () => {
  it("is explicit opt-in and shows configured benefits rather than fixed examples", () => {
    const html = render();
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('checked=""');
    expect(html).toContain("15%");
    expect(html).toContain("3 đồ uống");
  });
  it("keeps the gift catalog out of the collapsed summary", () => {
    const html = render({ checked: true });
    expect(html).not.toContain('type="number"');
    expect(html).toContain("Chọn quà");
    expect(html).toContain("Chọn đủ 3 đồ uống");
  });
  it("disables used benefit with immutable use date and open-bill action even when policy is off", () => {
    const html = render({
      offer: {
        eligible: false,
        year: 2026,
        reason: "disabled",
        items: [],
        usedBill: {
          billId: "b",
          invoiceCode: "INV-1",
          appliedAt: "2026-10-10T01:00:00.000Z",
        },
      },
    });
    expect(html).toContain('disabled=""');
    expect(html).toContain("Đã sử dụng");
    expect(html).toContain("INV-1");
    expect(html).toContain("10/10/2026");
  });
  it("offers retry instead of treating a failed eligibility lookup as no benefit", () => {
    expect(render({ error: true })).toContain("Thử lại");
  });
});
