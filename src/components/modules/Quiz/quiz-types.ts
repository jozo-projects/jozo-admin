// Campaign editor draft, including the server's historical item name snapshot.
export interface QuizQuestion {
  text: string;
  options: string[];
  correctOptionIndex: number | null;
}

export interface QuizRewardItem {
  menuItemId?: string;
  name: string;
  quantity: number;
}

export interface QuizRewardThreshold {
  minimumCorrect: number;
  items: QuizRewardItem[];
}

export interface QuizCampaignDraft {
  title: string;
  description: string;
  enabled: boolean;
  // datetime-local values, interpreted in the administrator's local time by the integrator.
  startsAtLocal: string;
  endsAtLocal: string;
  iconUrl: string;
  questionCount: number;
  // Total time for the entire quiz attempt, not per question.
  durationSeconds: number;
  revealDelaySeconds: number;
  questions: QuizQuestion[];
  rewards: QuizRewardThreshold[];
}

export interface QuizResult {
  id: string;
  participant: string;
  correctCount: number;
  questionCount: number;
  rewardDescription: string;
  confirmed: boolean;
}

export function validateQuizCampaign(draft: QuizCampaignDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("Vui lòng nhập tên chương trình.");
  if (!draft.startsAtLocal || !Number.isFinite(Date.parse(draft.startsAtLocal))) errors.push("Vui lòng chọn thời gian bắt đầu hợp lệ.");
  if (!draft.endsAtLocal || !Number.isFinite(Date.parse(draft.endsAtLocal))) errors.push("Vui lòng chọn thời gian kết thúc hợp lệ.");
  if (draft.startsAtLocal && draft.endsAtLocal && Date.parse(draft.endsAtLocal) <= Date.parse(draft.startsAtLocal)) errors.push("Thời gian kết thúc phải sau thời gian bắt đầu.");
  {
    try {
      const url = new URL(draft.iconUrl);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
    } catch { errors.push("URL hình ảnh/GIF phải là URL https hợp lệ."); }
  }
  if (!Number.isInteger(draft.questionCount) || draft.questionCount < 1 || draft.questionCount > draft.questions.length) errors.push("Số câu hỏi phải từ 1 đến số câu đã cấu hình.");
  if (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 1 || draft.durationSeconds > 86400) errors.push("Thời gian toàn bộ lượt chơi phải từ 1 đến 86400 giây.");
  if (!Number.isInteger(draft.revealDelaySeconds) || draft.revealDelaySeconds < 0 || draft.revealDelaySeconds > 300) errors.push("Độ trễ hiển thị đáp án phải từ 0 đến 300 giây.");
  if (draft.title.length > 200 || draft.description.length > 2000 || draft.questionCount > 100 || draft.questions.length > 100 || draft.rewards.length > 101) errors.push("Nội dung hoặc số lượng vượt giới hạn chương trình.");
  draft.questions.forEach((question, index) => {
    if (!question.text.trim() || question.text.length > 2000) errors.push(`Câu ${index + 1}: nội dung không hợp lệ.`);
    if (question.options.length < 2 || question.options.length > 10 || question.options.some((option) => !option.trim() || option.length > 500)) errors.push(`Câu ${index + 1}: cần 2–10 đáp án hợp lệ.`);
    if (question.correctOptionIndex === null || !Number.isInteger(question.correctOptionIndex) || question.correctOptionIndex < 0 || question.correctOptionIndex >= question.options.length) errors.push(`Câu ${index + 1}: chọn một đáp án đúng.`);
  });
  const thresholds = new Set<number>();
  draft.rewards.forEach((reward, index) => {
    if (!Number.isInteger(reward.minimumCorrect) || reward.minimumCorrect < 0 || reward.minimumCorrect > draft.questionCount) errors.push(`Mốc thưởng ${index + 1}: số câu đúng phải từ 0 đến số câu chơi.`);
    if (thresholds.has(reward.minimumCorrect)) errors.push(`Mốc thưởng ${index + 1}: số câu đúng bị trùng.`);
    thresholds.add(reward.minimumCorrect);
    if (!reward.items.length || reward.items.length > 50 || reward.items.some((item) => !item.menuItemId || !/^[a-f\d]{24}$/i.test(item.menuItemId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000)) errors.push(`Mốc thưởng ${index + 1}: cần chọn món trong danh mục và số lượng hợp lệ.`);
  });
  return errors;
}
