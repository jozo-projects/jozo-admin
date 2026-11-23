import { describe, expect, it } from "vitest";
import { validateQuizCampaign, type QuizCampaignDraft } from "./quiz-types";

const valid = (): QuizCampaignDraft => ({
  title: "Chương trình", description: "", enabled: true,
  startsAtLocal: "2027-01-01T10:00", endsAtLocal: "2027-01-01T11:00", iconUrl: "https://example.com/icon.gif",
  questionCount: 1, durationSeconds: 300, revealDelaySeconds: 0,
  questions: [{ text: "Câu hỏi", options: ["A", "B"], correctOptionIndex: 0 }],
  rewards: [{ minimumCorrect: 1, items: [{ menuItemId: "507f1f77bcf86cd799439011", name: "Quà", quantity: 1 }] }],
});

describe("validateQuizCampaign", () => {
  it("accepts a complete draft", () => expect(validateQuizCampaign(valid())).toEqual([]));
  it("accepts 300 seconds total for five questions and rejects invalid total durations", () => {
    const draft = valid();
    draft.questions = Array.from({ length: 5 }, () => ({ text: "Câu hỏi", options: ["A", "B"], correctOptionIndex: 0 }));
    draft.questionCount = 5;
    expect(validateQuizCampaign(draft)).toEqual([]);
    for (const durationSeconds of [0, -1, 1.5, NaN]) {
      draft.durationSeconds = durationSeconds;
      expect(validateQuizCampaign(draft)).toContain("Thời gian toàn bộ lượt chơi phải từ 1 đến 86400 giây.");
    }
  });
  it("rejects an absent or out-of-range correct answer", () => {
    const draft = valid();
    draft.questions[0].correctOptionIndex = null;
    expect(validateQuizCampaign(draft)).toContain("Câu 1: chọn một đáp án đúng.");
    draft.questions[0].correctOptionIndex = 2;
    expect(validateQuizCampaign(draft)).toContain("Câu 1: chọn một đáp án đúng.");
  });
  it("rejects duplicate and out-of-range thresholds and invalid items", () => {
    const draft = valid();
    draft.rewards.push({ minimumCorrect: 1, items: [{ name: "", quantity: 0 }] }, { minimumCorrect: 2, items: [] });
    const errors = validateQuizCampaign(draft);
    expect(errors).toContain("Mốc thưởng 2: số câu đúng bị trùng.");
    expect(errors).toContain("Mốc thưởng 2: cần chọn món trong danh mục và số lượng hợp lệ.");
    expect(errors).toContain("Mốc thưởng 3: số câu đúng phải từ 0 đến số câu chơi.");
  });
  it("rejects bad scheduling, counts and image URLs", () => {
    const draft = valid();
    Object.assign(draft, { endsAtLocal: draft.startsAtLocal, questionCount: 2, durationSeconds: NaN, iconUrl: "javascript:alert(1)" });
    expect(validateQuizCampaign(draft)).toEqual(expect.arrayContaining([
      "Thời gian kết thúc phải sau thời gian bắt đầu.",
      "Số câu hỏi phải từ 1 đến số câu đã cấu hình.",
      "Thời gian toàn bộ lượt chơi phải từ 1 đến 86400 giây.",
      "URL hình ảnh/GIF phải là URL https hợp lệ.",
    ]));
  });
});
