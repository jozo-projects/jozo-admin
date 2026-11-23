import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { fetchMenuItems, menuItemsQueryKeys } from "@/hooks/use-menu-items";
import { quizGiftOptionsFromMenu } from "./quiz-gift-catalog";
import { QuizCatalogGiftSelector } from "./QuizCatalogGiftSelector";
import { validateQuizCampaign, type QuizCampaignDraft, type QuizQuestion, type QuizRewardThreshold } from "./quiz-types";

export interface QuizCampaignFormProps {
  value: QuizCampaignDraft;
  onChange: (draft: QuizCampaignDraft) => void;
  onSave: (draft: QuizCampaignDraft) => Promise<void>;
  disabled?: boolean;
}

export function QuizCampaignForm({ value, onChange, onSave, disabled = false }: QuizCampaignFormProps) {
  const formId = useId();
  const durationFocused = useRef(false);
  const [durationMinutes, setDurationMinutes] = useState(() => String(value.durationSeconds / 60));
  useEffect(() => { if (!durationFocused.current) setDurationMinutes(Number.isNaN(value.durationSeconds) ? "" : String(value.durationSeconds / 60)); }, [value.durationSeconds]);
  // Shared Input emits a text value for numeric fields; an empty value remains invalid.
  const numberValue = (value: string) => value === "" ? NaN : Number(value);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const errors = validateQuizCampaign(value);
  const catalog = useQuery({ queryKey: menuItemsQueryKeys.lists(), queryFn: fetchMenuItems, enabled: value.rewards.length > 0 });
  if (value.rewards.length) {
    if (catalog.isPending || catalog.isFetching) errors.push("Đang tải danh mục món; vui lòng chờ trước khi lưu.");
    else if (catalog.isError || !catalog.data) errors.push("Không thể kiểm tra danh mục món. Vui lòng thử lại.");
    else {
      const ids = new Set(quizGiftOptionsFromMenu(catalog.data).map(item => item.menuItemId));
      if (value.rewards.some(t => t.items.some(item => !item.menuItemId || !ids.has(item.menuItemId)))) errors.push("Có quà không còn trong danh mục hoặc không khả dụng. Hãy xóa và chọn lại.");
    }
  }
  const update = (patch: Partial<QuizCampaignDraft>) => onChange({ ...value, ...patch });
  const question = (index: number, patch: Partial<QuizQuestion>) => update({ questions: value.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
  const reward = (index: number, patch: Partial<QuizRewardThreshold>) => update({ rewards: value.rewards.map((r, i) => i === index ? { ...r, ...patch } : r) });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setSaveError("");
    if (errors.length || saving || disabled) return;
    setSaving(true);
    try { await onSave(value); } catch (error) { const code = (error as { response?: { data?: { error?: string } } })?.response?.data?.error; setSaveError(code === "REWARD_ITEM_UNAVAILABLE" ? "Món quà không còn khả dụng. Vui lòng tải lại danh mục và chọn lại." : "Không thể lưu chương trình. Vui lòng kiểm tra trạng thái trước khi thử lại."); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset disabled={disabled || saving} className="space-y-6">
        <section className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
          <h2 className="font-semibold md:col-span-2">Thông tin chương trình</h2>
          <label className="space-y-1"><span>Tên chương trình</span><Input value={value.title} onChange={(e) => update({ title: e.target.value })} /></label>
          <label className="space-y-1"><span>URL hình ảnh hoặc GIF</span><Input type="url" value={value.iconUrl} onChange={(e) => update({ iconUrl: e.target.value })} /></label>
          <label className="space-y-1 md:col-span-2"><span>Mô tả</span><Textarea value={value.description} onChange={(e) => update({ description: e.target.value })} /></label>
          <label className="space-y-1"><span>Bắt đầu (giờ địa phương)</span><Input type="datetime-local" step="0.001" value={value.startsAtLocal} onChange={(e) => update({ startsAtLocal: e.target.value })} /></label>
          <label className="space-y-1"><span>Kết thúc (giờ địa phương)</span><Input type="datetime-local" step="0.001" value={value.endsAtLocal} onChange={(e) => update({ endsAtLocal: e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={value.enabled} onChange={(e) => update({ enabled: e.target.checked })} /> Bật chương trình</label>
        </section>
        <section className="grid gap-4 rounded-md border p-4 md:grid-cols-3">
          <h2 className="font-semibold md:col-span-3">Cài đặt lượt chơi</h2>
          <label className="space-y-1"><span>Số câu mỗi lượt</span><Input type="number" min={1} value={Number.isNaN(value.questionCount) ? "" : value.questionCount} onChange={(e) => update({ questionCount: numberValue(e.target.value) })} /></label>
          <label className="space-y-1"><span>Thời gian toàn bộ lượt chơi (phút)</span><Input type="text" inputMode="decimal" value={durationMinutes} onFocus={() => { durationFocused.current = true; }} onBlur={() => { durationFocused.current = false; setDurationMinutes(Number.isNaN(value.durationSeconds) ? "" : String(value.durationSeconds / 60)); }} onChange={(e) => { const raw = e.target.value; setDurationMinutes(raw); update({ durationSeconds: /^\d+(?:[.,]\d*)?$/.test(raw) ? Math.round(Number(raw.replace(',', '.')) * 60) : NaN }); }} /></label>
          <label className="space-y-1"><span>Độ trễ hiện đáp án (giây)</span><Input type="number" min={0} value={Number.isNaN(value.revealDelaySeconds) ? "" : value.revealDelaySeconds} onChange={(e) => update({ revealDelaySeconds: numberValue(e.target.value) })} /></label>
        </section>
        <section className="space-y-4 rounded-md border p-4">
          <h2 className="font-semibold">Câu hỏi</h2>
          {value.questions.map((q, qi) => <fieldset key={qi} className="space-y-3 rounded-md border p-3">
            <legend className="font-medium">Câu {qi + 1}</legend>
            <label className="block space-y-1"><span>Nội dung câu hỏi</span><Input value={q.text} onChange={(e) => question(qi, { text: e.target.value })} /></label>
            {q.options.map((option, oi) => <div key={oi} className="flex items-center gap-2">
              <label className="flex items-center gap-2"><input type="radio" name={`${formId}-correct-${qi}`} checked={q.correctOptionIndex === oi} onChange={() => question(qi, { correctOptionIndex: oi })} /><span className="sr-only">Đáp án đúng {oi + 1}</span></label>
              <Input aria-label={`Câu ${qi + 1}, đáp án ${oi + 1}`} value={option} onChange={(e) => question(qi, { options: q.options.map((v, i) => i === oi ? e.target.value : v) })} />
              <Button type="button" variant="outline" onClick={() => question(qi, { options: q.options.filter((_, i) => i !== oi), correctOptionIndex: q.correctOptionIndex === oi ? null : q.correctOptionIndex !== null && q.correctOptionIndex > oi ? q.correctOptionIndex - 1 : q.correctOptionIndex })}>Xóa</Button>
            </div>)}
            <p className="text-sm text-muted-foreground">Chọn một đáp án đúng.</p>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => question(qi, { options: [...q.options, ""] })}>Thêm đáp án</Button><Button type="button" variant="outline" onClick={() => update({ questions: value.questions.filter((_, i) => i !== qi) })}>Xóa câu hỏi</Button></div>
          </fieldset>)}
          <Button type="button" variant="outline" onClick={() => update({ questions: [...value.questions, { text: "", options: ["", ""], correctOptionIndex: null }] })}>Thêm câu hỏi</Button>
        </section>
        <section className="space-y-4 rounded-md border p-4">
          <h2 className="font-semibold">Mốc thưởng</h2>
          <p className="text-sm text-muted-foreground">Chỉ nhận quà của mốc cao nhất đạt được, không cộng dồn các mốc.</p>
          {value.rewards.map((r, ri) => <fieldset key={ri} className="space-y-3 rounded-md border p-3">
            <legend className="font-medium">Mốc {ri + 1}</legend>
            <label className="block space-y-1"><span>Số câu đúng tối thiểu</span><Input type="number" min={0} value={Number.isNaN(r.minimumCorrect) ? "" : r.minimumCorrect} onChange={(e) => reward(ri, { minimumCorrect: numberValue(e.target.value) })} /></label>
            <QuizCatalogGiftSelector value={r.items} onChange={items => reward(ri, { items: items.map(item => ({ ...item, name: item.name ?? "" })) })} disabled={disabled || saving} />
            <Button type="button" variant="outline" onClick={() => update({ rewards: value.rewards.filter((_, i) => i !== ri) })}>Xóa mốc</Button>
          </fieldset>)}
          <Button type="button" variant="outline" onClick={() => update({ rewards: [...value.rewards, { minimumCorrect: 1, items: [] }] })}>Thêm mốc thưởng</Button>
        </section>
      </fieldset>
      {submitted && errors.length > 0 && <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive"><p>Vui lòng kiểm tra:</p><ul className="list-disc pl-5">{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      <Button type="submit" disabled={disabled || saving}>{saving ? "Đang lưu..." : "Lưu chương trình"}</Button>
    </form>
  );
}
