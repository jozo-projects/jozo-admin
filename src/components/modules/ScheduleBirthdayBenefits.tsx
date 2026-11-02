import { useState } from "react";
import { BirthdayBenefits } from "./BirthdayBenefits";
import { BirthdayBillDialog } from "./BirthdayBillDialog";
import { Button } from "@/components/ui/button";
import type { useScheduleBirthday } from "@/hooks/use-schedule-birthday";

export function ScheduleBirthdayBenefits({ birthday, at }: { birthday: ReturnType<typeof useScheduleBirthday>; at?: string }) {
  const [billId, setBillId] = useState<string | null>(null);
  return <div className="space-y-2">
    {at && <p className="text-xs text-muted-foreground">Dự kiến theo ngày sử dụng {new Date(at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Chưa giữ lượt hoặc giữ tồn kho.</p>}
    <BirthdayBenefits offer={birthday.data} checked={birthday.checked} selection={birthday.selection} busy={birthday.isFetching || birthday.isSavingDraft} error={birthday.isError} onCheckedChange={birthday.setChecked} onSelectionChange={birthday.setSelection} onRetry={() => void birthday.refetch()} onOpenBill={setBillId} />
    {birthday.draftLoadError && <p role="alert">Không tải được lựa chọn đã lưu. <button type="button" onClick={birthday.retryDraft}>Thử lại</button></p>}
    <Button type="button" variant="outline" disabled={birthday.blocked} loading={birthday.isSavingDraft} onClick={birthday.saveDraft}>Lưu lựa chọn sinh nhật</Button>
    <BirthdayBillDialog billId={billId} onClose={() => setBillId(null)} />
  </div>;
}
