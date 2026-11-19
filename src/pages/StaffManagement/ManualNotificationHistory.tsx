import { useCallback, useEffect, useRef, useState } from "react";
import http from "@/utils/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Result = { userId: string; name?: string; status: string; push: string };
type Item = { id: string; title: string | null; body: string | null; createdAt: string; results: Result[]; processing: "pending" | "completed"; deletion?: "deleting" | "deleted" | null };
type Listing = { items: Item[]; total: number; page: number; limit: number };
type Mode = "hide" | "all";
const stateLabel = (item: Item) => item.deletion === "deleting" ? "Xóa chưa hoàn tất" : item.processing !== "completed" || !Array.isArray(item.results) || item.results.some(r => r.status === "pending" || r.push === "pending" || r.push === "unknown") ? "Đang xử lý hoặc chưa rõ" : "Đã xử lý";
const pushLabel: Record<string, string> = { accepted: "Nhà cung cấp đã chấp nhận", unavailable: "Không khả dụng", failed: "Không thành công", not_attempted: "Chưa thử", pending: "Đang xử lý", unknown: "Chưa rõ" };
const dateLabel = (date: string) => { const value = new Date(date); return Number.isNaN(value.getTime()) ? "Không rõ thời gian" : value.toLocaleString("vi-VN"); };

