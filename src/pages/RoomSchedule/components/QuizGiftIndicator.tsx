import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { quizApis } from "@/apis/quiz.apis";
import { useIsAdmin, useIsStaff } from "@/hooks/usePermission";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function QuizGiftIndicator({ scheduleId, roomName }: { scheduleId: string; roomName: string }) {
  const isAdmin = useIsAdmin();
  const isStaff = useIsStaff();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const result = useQuery({
    queryKey: ["quiz", "schedule-result", scheduleId],
    queryFn: () => quizApis.getScheduleResult(scheduleId),
    enabled: isAdmin || isStaff,
    retry: false,
    staleTime: 25_000,
    refetchOnWindowFocus: false,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  if (!isAdmin && !isStaff) return null;
  const attempt = result.data;
  const eligible = attempt?.scheduleId === scheduleId && attempt.status === "finished" && !!attempt.reward && attempt.delivered === false;
  const refresh = async () => {
    const updated = await result.refetch();
    if (!updated.isError) setUncertain(false);
    return !updated.isError;
  };
  const confirm = async () => {
    if (!eligible || pending || uncertain || result.isError || result.isFetching) return;
    setPending(true);
    setMessage("");
    try {
      const claimed = await quizApis.claim(scheduleId);
      if (claimed?.scheduleId !== scheduleId || claimed.delivered !== true) throw new Error("Không xác nhận được trạng thái trao quà.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["quiz", "results"] }),
        client.invalidateQueries({ queryKey: ["roomSchedules"] }),
        client.invalidateQueries({ queryKey: ["roomSchedule", scheduleId] }),
      ]);
      const updated = await result.refetch();
      if (updated.isError || updated.data?.delivered !== true) throw new Error("Không tải lại được trạng thái trao quà.");
      setOpen(false);
    } catch (error: any) {
      setUncertain(true);
      setMessage(error.response?.data?.message || "Chưa xác định được kết quả. Tải lại và kiểm tra trước khi xác nhận lại.");
      void client.invalidateQueries({ queryKey: ["quiz", "results"], refetchType: "none" });
      void client.invalidateQueries({ queryKey: ["roomSchedules"] });
    } finally { setPending(false); }
  };
  if (result.isPending) return <span className="pointer-events-auto text-xs text-muted-foreground" role="status">Đang tải quà quiz…</span>;
  if (result.isError && !open) return <button type="button" className="pointer-events-auto text-xs text-destructive underline" onClick={() => void refresh()}>Lỗi quà quiz · Thử lại</button>;
  if (!eligible && !open && !uncertain) return null;
  return <>
    {eligible && <button type="button" className="pointer-events-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-amber-600" aria-label={`Trao quà quiz ${roomName}`} onClick={(event) => { event.stopPropagation(); setOpen(true); }}><Gift className="h-5 w-5" aria-hidden="true" /></button>}
    {uncertain && !open && <button type="button" className="pointer-events-auto text-xs text-destructive underline" onClick={() => void refresh()}>Kiểm tra lại quà quiz</button>}
    <AlertDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đã trao quà quiz?</AlertDialogTitle>
        <AlertDialogDescription>Phòng: {roomName}. Quà: {attempt?.reward?.items.map(item => `${item.name} × ${item.quantity}`).join(", ") || "Không có thông tin"}. Chỉ xác nhận sau khi giao quà thực tế; quà sẽ được ghi vào bill với giá 0 đồng.</AlertDialogDescription>
      </AlertDialogHeader>
      {(message || result.isError || uncertain) && <p role="alert" className="text-sm text-destructive">{message || "Không tải được trạng thái quà. Hãy tải lại trước khi xác nhận."} <button type="button" className="underline" disabled={pending || result.isFetching} onClick={() => void refresh().then(ok => { if (ok) setMessage(""); })}>Tải lại</button></p>}
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={!eligible || pending || uncertain || result.isError || result.isFetching} onClick={event => { event.preventDefault(); void confirm(); }}>{pending ? "Đang xác nhận…" : "Đã trao quà"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
