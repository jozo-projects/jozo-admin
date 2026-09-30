import { describe, expect, it } from "vitest";
import { canReorderFullList, reorderById } from "./reorder";

const items = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
  { id: "d", label: "D" },
];

describe("reorderById", () => {
  it("moves an item forward without changing the full ID set", () => {
    const result = reorderById(items, "a", "c", (item) => item.id);

    expect(result.map((item) => item.id)).toEqual(["b", "c", "a", "d"]);
    expect(new Set(result.map((item) => item.id))).toEqual(
      new Set(items.map((item) => item.id)),
    );
  });

  it("moves an item backward", () => {
    const result = reorderById(items, "d", "b", (item) => item.id);

    expect(result.map((item) => item.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns the unchanged list when either ID is missing", () => {
    expect(reorderById(items, "missing", "b", (item) => item.id)).toBe(items);
    expect(reorderById(items, "a", "missing", (item) => item.id)).toBe(items);
  });
});

describe("canReorderFullList", () => {
  it("only permits reorder when the exact full backend list is loaded", () => {
    expect(canReorderFullList(4, 4, 500)).toBe(true);
    expect(canReorderFullList(4, 5, 500)).toBe(false);
    expect(canReorderFullList(500, 501, 500)).toBe(false);
  });
});
