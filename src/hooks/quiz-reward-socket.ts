import type { Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";

/** Attach to the provider's authenticated management socket, without opening another connection. */
export function installQuizRewardSocket(socket: Socket, client: QueryClient, notify: (event: { scheduleId: string; roomId?: string }) => void, seen: Set<string>): () => void {
  const onReward = (event: unknown) => {
    const id = (event as { scheduleId?: unknown } | null)?.scheduleId;
    if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) return;
    void client.invalidateQueries({ queryKey: ["quiz", "schedule-result", id] });
    void client.invalidateQueries({ queryKey: ["quiz", "results"] });
    if (!seen.has(id)) {
      seen.add(id);
      const roomId = (event as { roomId?: unknown }).roomId;
      try { notify({ scheduleId: id, ...(typeof roomId === "string" ? { roomId } : {}) }); } catch { /* Notifications must not affect the data refresh. */ }
    }
  };
  const onConnect = () => {
    void client.invalidateQueries({ queryKey: ["quiz", "schedule-result"] });
    void client.invalidateQueries({ queryKey: ["quiz", "results"] });
  };
  socket.on("quiz_reward_earned", onReward);
  socket.on("connect", onConnect);
  if (socket.connected) onConnect();
  return () => {
    socket.off("quiz_reward_earned", onReward);
    socket.off("connect", onConnect);
  };
}
