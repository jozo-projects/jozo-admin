import type { Song } from "@/@types/RoomMusic";
import { describe, expect, it } from "vitest";
import { isSongAssignedToCategory } from "./songAssignment";

const song = (categories?: Song["categories"]): Song => ({
  video_id: "song-1",
  title: "Song",
  author: "Author",
  categories,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

describe("isSongAssignedToCategory", () => {
  it("uses Songs Collection assignment metadata", () => {
    expect(
      isSongAssignedToCategory(
        song([{ categoryId: "category-1", position: 501 }]),
        "category-1",
        new Set(),
      ),
    ).toBe(true);
  });

  it("does not treat assignment to another category as assigned", () => {
    expect(
      isSongAssignedToCategory(
        song([{ categoryId: "category-2", position: 0 }]),
        "category-1",
        new Set(),
      ),
    ).toBe(false);
  });

  it("falls back to IDs loaded from the category endpoint", () => {
    expect(
      isSongAssignedToCategory(song(), "category-1", new Set(["song-1"])),
    ).toBe(true);
  });
});