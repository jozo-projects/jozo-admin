import { groupMenuItemsByParent, type FnBMenuItem } from "@/hooks/use-menu-items";
import type { QuizGiftOption } from "./QuizGiftSelector";

/** Only concrete, active catalog records with stable IDs can be selected. */
export function quizGiftOptionsFromMenu(items: FnBMenuItem[]): QuizGiftOption[] {
  const options: QuizGiftOption[] = [];
  const seen = new Set<string>();
  const add = (item: FnBMenuItem, label: string) => {
    if (!item._id || item._id.startsWith("temp-id-") || item.isActive === false || item.isAvailable === false || seen.has(item._id)) return;
    seen.add(item._id);
    options.push({ menuItemId: item._id, label });
  };
  for (const parent of groupMenuItemsByParent(items)) {
    if (parent.isActive === false || parent.isAvailable === false) continue;
    if (parent.hasVariant) {
      for (const variant of parent.variants ?? []) add(variant, `${parent.name} — ${variant.name}`);
    } else add(parent, parent.name);
  }
  return options;
}
