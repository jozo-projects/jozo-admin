import { expect, it } from "vitest";
import type { FnBMenuItem } from "@/hooks/use-menu-items";
import { quizGiftOptionsFromMenu } from "./quiz-gift-catalog";

it("maps concrete catalog records and variants without duplicate or inactive options", () => {
  const item = (props: Partial<FnBMenuItem>) => ({ name: "Món", parentId: null, hasVariant: false, price: 1, ...props } as FnBMenuItem);
  const variant = item({ _id: "v", name: "Lớn", parentId: "p" });
  expect(quizGiftOptionsFromMenu([
    item({ _id: "p", name: "Trà", hasVariant: true, variants: [variant] }),
    variant, item({ _id: "a", name: "Bánh" }), item({ _id: "b", isActive: false }),
    item({ _id: "temp-id-1" }), item({ name: "Thiếu ID" }),
  ])).toEqual([{ menuItemId: "v", label: "Trà — Lớn" }, { menuItemId: "a", label: "Bánh" }]);
});
