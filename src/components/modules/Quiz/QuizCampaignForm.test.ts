// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { QuizCampaignForm } from "./QuizCampaignForm";
import type { QuizCampaignDraft } from "./quiz-types";

it("saves 300 seconds as the total duration for five questions", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const initial: QuizCampaignDraft = {
    title: "Quiz", description: "", enabled: true,
    startsAtLocal: "2027-01-01T10:00", endsAtLocal: "2027-01-01T11:00", iconUrl: "https://example.com/icon.png",
    questionCount: 5, durationSeconds: 60, revealDelaySeconds: 0,
    questions: Array.from({ length: 5 }, () => ({ text: "Câu hỏi", options: ["A", "B"], correctOptionIndex: 0 })),
    rewards: [],
  };
  const onSave = vi.fn().mockResolvedValue(undefined);
  function Wrapper() {
    const [value, setValue] = useState(initial);
    return createElement(QuizCampaignForm, { value, onChange: setValue, onSave });
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, createElement(Wrapper))));
    const label = Array.from(host.querySelectorAll("label")).find((item) => item.textContent?.includes("Thời gian toàn bộ lượt chơi (phút)"));
    expect(label).toBeDefined();
    const input = label!.querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "5");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "1.5");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(onSave.mock.calls[0][0].durationSeconds).toBe(90);
    onSave.mockClear();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "5");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({ questionCount: 5, durationSeconds: 300 });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("secondsPerQuestion");
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps a legacy missing reward visible and prevents saving until replaced", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const initial: QuizCampaignDraft = { title: "Quiz", description: "", enabled: false, startsAtLocal: "2027-01-01T10:00", endsAtLocal: "2027-01-01T11:00", iconUrl: "https://example.com/a", questionCount: 1, durationSeconds: 60, revealDelaySeconds: 0, questions: [{ text: "Q", options: ["A", "B"], correctOptionIndex: 0 }], rewards: [{ minimumCorrect: 1, items: [{ name: "Quà cũ", quantity: 1 }] }] };
  const save = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["menuItems", "list"], []);
  function Wrapper() { const [value, onChange] = useState(initial); return createElement(QuizCampaignForm, { value, onChange, onSave: save }); }
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Wrapper))));
    expect(host.textContent).toContain("Quà cũ");
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(save).not.toHaveBeenCalled();
    expect(host.textContent).toContain("thiếu mã món");
    expect(host.textContent).toContain("không còn trong danh mục");
  } finally { await act(async () => root.unmount()); host.remove(); }
});
