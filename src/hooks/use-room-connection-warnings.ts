import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ROOM_DEVICE_CONNECTIONS_QUERY_KEY } from "@/hooks/use-room-device-connections";
import type { Socket } from "socket.io-client";
import type { RoomDeviceConnectionsSnapshot } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import authorizationApis from "@/apis/roomDeviceAuthorization.apis";
import {
  RoomConnectionWarningTracker,
  type RoomConnectionWarningState,
} from "@/utils/roomConnectionWarnings";

const INITIAL_STATE: RoomConnectionWarningState = { status: "inactive", losses: [] };

// Two equal clicks, distinct from the rising inbox chime.
const playDeviceRequestSound = () => {
  try {
    const AudioContextCtor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    if (context.state !== "running") {
      void context.close();
      return;
    }
    for (const offset of [0, 0.16]) {
      const start = context.currentTime + offset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 620;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.07);
    }
    window.setTimeout(() => { void context.close(); }, 500);
  } catch {
    // Autoplay policy may block sound until the user interacts with the page.
  }
};

/** Installed only on the global provider's existing socket; owns no connection. */
export const useRoomConnectionWarnings = (canMonitorAuthorizations = false) => {
  const [state, setState] = useState(INITIAL_STATE);
  const queryClient = useQueryClient();
  const seenRequests = useRef<Set<string> | null>(null);
  const authorizations = useQuery({
    queryKey: ["room-device-authorization", "admin"],
    queryFn: async () => (await authorizationApis.list()).data,
    enabled: canMonitorAuthorizations,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!canMonitorAuthorizations) {
      seenRequests.current = null;
      return;
    }
    if (!authorizations.data) return;
    const pending = authorizations.data.pending.filter((request) => Date.parse(request.expiresAt) > Date.now());
    if (seenRequests.current === null) {
      seenRequests.current = new Set(pending.map((request) => request.id));
      return;
    }
    let hasNewRequest = false;
    for (const request of pending) {
      if (!seenRequests.current.has(request.id)) {
        seenRequests.current.add(request.id);
        hasNewRequest = true;
      }
    }
    if (hasNewRequest) playDeviceRequestSound();
  }, [authorizations.data, canMonitorAuthorizations]);
  const onSocketReady = useCallback((socket: Socket) => {
    const tracker = new RoomConnectionWarningTracker(setState);
    const onConnect = () => {
      const token = tracker.beginSync();
      void queryClient.invalidateQueries({ queryKey: ["room-device-authorization", "admin"] });
      void queryClient.invalidateQueries({ queryKey: ROOM_DEVICE_CONNECTIONS_QUERY_KEY });
      void roomApis.getDeviceConnections().then((response) => {
        if (response.data.result) tracker.applyHttp(response.data.result, token);
        else tracker.syncFailed(token);
      }).catch(() => tracker.syncFailed(token));
    };
    const onDisconnect = () => tracker.pause();
    const onSnapshot = (snapshot: RoomDeviceConnectionsSnapshot) => {
      // Ignore data queued across a transport disconnect until monitoring resumes.
      if (socket.connected) {
        tracker.applySnapshot(snapshot);
        queryClient.setQueryData(ROOM_DEVICE_CONNECTIONS_QUERY_KEY, snapshot);
      }
    };
    const onAuthorizationChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ["room-device-authorization", "admin"] });
    };
    socket.on("device_authorization_changed", onAuthorizationChanged);
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
      socket.off("device_authorization_changed", onAuthorizationChanged);
      tracker.dispose();
      setState(INITIAL_STATE);
    };
  }, [queryClient]);

  return { state, onSocketReady };
};
