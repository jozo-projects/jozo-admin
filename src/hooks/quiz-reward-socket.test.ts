import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { installQuizRewardSocket } from "./quiz-reward-socket";

describe("quiz reward socket", () => {
  it("refreshes only the affected result, plays once, recovers on reconnect and cleans up", async () => {
    const handlers = new Map<string, (data?: any) => void>();
    const socket = { connected: false, on: (name: string, fn: any) => handlers.set(name, fn), off: (name: string, fn: any) => { if (handlers.get(name) === fn) handlers.delete(name); } };
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    const play = vi.fn();
    const cleanup = installQuizRewardSocket(socket as never, client, play, new Set());
    const id = "507f1f77bcf86cd799439011";
    handlers.get("quiz_reward_earned")?.({ scheduleId: id, roomId: "507f1f77bcf86cd799439012" });
    handlers.get("quiz_reward_earned")?.({ scheduleId: id, roomId: "507f1f77bcf86cd799439012" });
    handlers.get("quiz_reward_earned")?.({ scheduleId: "invalid" });
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith({ scheduleId: id, roomId: "507f1f77bcf86cd799439012" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["quiz", "schedule-result", id] });
    handlers.get("connect")?.();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["quiz", "schedule-result"] });
    cleanup();
    expect(handlers.size).toBe(0);
    client.clear();
  });
});
