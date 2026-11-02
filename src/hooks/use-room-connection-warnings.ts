import { useCallback, useState } from "react";
import type { Socket } from "socket.io-client";
import type { RoomDeviceConnectionsSnapshot } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import {
  RoomConnectionWarningTracker,
  type RoomConnectionWarningState,
} from "@/utils/roomConnectionWarnings";

const INITIAL_STATE: RoomConnectionWarningState = { status: "inactive", losses: [] };

/** Installed only on the global provider's existing socket; owns no connection. */
export const useRoomConnectionWarnings = () => {
  const [state, setState] = useState(INITIAL_STATE);
  const onSocketReady = useCallback((socket: Socket) => {
    const tracker = new RoomConnectionWarningTracker(setState);
    const onConnect = () => {
      const token = tracker.beginSync();
      void roomApis.getDeviceConnections().then((response) => {
        if (response.data.result) tracker.applyHttp(response.data.result, token);
        else tracker.syncFailed(token);
      }).catch(() => tracker.syncFailed(token));
    };
    const onDisconnect = () => tracker.pause();
    const onSnapshot = (snapshot: RoomDeviceConnectionsSnapshot) => {
      // Ignore data queued across a transport disconnect until monitoring resumes.
      if (socket.connected) tracker.applySnapshot(snapshot);
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);
    socket.on("device_connections_snapshot", onSnapshot);
    if (socket.connected) onConnect();
    else tracker.beginSync();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
      socket.off("device_connections_snapshot", onSnapshot);
      tracker.dispose();
      setState(INITIAL_STATE);
    };
  }, []);

  return { state, onSocketReady };
};
