// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { QuizResultsTable } from "./QuizResultsTable";
import type { QuizAttempt } from "@/apis/quiz.apis";

it("displays real room and rewards, guards delivered rows and confirms before claim", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const claim = vi.fn().mockResolvedValue(undefined);
  const row: QuizAttempt = { scheduleId: "abc", title: "Quiz", roomName: "Phòng Sao", startedAt: "2027-01-01T00:00:00Z", status: "finished", score: 1, reward: { minScore: 1, items: [{ name: "Bánh", quantity: 2 }] }, delivered: false };
  try {
    await act(async () => root.render(createElement(QuizResultsTable, { results: [row, { ...row, scheduleId: "xyz", delivered: true }], onConfirm: claim })));
    expect(host.textContent).toContain("Phòng Sao"); expect(host.textContent).toContain("Bánh × 2");
    const buttons = [...host.querySelectorAll("button")].filter(b => b.textContent === "Phát quà");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].querySelector("svg")).not.toBeNull();
    await act(async () => buttons[0].click());
    expect(claim).not.toHaveBeenCalled();
    const confirm = [...document.querySelectorAll("button")].find(b => b.textContent === "Đã trao quà");
    expect(confirm).toBeDefined();
    await act(async () => confirm!.click());
    expect(claim).toHaveBeenCalledWith(row);
  } finally { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
