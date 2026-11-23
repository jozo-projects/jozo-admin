import { useState } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { QuizAttempt } from "@/apis/quiz.apis";

export function QuizResultsTable({ results, onConfirm, loading = false, error, disabled = false }: { results: QuizAttempt[]; onConfirm: (result: QuizAttempt) => Promise<void>; loading?: boolean; error?: string | null; disabled?: boolean }) {
  const [selected, setSelected] = useState<QuizAttempt | null>(null);
  const [pending, setPending] = useState(false);
  const [claimError, setClaimError] = useState("");
  const confirm = async () => {
    if (!selected || pending || disabled) return;
    setPending(true); setClaimError("");
    try { await onConfirm(selected); setSelected(null); }
    catch { setSelected(null); setClaimError("Chưa xác định được kết quả xác nhận. Hãy tải lại và kiểm tra trạng thái trước khi thử lại."); }
    finally { setPending(false); }
  };
  return <div className="space-y-3">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {claimError && <p role="alert" className="text-destructive">{claimError}</p>}
    <Table><TableHeader><TableRow><TableHead>Phòng / lượt</TableHead><TableHead>Chương trình / bắt đầu</TableHead><TableHead>Điểm</TableHead><TableHead>Quà đạt được</TableHead><TableHead>Trạng thái</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={6}>Đang tải kết quả...</TableCell></TableRow> : results.length === 0 ? <TableRow><TableCell colSpan={6}>{error ? "Không tải được kết quả." : "Chưa có kết quả."}</TableCell></TableRow> : results.map(r => <TableRow key={r.scheduleId}>
        <TableCell>{r.roomName || (r.roomId != null ? `Phòng ${r.roomId}` : "Không rõ phòng")}<br /><span className="text-xs text-muted-foreground">{r.scheduleId}</span></TableCell>
        <TableCell>{r.title}<br />{r.startedAt ? new Date(r.startedAt).toLocaleString("vi-VN") : "—"}</TableCell>
        <TableCell>{r.score ?? "—"}</TableCell><TableCell>{r.reward?.items.map(i => `${i.name} × ${i.quantity}`).join(", ") || "—"}</TableCell>
        <TableCell>{r.status !== "finished" ? "Đang chơi" : !r.reward ? "Không có quà" : r.delivered ? "Đã trao quà" : "Chưa trao quà"}{r.delivered && <div className="text-xs text-muted-foreground">Nhân viên: {r.confirmedBy || "Không rõ"}<br />Thời gian: {r.confirmedAt ? new Date(r.confirmedAt).toLocaleString("vi-VN") : "Không rõ"}</div>}</TableCell>
        <TableCell>{r.status === "finished" && r.reward && !r.delivered ? <Button type="button" variant="outline" disabled={disabled || pending} onClick={() => { setClaimError(""); setSelected(r); }}><Gift className="mr-2 h-4 w-4" aria-hidden="true" />Phát quà</Button> : "—"}</TableCell>
      </TableRow>)}</TableBody></Table>
    <AlertDialog open={!!selected} onOpenChange={open => { if (!open && !pending) setSelected(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đã trao quà?</AlertDialogTitle><AlertDialogDescription>Thao tác này đánh dấu quà của lượt {selected?.scheduleId} đã được trao. Chỉ xác nhận sau khi giao quà thực tế.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={event => { event.preventDefault(); void confirm(); }}>{pending ? "Đang xác nhận..." : "Đã trao quà"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
