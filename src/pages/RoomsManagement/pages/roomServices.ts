export type RoomService = "singing" | "gaming";

export function toggleRoomService(current: RoomService[] | undefined, service: RoomService, checked: boolean): RoomService[] {
  const remaining = (current ?? []).filter((item) => item !== service);
  return checked ? [...remaining, service] : remaining;
}
