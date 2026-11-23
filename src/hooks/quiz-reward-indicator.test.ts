// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import QuizGiftIndicator from "@/pages/RoomSchedule/components/QuizGiftIndicator";
import { installQuizRewardSocket } from "./quiz-reward-socket";

const mocks = vi.hoisted(() => ({ get: vi.fn(), claim: vi.fn() }));
vi.mock("@/hooks/usePermission", () => ({ useIsAdmin: () => true, useIsStaff: () => false }));
vi.mock("@/apis/quiz.apis", () => ({ quizApis: { getScheduleResult: mocks.get, claim: mocks.claim } }));

it("updates the mounted schedule gift from an event and restores missed state on reconnect", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const id = "507f1f77bcf86cd799439011";
  let current: any = null;
  mocks.get.mockImplementation(async () => current);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node);
  const handlers = new Map<string, (value?: any) => void>();
  const socket = { connected: false, on: (key: string, fn: any) => handlers.set(key, fn), off: (key: string) => handlers.delete(key) };
  const play = vi.fn();
  const cleanup = installQuizRewardSocket(socket as never, client, play, new Set());
  const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(QuizGiftIndicator, { scheduleId: id, roomName: "101" }))));
    await flush();
    expect(node.querySelector('[aria-label="Trao quà quiz 101"]')).toBeNull();
    current = { scheduleId: id, status: "finished", delivered: false, reward: { items: [{ name: "Tea", quantity: 1 }] } };
    await act(async () => { handlers.get("quiz_reward_earned")?.({ scheduleId: id }); });
    await flush();
    expect(node.querySelector('[aria-label="Trao quà quiz 101"]')).not.toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
    current = { ...current, delivered: true };
    await act(async () => { handlers.get("connect")?.(); });
    await flush();
    expect(node.querySelector('[aria-label="Trao quà quiz 101"]')).toBeNull();
    expect(play).toHaveBeenCalledTimes(1);
  } finally { cleanup(); await act(async () => root.unmount()); client.clear(); node.remove(); }
});
