import type { Song } from "@/@types/RoomMusic";

export const isSongAssignedToCategory = (
  song: Song,
  categoryId: string,
  fallbackAssignedIds: ReadonlySet<string>,
) =>
  song.categories?.some((assignment) => assignment.categoryId === categoryId) === true ||
  fallbackAssignedIds.has(song.video_id);