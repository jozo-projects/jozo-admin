import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRevenueSettings, revenueSettingsKey, saveRevenueSettings } from "@/apis/revenueSettings.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RevenueSettings } from "@/utils/revenuePeriod";

function Form({ initial }: { initial: RevenueSettings }) {
  const [draft, setDraft] = useState(initial);
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: saveRevenueSettings, onSuccess: (value) => queryClient.setQueryData(revenueSettingsKey, value) });
  const valid = Number.isInteger(draft.monthStartDay) && draft.monthStartDay >= 1 && draft.monthStartDay <= 28 && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.businessStart) && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.businessEnd) && draft.businessEnd < draft.businessStart;
  return <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (valid) mutation.mutate(draft); }}>
    <div className="flex flex-wrap gap-3">
      <label className="text-sm space-y-1"><span>Ngày bắt đầu tháng (1–28)</span><Input type="number" min={1} max={28} value={draft.monthStartDay} onChange={(e) => setDraft({ ...draft, monthStartDay: Number(e.target.value) })} /></label>
      <label className="text-sm space-y-1"><span>Giờ bắt đầu</span><Input type="time" value={draft.businessStart} onChange={(e) => setDraft({ ...draft, businessStart: e.target.value })} /></label>
      <label className="text-sm space-y-1"><span>Giờ kết thúc hôm sau</span><Input type="time" value={draft.businessEnd} onChange={(e) => setDraft({ ...draft, businessEnd: e.target.value })} /></label>
    </div>
    <p className="text-xs text-muted-foreground">Giờ Việt Nam; giờ kết thúc phải trước giờ bắt đầu. Quy tắc mới áp dụng khi xem cả kỳ cũ, không thay đổi hóa đơn. Không áp dụng cho giá, lương hoặc báo cáo lịch hủy.</p>
    <Button type="submit" size="sm" disabled={!valid || mutation.isPending}>Lưu cài đặt</Button>{mutation.isSuccess && <span className="ml-2 text-sm">Đã lưu</span>}{mutation.isError && <span role="alert" className="ml-2 text-sm text-destructive">Không lưu được cài đặt.</span>}
  </form>;
}
export function RevenueSettingsForm() {
  const query = useQuery({ queryKey: revenueSettingsKey, queryFn: getRevenueSettings, staleTime: 0 });
  if (query.isLoading) return <p>Đang tải cài đặt...</p>;
  if (!query.data || query.isError) return <p role="alert">Không tải được cài đặt doanh thu.</p>;
  return <Form key={JSON.stringify(query.data)} initial={query.data} />;
}
