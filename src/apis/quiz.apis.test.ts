import { describe, expect, it, vi } from "vitest";
vi.mock("@/utils/http", () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
import http from "@/utils/http";
import { quizApis, toCampaign, toDraft, type QuizCampaign } from "./quiz.apis";
const campaign: QuizCampaign = { title: "Quiz", description: "", iconUrl: "https://example.com/a", enabled: true, startsAt: "2027-01-01T00:00:00.000Z", endsAt: "2027-01-01T01:00:00.000Z", questionCount: 1, durationSeconds: 300, revealSeconds: 2, questions: [{ text: "?", options: ["A", "B"], correctIndex: 1 }], rewardTiers: [{ minScore: 0, items: [{ menuItemId: "507f1f77bcf86cd799439011", name: "Quà", quantity: 2 }] }] };
describe("quiz API adapter", () => {
  it("preserves the returned snapshot in the draft but submits only catalog identity and quantity", () => {
    const draft = toDraft(campaign);
    expect(draft.rewards[0].items[0]).toEqual(campaign.rewardTiers[0].items[0]);
    expect(toCampaign(draft)).toEqual({ ...campaign, rewardTiers: [{ minScore: 0, items: [{ menuItemId: "507f1f77bcf86cd799439011", quantity: 2 }] }] });
  });
  it("uses the backend envelopes and routes", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({ data: { campaign } }).mockResolvedValueOnce({ data: { attempts: [] } });
    vi.mocked(http.put).mockResolvedValueOnce({ data: { campaign } });
    vi.mocked(http.post).mockResolvedValueOnce({ data: { attempt: { delivered: true } } });
    expect(await quizApis.getCampaign()).toEqual(campaign);
    expect(await quizApis.saveCampaign(toCampaign(toDraft(campaign)))).toEqual(campaign);
    expect(await quizApis.getResults()).toEqual({ attempts: [] });
    expect(await quizApis.claim("abc")).toEqual({ delivered: true });
    expect(http.get).toHaveBeenCalledWith("/quiz/results", { params: { limit: 100 } });
    expect(http.post).toHaveBeenCalledWith("/quiz/results/abc/claim");
  });
});
