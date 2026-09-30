import roomApis from "@/apis/room.apis";
import { useQuery } from "@tanstack/react-query";

export const ROOM_DEVICE_CONNECTIONS_QUERY_KEY = [
  "rooms",
  "device-connections",
] as const;

const REFETCH_INTERVAL_MS = 10_000;

export const useRoomDeviceConnections = () => {
  return useQuery({
    queryKey: ROOM_DEVICE_CONNECTIONS_QUERY_KEY,
    queryFn: async () => {
      const res = await roomApis.getDeviceConnections();
      return (
        res.data.result ?? {
          rooms: [],
          totalDevices: 0,
        }
      );
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
};
