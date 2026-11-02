import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import roomApis from "@/apis/room.apis";
import type { RoomConnectionWarningState } from "@/utils/roomConnectionWarnings";

export const RoomConnectionWarnings = ({
  state,
}: {
  state: RoomConnectionWarningState;
}) => {
  const { data: roomsResponse } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
    enabled: state.status !== "inactive",
  });
  if (state.status === "inactive") return null;
  const monitoringInterrupted = state.status !== "live";
  if (!monitoringInterrupted && !state.losses.length) return null;

  const names = new Map(
    (roomsResponse?.data.result ?? []).map((room) => [String(room.roomId), room.roomName]),
  );

  return (
    <aside
      aria-label="Cảnh báo kết nối phòng"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 max-h-[40vh] overflow-y-auto rounded-lg border border-destructive bg-background p-4 text-sm shadow-lg sm:left-auto sm:w-96"
    >
      <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Kết nối thiết bị phòng
      </div>
      {monitoringInterrupted && (
        <p className="mb-2 font-medium text-amber-700" role="status">
          {state.status === "syncing"
            ? "Đang đồng bộ trạng thái kết nối phòng…"
            : "Giám sát kết nối phòng bị gián đoạn ở Admin. Chưa thể xác nhận trạng thái hiện tại."}
          {state.losses.length > 0 && " Các cảnh báo bên dưới là trạng thái ghi nhận trước đó."}
        </p>
      )}
      {state.losses.length > 0 && (
        <ul className="space-y-2 text-destructive">
          {state.losses.map(({ roomId, clientType }) => (
            <li key={`${roomId}:${clientType}`}>
              {names.get(roomId) || `Phòng ${roomId}`} mất kết nối {clientType === "control" ? "Control" : "Video"}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
