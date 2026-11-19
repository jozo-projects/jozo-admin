import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "@/context/Authorization.context";
import http from "@/utils/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Recipient = { id: string; name: string };
type Result = { userId: string; status: "created" | "failed" | "pending"; push: "accepted" | "unavailable" | "failed" | "not_attempted" | "pending" | "unknown" };
type Saved = { requestId: string; recipients: Recipient[]; title: string; body: string };
const pushLabels: Record<Result["push"], string> = { accepted: "Push được nhà cung cấp chấp nhận", unavailable: "Push không khả dụng", failed: "Push thất bại", not_attempted: "Chưa thử Push", pending: "Push đang xử lý hoặc chưa rõ", unknown: "Kết quả Push chưa rõ" };

export default function ManualNotification({ selected, onChanged, onBusyChange, onDirtyChange, selectionLoading = false }: { selected: Recipient[]; onRemove?: (id: string) => void; onChanged?: () => void; onBusyChange?: (busy: boolean) => void; onDirtyChange?: (dirty: boolean) => void; selectionLoading?: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [resolveConfirm, setResolveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const [outcome, setOutcome] = useState<{ recipients: Recipient[]; results: Result[] | null } | null>(null);
  useEffect(() => { onDirtyChange?.(!outcome && (!!title || !!body)); }, [title, body, outcome, onDirtyChange]);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [storageError, setStorageError] = useState(false);
  const { user } = useContext(AuthContext);
  const storageKey = user?._id ? `manual-notification:${user._id}` : null;
  const sending = useRef(false);
  const activeKey = useRef(storageKey);
  activeKey.current = storageKey;
  const recover = async (item: Saved) => {
    const key = storageKey;
    setBusy(true);
    try {
      const response = await http.get<{ results: Result[] }>(`/notifications/manual/${item.requestId}`);
      if (activeKey.current === key) setOutcome({ recipients: item.recipients, results: Array.isArray(response.data?.results) ? response.data.results : null });
    } catch { if (activeKey.current === key) setOutcome({ recipients: item.recipients, results: null }); }
    finally { if (activeKey.current === key) setBusy(false); }
  };
  useEffect(() => {
    setSaved(null); setOutcome(null); setTitle(""); setBody(""); setBusy(false); setStorageError(false);
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const item: Saved = JSON.parse(raw);
        setSaved(item); setTitle(item.title); setBody(item.body);
        setOutcome({ recipients: item.recipients, results: null });
        void recover(item);
      }
    } catch { setStorageError(true); }
  }, [storageKey]);
  const send = async () => {
    if (sending.current || !storageKey || (!saved && (selectionLoading || !selected.length || selected.length > 50 || !title.trim() || title.trim().length > 120 || !body.trim() || body.trim().length > 2000))) return;
    const item = saved || { requestId: crypto.randomUUID(), recipients: [...selected], title: title.trim(), body: body.trim() };
    try { window.localStorage.setItem(storageKey, JSON.stringify(item)); } catch { setStorageError(true); return; }
    setSaved(item);
    sending.current = true;
    setBusy(true);
    try {
      const response = await http.post<{ results: Result[] }>("/notifications/manual", { requestId: item.requestId, userIds: item.recipients.map(r => r.id), title: item.title, body: item.body });
      setOutcome({ recipients: item.recipients, results: Array.isArray(response.data?.results) ? response.data.results : null });
    } catch {
      setOutcome({ recipients: item.recipients, results: null });
    } finally { sending.current = false; setBusy(false); setConfirm(false); onChanged?.(); }
  };
  return <Card><CardContent className="space-y-3 p-4 sm:p-6">
    <div><h2 className="font-semibold">Gửi thông báo cho nhân viên</h2><p className="text-sm text-muted-foreground">Gửi đến toàn bộ nhân viên. Push chỉ hiện nội dung chung; nội dung bạn soạn nằm trong ứng dụng.</p></div>
    {!selectionLoading && <div className="flex flex-wrap gap-2 text-sm"><span>Tổng số nhân viên: {selected.length}:</span>{selected.map(r => <span key={r.id} className="rounded border px-2">{r.name}</span>)}</div>}
    {selected.length > 50 && <p role="alert" className="text-sm text-destructive">Không thể gửi cho toàn bộ nhân viên: hệ thống chỉ hỗ trợ tối đa 50 người mỗi lần. Không tự động chia lượt gửi.</p>}
    <label className="block text-sm">Tiêu đề (tối đa 120 ký tự)<Input maxLength={120} value={title} disabled={busy || !!outcome} onChange={e => setTitle(e.target.value)} /></label>
    <label className="block text-sm">Nội dung (tối đa 2000 ký tự)<textarea maxLength={2000} className="mt-1 min-h-24 w-full rounded-md border bg-background p-2 text-sm" value={body} disabled={busy || !!outcome} onChange={e => setBody(e.target.value)} /></label>
    {storageError && <p role="alert">Không lưu được yêu cầu trên trình duyệt. Không thể gửi an toàn; hãy kiểm tra bộ nhớ trình duyệt.</p>}
    <p className="text-xs text-muted-foreground">Bản nháp được lưu trên trình duyệt này để khôi phục sau khi tải lại. Không dùng máy dùng chung cho nội dung riêng tư.</p>
    <Button type="button" disabled={busy || selectionLoading || !storageKey || storageError || !!outcome || !selected.length || selected.length > 50 || !title.trim() || !body.trim()} onClick={() => setConfirm(true)}>Xem lại</Button>
    {outcome && <div role="status" className="space-y-2 rounded-md border p-3 text-sm">
      {outcome.results ? <><p>Kết quả từng người:</p><ul>{outcome.recipients.map(r => { const result = outcome.results?.find(item => item.userId === r.id); return <li key={r.id}>{r.name}: {result?.status === "created" ? "Đã tạo trong ứng dụng" : result?.status === "failed" ? "Không xác nhận tạo được" : "Kết quả chưa rõ"} — {result && pushLabels[result.push] ? pushLabels[result.push] : "Push chưa rõ"}</li>; })}</ul><p>Push được chấp nhận không xác nhận đã nhận hoặc đã đọc. Nếu không xác nhận tạo được, hãy kiểm tra trước khi gửi lại để tránh trùng.</p></> : <p>Kết quả chưa rõ. Vui lòng kiểm tra thông báo trong ứng dụng trước khi gửi lại; không gửi lại ngay để tránh trùng.</p>}
      {saved && <><p>Trạng thái chưa rõ có thể cần kiểm tra thủ công; không tự động gửi lại thông báo đẩy.</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} variant="outline" onClick={() => void recover(saved)}>Kiểm tra trạng thái</Button><Button type="button" disabled={busy} variant="outline" onClick={() => void send()}>Thử gửi lại yêu cầu</Button></div></>}
      {outcome.results && outcome.results.every(r => r.status !== 'pending' && r.push !== 'pending' && r.push !== 'unknown') && <Button type="button" disabled={busy} variant="outline" onClick={() => { if (storageKey) window.localStorage.removeItem(storageKey); setSaved(null); setOutcome(null); setTitle(""); setBody(""); }}>Soạn thông báo mới</Button>}
      {(!outcome.results || outcome.results.some(r => r.status === 'pending' || r.push === 'pending' || r.push === 'unknown')) && <><p>Hãy liên hệ quản trị hệ thống để đối soát trước khi tạo yêu cầu mới. Trạng thái chưa rõ không chứng minh chưa gửi.</p><Button type="button" disabled={busy} variant="outline" onClick={() => setResolveConfirm(true)}>Đã đối soát, soạn mới</Button></>}
    </div>}
    <AlertDialog open={resolveConfirm} onOpenChange={setResolveConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đã đối soát</AlertDialogTitle><AlertDialogDescription>Yêu cầu cũ vẫn có thể đang xử lý hoặc đã gửi. Xóa bản lưu trên trình duyệt không hủy yêu cầu; gửi nội dung mới có thể tạo thông báo trùng. Chỉ tiếp tục sau khi đã kiểm tra và chấp nhận rủi ro.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={() => { if (storageKey) window.localStorage.removeItem(storageKey); setSaved(null); setOutcome(null); setTitle(""); setBody(""); }}>Đã kiểm tra, tiếp tục</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận gửi thông báo</AlertDialogTitle><AlertDialogDescription>Gửi cho toàn bộ {selected.length} nhân viên: {selected.map(r => r.name).join(", ")}. Kiểm tra nội dung trước khi gửi.</AlertDialogDescription></AlertDialogHeader><div className="whitespace-pre-wrap break-words text-sm"><strong>{title}</strong><p>{body}</p></div><AlertDialogFooter><AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel><AlertDialogAction disabled={busy || selectionLoading} onClick={e => { e.preventDefault(); void send(); }}>Xác nhận gửi</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </CardContent></Card>;
}
