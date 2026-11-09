import api, { type ActiveAuthorization, type PendingAuthorization } from "@/apis/roomDeviceAuthorization.apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

type Confirmation = { kind: "replace"; pending: PendingAuthorization; active: ActiveAuthorization } | { kind: "revoke"; active: ActiveAuthorization };

function remainingSeconds(expiresAt: string, now: number) {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry - now) / 1000)) : 0;
}

export default function DeviceAuthorizations() {
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const query = useQuery({
    queryKey: ["room-device-authorization", "admin"],
    queryFn: async () => (await api.list()).data,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const perform = async (action: { kind: "approve"; pending: PendingAuthorization; expectedActiveId: string | null } | { kind: "revoke"; active: ActiveAuthorization }) => {
    if (locked.current) return;
    if (action.kind === "approve" && remainingSeconds(action.pending.expiresAt, Date.now()) === 0) {
      setConfirmation(null);
      toast({ title: "Yêu cầu đã hết hạn", description: "Thiết bị cần gửi lại yêu cầu.", variant: "destructive" });
      void query.refetch();
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      if (action.kind === "approve") {
        const { roomId, clientType, id } = action.pending;
        await api.approve({ roomId, clientType, id, expectedActiveId: action.expectedActiveId });
      } else {
        const { roomId, clientType, id } = action.active;
        await api.revoke({ roomId, clientType, expectedActiveId: id });
      }
      toast({ title: action.kind === "approve" ? "Đã duyệt quyền thiết bị" : "Đã thu hồi quyền thiết bị" });
    } catch (error) {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      toast({ title: "Không thể cập nhật quyền", description: conflict ? "Yêu cầu có thể đã hết hạn hoặc quyền đã thay đổi. Danh sách sẽ được làm mới; hãy kiểm tra lại." : "Không thể xác nhận kết quả. Hãy làm mới và kiểm tra trước khi thử lại.", variant: "destructive" });
    } finally {
      setConfirmation(null);
      await query.refetch();
      locked.current = false;
      setBusy(false);
    }
  };
  const data = query.data;
  return <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
      <div><CardTitle>Quản lý quyền thiết bị</CardTitle><p className="mt-1 text-sm text-muted-foreground">Quyền được lưu riêng với trạng thái online; mã chỉ để phân biệt, không chứng minh thiết bị thực. Hãy đối chiếu trước khi duyệt.</p></div>
      <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching || busy}>Làm mới quyền</Button>
    </CardHeader>
    <CardContent className="space-y-5">
      {query.isLoading ? <p>Đang tải quyền thiết bị...</p> : null}
      {query.isError && <p role="alert" className="text-sm text-destructive">Không tải được danh sách quyền. Hãy làm mới trước khi thao tác.</p>}
      {data?.truncated && <p role="alert" className="text-sm text-destructive">Danh sách bị giới hạn, có thể chưa hiển thị đầy đủ quyền và yêu cầu.</p>}
      {data && <>
        <section className="space-y-2"><h3 className="font-semibold">Yêu cầu chờ ({data.pending.length})</h3>
          {data.pending.length === 0 && <p className="text-sm text-muted-foreground">Không có yêu cầu chờ.</p>}
          {data.pending.map((pending) => {
            const active = data.active.find((item) => item.roomId === pending.roomId && item.clientType === pending.clientType);
            const seconds = remainingSeconds(pending.expiresAt, now);
            return <div key={pending.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <div className="min-w-0"><p className="font-medium">{pending.roomName || `Phòng ${pending.roomId}`} · {pending.clientType}</p><p className="break-all text-muted-foreground">Mã yêu cầu: {pending.id}</p><p className={seconds ? "text-muted-foreground" : "text-destructive"}>{seconds ? `Còn ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Đã hết hạn"}</p></div>
              <Button size="sm" disabled={busy || query.isError || !seconds} onClick={() => active ? setConfirmation({ kind: "replace", pending, active }) : void perform({ kind: "approve", pending, expectedActiveId: null })}>{active ? "Thay thế quyền" : "Duyệt"}</Button>
            </div>;
          })}
        </section>
        <section className="space-y-2"><h3 className="font-semibold">Quyền đang cấp ({data.active.length})</h3>
          {data.active.length === 0 && <p className="text-sm text-muted-foreground">Chưa có quyền đang cấp.</p>}
          {data.active.map((active) => <div key={active.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><div className="min-w-0"><p className="font-medium">{active.roomName || `Phòng ${active.roomId}`} · {active.clientType}</p><p className="break-all text-muted-foreground">Mã quyền: {active.id}</p></div><Button variant="outline" size="sm" disabled={busy || query.isError} onClick={() => setConfirmation({ kind: "revoke", active })}>Thu hồi</Button></div>)}
        </section>
      </>}
    </CardContent>
    <Dialog open={!!confirmation} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{confirmation?.kind === "replace" ? "Xác nhận thay thế quyền" : "Xác nhận thu hồi quyền"}</DialogTitle><DialogDescription>Quyền hiện tại của {confirmation?.active.roomName || `phòng ${confirmation?.active.roomId}`} · {confirmation?.active.clientType} sẽ bị thu hồi. Mã quyền hiện tại: {confirmation?.active.id}.{confirmation?.kind === "replace" && ` Yêu cầu mới: ${confirmation.pending.id}. Chỉ xác nhận sau khi đối chiếu thiết bị thực tế.`}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button><Button disabled={busy || query.isError || (confirmation?.kind === "replace" && remainingSeconds(confirmation.pending.expiresAt, now) === 0)} onClick={() => { if (!confirmation) return; if (confirmation.kind === "replace") void perform({ kind: "approve", pending: confirmation.pending, expectedActiveId: confirmation.active.id }); else void perform({ kind: "revoke", active: confirmation.active }); }}>{busy ? "Đang xử lý..." : "Xác nhận"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>;
}
