import { arrayMove } from "@dnd-kit/sortable";

export const reorderById = <T>(
  items: T[],
  activeId: string,
  overId: string,
  getId: (item: T) => string,
) => {
  const oldIndex = items.findIndex((item) => getId(item) === activeId);
  const newIndex = items.findIndex((item) => getId(item) === overId);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
  return arrayMove(items, oldIndex, newIndex);
};

export const canReorderFullList = (
  loadedCount: number,
  total: number,
  technicalLimit: number,
) => loadedCount === total && total <= technicalLimit;