import http from "@/utils/http";
import type { QuizCampaignDraft } from "@/components/modules/Quiz/quiz-types";

export interface QuizCampaign {
  title: string; description: string; iconUrl: string; enabled: boolean;
  startsAt: string; endsAt: string; questionCount: number; durationSeconds: number; revealSeconds: number;
  questions: { text: string; options: string[]; correctIndex: number }[];
  rewardTiers: { minScore: number; items: { menuItemId?: string; name: string; quantity: number }[] }[];
}
export type QuizCampaignInput = Omit<QuizCampaign, "rewardTiers"> & { rewardTiers: { minScore: number; items: { menuItemId: string; quantity: number }[] }[] };
export interface QuizAttempt {
  scheduleId: string; roomName?: string; roomId?: number; title: string; startedAt: string;
  status: string; score?: number; reward?: { minScore: number; items: { name: string; quantity: number }[] } | null; delivered?: boolean;
  confirmedBy?: string | null; confirmedAt?: string | null;
}
const localDate = (value: string) => {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
};
export const toDraft = (c: QuizCampaign): QuizCampaignDraft => ({
  title: c.title, description: c.description, iconUrl: c.iconUrl, enabled: c.enabled,
  startsAtLocal: localDate(c.startsAt), endsAtLocal: localDate(c.endsAt), questionCount: c.questionCount,
  durationSeconds: c.durationSeconds, revealDelaySeconds: c.revealSeconds,
  questions: c.questions.map(q => ({ text: q.text, options: [...q.options], correctOptionIndex: q.correctIndex })),
  rewards: c.rewardTiers.map(t => ({ minimumCorrect: t.minScore, items: t.items.map(i => ({ ...i })) })),
});
export const toCampaign = (d: QuizCampaignDraft): QuizCampaignInput => ({
  title: d.title, description: d.description, iconUrl: d.iconUrl, enabled: d.enabled,
  startsAt: new Date(d.startsAtLocal).toISOString(), endsAt: new Date(d.endsAtLocal).toISOString(),
  questionCount: d.questionCount, durationSeconds: d.durationSeconds, revealSeconds: d.revealDelaySeconds,
  questions: d.questions.map(q => ({ text: q.text, options: q.options, correctIndex: q.correctOptionIndex! })),
  rewardTiers: d.rewards.map(t => ({ minScore: t.minimumCorrect, items: t.items.map(i => ({ menuItemId: i.menuItemId ?? "", quantity: i.quantity })) })),
});
export const quizApis = {
  getCampaign: async () => (await http.get<{ campaign: QuizCampaign | null }>("/quiz/campaign")).data.campaign,
  saveCampaign: async (campaign: QuizCampaignInput) => (await http.put<{ campaign: QuizCampaign }>("/quiz/campaign", campaign)).data.campaign,
  getResults: async () => (await http.get<{ attempts: QuizAttempt[]; finalizationPending: boolean }>("/quiz/results", { params: { limit: 100 } })).data,
  getScheduleResult: async (scheduleId: string): Promise<QuizAttempt | null> => {
    try {
      const attempt = (await http.get<{ attempt: QuizAttempt }>(`/quiz/results/${encodeURIComponent(scheduleId)}`, { skipErrorToast: true })).data.attempt;
      if (!attempt || attempt.scheduleId !== scheduleId || !["playing", "finished"].includes(attempt.status) || (attempt.status === "finished" && typeof attempt.delivered !== "boolean")) throw new Error("Kết quả quiz không hợp lệ");
      if (attempt.status === "finished" && (attempt.reward === undefined || (attempt.reward !== null && (!Array.isArray(attempt.reward.items) || !attempt.reward.items.length || attempt.reward.items.some(item => typeof item.name !== "string" || !item.name.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1))))) throw new Error("Thông tin quà quiz không hợp lệ");
      return attempt;
    } catch (error: any) {
      if (error.response?.status === 404 && error.response?.data?.error === "NO_ATTEMPT") return null;
      throw error;
    }
  },
  claim: async (scheduleId: string) => (await http.post<{ attempt: QuizAttempt }>(`/quiz/results/${encodeURIComponent(scheduleId)}/claim`)).data.attempt,
};
