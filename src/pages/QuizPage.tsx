import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { QuizCampaignForm } from "@/components/modules/Quiz/QuizCampaignForm";
import { QuizResultsTable } from "@/components/modules/Quiz/QuizResultsTable";
import type { QuizCampaignDraft } from "@/components/modules/Quiz/quiz-types";
import { quizApis, toCampaign, toDraft } from "@/apis/quiz.apis";

const emptyDraft: QuizCampaignDraft = { title: "", description: "", iconUrl: "", enabled: false, startsAtLocal: "", endsAtLocal: "", questionCount: 1, durationSeconds: 300, revealDelaySeconds: 0, questions: [], rewards: [] };
export default function QuizPage() {
  const client = useQueryClient();
  const [draft, setDraft] = useState<QuizCampaignDraft | null>(null);

  const [claimUncertain, setClaimUncertain] = useState(false);
  const campaign = useQuery({ queryKey: ["quiz", "campaign"], queryFn: quizApis.getCampaign, retry: false });
  const results = useQuery({ queryKey: ["quiz", "results"], queryFn: quizApis.getResults, retry: false });
  const refresh = async () => { const result = await results.refetch(); if (!result.isError) setClaimUncertain(false); };
  return <main className="space-y-8 p-4 md:p-6"><h1 className="text-2xl font-semibold">Quản lý Quiz</h1>
    <section className="space-y-4"><h2 className="text-xl font-semibold">Chương trình</h2>
      {campaign.isPending ? <p>Đang tải chương trình...</p> : campaign.isError ? <div role="alert">Không tải được chương trình. <Button variant="outline" onClick={() => void campaign.refetch()}>Thử lại</Button></div> : <QuizCampaignForm value={draft ?? (campaign.data ? toDraft(campaign.data) : emptyDraft)} onChange={setDraft} onSave={async value => { const saved = await quizApis.saveCampaign(toCampaign(value)); client.setQueryData(["quiz", "campaign"], saved); setDraft(toDraft(saved)); await client.invalidateQueries({ queryKey: ["quiz", "campaign"] }); }} />}
    </section>
    <section className="space-y-4"><div className="flex items-center gap-3"><h2 className="text-xl font-semibold">Kết quả và trao quà</h2><Button variant="outline" disabled={results.isFetching} onClick={() => void refresh()}>Tải lại</Button></div>
      {claimUncertain && <p role="alert" className="text-destructive">Trạng thái trao quà chưa chắc chắn. Tải lại thành công và kiểm tra trước khi xác nhận lại.</p>}
      <QuizResultsTable results={results.data?.attempts ?? []} loading={results.isPending} error={results.isError ? "Không tải được kết quả. Vui lòng thử tải lại." : null} disabled={claimUncertain || results.isError || results.isFetching} onConfirm={async result => { try { const claimed = await quizApis.claim(result.scheduleId); if (!claimed?.delivered) throw new Error("Chưa xác nhận được trạng thái trao quà"); await client.invalidateQueries({ queryKey: ["quiz", "results"], refetchType: "none" }); const refreshed = await results.refetch(); if (refreshed.isError) throw new Error("Không tải lại được kết quả"); } catch (e) { setClaimUncertain(true); void client.invalidateQueries({ queryKey: ["quiz", "results"], refetchType: "none" }); throw e; } }} />
      {results.data?.finalizationPending && <p role="status">Còn lượt hết giờ đang chờ xử lý. Nhấn Tải lại để tiếp tục cập nhật kết quả.</p>}
      {(results.data?.attempts.length ?? 0) >= 100 && <p>Chỉ hiển thị tối đa 100 kết quả mới nhất.</p>}
    </section>
  </main>;
}