export default function ManualNotificationHistory({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const detailSequence = useRef(0);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => { if (detail) detailRef.current?.focus(); }, [detail]);
  useEffect(() => () => { detailSequence.current += 1; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false); setList(null);
    http.get<Listing>("/notifications/manual", { params: { page, limit: 10 } }).then(response => {
      if (!Array.isArray(response.data?.items)) throw new Error("Invalid list");
      if (active) setList(response.data);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh, revision]);
  const openDetail = useCallback(async (id: string) => {
    const sequence = ++detailSequence.current;
    setDetail(null); setDetailError(false); setDetailLoading(true); setDeleteError("");
    try {
      const response = await http.get<Item>(`/notifications/manual/${encodeURIComponent(id)}`);
      if (!response.data || !Array.isArray(response.data.results) || response.data.id !== id) throw new Error("Invalid detail");
      const results = await Promise.all(response.data.results.map(async result => {
        if (result.name) return result;
        try {
          const user = await http.get<{ result: { name?: string; full_name?: string } }>(`/users/${encodeURIComponent(result.userId)}`);
          return { ...result, name: user.data?.result?.name || user.data?.result?.full_name };
        } catch { return result; }
      }));
      if (sequence === detailSequence.current) setDetail({ ...response.data, results });
    } catch { if (sequence === detailSequence.current) setDetailError(true); }
    finally { if (sequence === detailSequence.current) setDetailLoading(false); }
  }, []);
  const remove = async () => {
    if (!detail || !mode || busy || (detail.deletion === "deleting" ? mode !== "all" : stateLabel(detail) !== "Đã xử lý")) return;
    setBusy(true); setDeleteError("");
    try {
      await http.delete(`/notifications/manual/${encodeURIComponent(detail.id)}`, { data: { mode } });
      setMode(null); setDetail(null); setRefresh(value => value + 1);
    } catch {
      setMode(null);
      setDeleteError("Chưa xác nhận được kết quả xóa. Hãy kiểm tra lại danh sách; nếu việc xóa chưa hoàn tất, mở chi tiết để tiếp tục xóa.");
      setRefresh(value => value + 1);
    } finally { setBusy(false); }
  };
  return <Card><CardContent className="space-y-4 p-4 sm:p-6">
    <div><h2 className="font-semibold">Lịch sử thông báo</h2><p className="text-sm text-muted-foreground">Xem nội dung, người nhận và kết quả gửi.</p></div>
    {loading && <p>Đang tải lịch sử...</p>}
    {error && <div role="alert">Không tải được lịch sử. <Button variant="outline" onClick={() => setRefresh(value => value + 1)}>Thử lại</Button></div>}
    {deleteError && <p role="alert">{deleteError}</p>}
    {list && !list.items.length && <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>}
    {list && list.items.length > 0 && <div className="w-full overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3 font-medium">Thời gian</th><th className="p-3 font-medium">Thông báo</th><th className="p-3 font-medium">Người nhận</th><th className="p-3 font-medium">Trạng thái</th><th className="p-3 font-medium">Thao tác</th></tr></thead><tbody>{list.items.map(item => <tr key={item.id} className="border-b align-top"><td className="p-3 whitespace-nowrap">{dateLabel(item.createdAt)}</td><td className="max-w-xs p-3"><p className="break-words font-medium">{item.title || "Thông báo cũ không còn nội dung"}</p>{item.body && <p className="line-clamp-2 break-words text-muted-foreground">{item.body}</p>}</td><td className="p-3">{Array.isArray(item.results) ? `${item.results.length} người` : "Chưa rõ"}</td><td className="p-3">{stateLabel(item)}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void openDetail(item.id)}>Xem chi tiết</Button><Button variant="outline" onClick={() => void openDetail(item.id)}>Xóa</Button></div></td></tr>)}</tbody></table></div>}
    {list && <div className="flex items-center gap-3 text-sm"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trang trước</Button><span>Trang {page}</span><Button variant="outline" disabled={list.items.length < 10 || (typeof list.total === "number" && page * 10 >= list.total)} onClick={() => setPage(p => p + 1)}>Trang sau</Button></div>}
    {detailLoading && <p>Đang tải chi tiết...</p>}
    {detailError && <p role="alert">Không tải được chi tiết. Hãy chọn lại thông báo để thử lại.</p>}
    {detail && <section ref={detailRef} tabIndex={-1} aria-label="Chi tiết thông báo" className="space-y-3 rounded-md border p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">Chi tiết thông báo</h3><Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button></div><p className="break-words font-medium">{detail.title || "Thông báo cũ không còn nội dung"}</p><p className="whitespace-pre-wrap break-words text-sm">{detail.body || "Không còn nội dung để hiển thị."}</p><p className="text-sm">{dateLabel(detail.createdAt)} · {stateLabel(detail)}</p><ul className="space-y-1 text-sm">{detail.results.map((result, index) => <li key={result.userId || index}>{result.name || "Không tải được tên nhân viên"}: {result.status === "created" ? "Đã tạo trong ứng dụng" : result.status === "failed" ? "Không xác nhận tạo được" : "Kết quả chưa rõ"} · Push: {pushLabel[result.push] || "Chưa rõ"}</li>)}</ul><p className="text-xs text-muted-foreground">Push được chấp nhận không xác nhận nhân viên đã nhận hoặc đã đọc.</p>{detail.deletion === "deleting" ? <div className="space-y-2"><p className="text-sm">Việc xóa chưa hoàn tất. Hãy tiếp tục để xóa thông báo trong ứng dụng nhân viên.</p><Button variant="outline" onClick={() => setMode("all")}>Tiếp tục xóa</Button></div> : stateLabel(detail) !== "Đã xử lý" ? <p className="text-sm">Không thể xóa khi kết quả đang xử lý hoặc chưa rõ. Hãy kiểm tra lại sau.</p> : <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setMode("hide")}>Chỉ ẩn khỏi quản lý</Button><Button variant="outline" onClick={() => setMode("all")}>Xóa cả thông báo nhân viên</Button></div>}</section>}
    <AlertDialog open={!!mode} onOpenChange={open => { if (!open && !busy) setMode(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{mode === "hide" ? "Ẩn khỏi quản lý?" : "Xóa thông báo của nhân viên?"}</AlertDialogTitle><AlertDialogDescription>{mode === "hide" ? "Chỉ ẩn khỏi danh sách quản lý; nhân viên vẫn thấy thông báo trong ứng dụng." : "Thông báo sẽ bị xóa khỏi quản lý và ứng dụng của nhân viên."} Push đã gửi hoặc đang chờ gửi không thể thu hồi chắc chắn.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void remove(); }}>Xác nhận</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </CardContent></Card>;
}
