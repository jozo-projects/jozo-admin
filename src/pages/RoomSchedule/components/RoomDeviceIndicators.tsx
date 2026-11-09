import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Gamepad2, Tv } from "lucide-react";
import api, { type AuthorizationClientType, type PendingAuthorization } from "@/apis/roomDeviceAuthorization.apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useRoomDeviceConnections } from "@/hooks/use-room-device-connections";

export default function RoomDeviceIndicators({ roomId, roomName }: { roomId: number; roomName: string }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<AuthorizationClientType | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: "revoke"; activeId: string } | { kind: "replace"; request: PendingAuthorization; activeId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const locked = useRef(false);
  const authorizations = useQuery({ queryKey: ["room-device-authorization", "admin"], queryFn: async () => (await api.list()).data, refetchInterval: 10_000, refetchOnWindowFocus: true });
  const connections = useRoomDeviceConnections();
  useEffect(() => {
    if (!selected) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [selected]);
  const snapshot = authorizations.data;
  const online = (type: AuthorizationClientType) => connections.data?.rooms.some((room) => String(room.roomId) === String(roomId) && room.devices.some((device) => device.clientType === type)) ?? false;
  const activeFor = (type: AuthorizationClientType) => snapshot?.active.find((item) => item.roomId === roomId && item.clientType === type);
  const pendingFor = (type: AuthorizationClientType) => snapshot?.pending.filter((item) => item.roomId === roomId && item.clientType === type && Date.parse(item.expiresAt) > now) ?? [];
  const rejectedFor = (type: AuthorizationClientType) => type === "video" ? snapshot?.rejected?.filter((item) => item.roomId === roomId && item.clientType === type) ?? [] : [];
  const active = selected ? activeFor(selected) : undefined;
  const pending = selected ? pendingFor(selected) : [];
  const rejected = selected ? rejectedFor(selected) : [];
  const label = (type: AuthorizationClientType) => type === "control" ? "Control" : "Video";
  const perform = async (request?: PendingAuthorization, expectedActiveId: string | null = null) => {
    if (!selected || locked.current || authorizations.isError || snapshot?.truncated) return;
    if (request && Date.parse(request.expiresAt) <= Date.now()) { toast({ title: "Yêu cầu đã hết hạn", variant: "destructive" }); void authorizations.refetch(); return; }
    locked.current = true;
    setBusy(true);
    try {
      if (request) await api.approve({ roomId, clientType: selected, id: request.id, expectedActiveId });
      else if (expectedActiveId) await api.revoke({ roomId, clientType: selected, expectedActiveId });
      else return;
      toast({ title: request ? "Đã duyệt quyền thiết bị" : "Đã thu hồi quyền thiết bị" });
    } catch (error) {
      toast({ title: "Không thể cập nhật quyền", description: axios.isAxiosError(error) && error.response?.status === 409 ? "Yêu cầu đã hết hạn hoặc quyền đã thay đổi. Vui lòng kiểm tra lại." : "Không xác nhận được kết quả. Hãy làm mới và kiểm tra trước khi thử lại.", variant: "destructive" });
    } finally {
      setConfirmation(null);
      await Promise.all([authorizations.refetch(), connections.refetch()]);
      locked.current = false;
      setBusy(false);
    }
  };
  const reject = async (request: PendingAuthorization) => {
    if (locked.current || authorizations.isError || snapshot?.truncated) return;
    locked.current = true;
    setBusy(true);
    try {
      await api.reject({ roomId: request.roomId, clientType: request.clientType, id: request.id });
      toast({ title: "Đã từ chối yêu cầu" });
    } catch (error) {
      toast({ title: "Không thể từ chối yêu cầu", description: axios.isAxiosError(error) && error.response?.status === 409 ? "Yêu cầu đã hết hạn hoặc đang được xử lý. Vui lòng kiểm tra lại." : "Không xác nhận được kết quả. Hãy làm mới và kiểm tra trước khi thử lại.", variant: "destructive" });
    } finally {
      await authorizations.refetch();
      locked.current = false;
      setBusy(false);
    }
  };
  const reopen = async (request: PendingAuthorization) => {
    if (locked.current || authorizations.isError || snapshot?.truncated) return;
    locked.current = true;
    setBusy(true);
    try {
      await api.reopen({ roomId: request.roomId, clientType: request.clientType, id: request.id });
      toast({ title: "Đã mở lại yêu cầu", description: "TV tiếp tục chờ duyệt; quyền chưa được cấp." });
    } catch {
      toast({ title: "Không thể mở lại yêu cầu", description: "Yêu cầu có thể đã thay đổi. Hãy làm mới và kiểm tra lại.", variant: "destructive" });
    } finally {
      await authorizations.refetch();
      locked.current = false;
      setBusy(false);
    }
  };
  return <>
    <span className="pointer-events-auto inline-flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
      {(["control", "video"] as const).map((type) => {
        const requests = pendingFor(type);
        const granted = activeFor(type);
        const connected = online(type);
        const denied = rejectedFor(type);
        if (!requests.length && !granted && !connected && !denied.length) return null;
        const state = requests.length ? `Có ${requests.length} yêu cầu chờ duyệt` : connected ? (granted ? "Có kết nối · đã cấp quyền" : "Có kết nối · chưa xác nhận quyền") : granted ? "Đã cấp quyền · không kết nối" : "Có yêu cầu đã từ chối";
        const Icon = type === "control" ? Gamepad2 : Tv;
        return <Tooltip key={type}><TooltipTrigger asChild><button type="button" aria-label={`${label(type)} ${roomName}: ${state}`} onClick={() => setSelected(type)} className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${requests.length ? "text-red-600 motion-safe:animate-pulse" : connected ? "text-green-600" : "text-muted-foreground"}`}><Icon className="h-4 w-4" /></button></TooltipTrigger><TooltipContent>{label(type)}: {state}</TooltipContent></Tooltip>;
      })}
    </span>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !busy && !confirmation) setSelected(null); }}>
      <DialogContent className="overflow-y-auto"><DialogHeader><DialogTitle>{selected && label(selected)} · {roomName}</DialogTitle><DialogDescription>Trạng thái kết nối và quyền được cấp là hai thông tin riêng. Đối chiếu thiết bị thực tế trước khi duyệt.</DialogDescription></DialogHeader>
        {(authorizations.isError || connections.isError) && <p role="alert" className="text-sm text-destructive">Không tải được trạng thái mới nhất. Vui lòng làm mới trước khi thao tác.</p>}
        {snapshot?.truncated && <p role="alert" className="text-sm text-destructive">Danh sách quyền chưa đầy đủ. Không thể thao tác an toàn.</p>}
        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-3"><p className="font-medium">{selected && online(selected) ? "Có kết nối" : "Không có kết nối"}</p><p className="text-muted-foreground">{active ? `Đã cấp quyền · Mã: ${active.id}` : "Chưa có quyền được cấp"}</p>{active && <Button className="mt-2" size="sm" variant="outline" disabled={busy || authorizations.isError || snapshot?.truncated} onClick={() => setConfirmation({ kind: "revoke", activeId: active.id })}>Thu hồi quyền</Button>}</div>
          <div className="space-y-2"><p className="font-medium">Yêu cầu chờ ({pending.length})</p>{!pending.length && <p className="text-muted-foreground">Không có yêu cầu chờ.</p>}{pending.map((request) => {
            const seconds = Math.max(0, Math.ceil((Date.parse(request.expiresAt) - now) / 1000));
            return <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><div className="min-w-0"><p className="break-all text-muted-foreground">Mã yêu cầu: {request.id}</p><p>Còn {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy || !seconds || authorizations.isError || snapshot?.truncated} onClick={() => void reject(request)}>Từ chối</Button><Button size="sm" disabled={busy || !seconds || authorizations.isError || snapshot?.truncated} onClick={() => active ? setConfirmation({ kind: "replace", request, activeId: active.id }) : void perform(request)}>{active ? "Thay thế" : "Duyệt"}</Button></div></div>;
          })}</div>
          {rejected.length > 0 && <div className="space-y-2"><p className="font-medium">Yêu cầu TV đã từ chối</p>{rejected.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><p className="min-w-0 break-all text-muted-foreground">Mã yêu cầu: {request.id}</p><Button size="sm" variant="outline" disabled={busy || authorizations.isError || snapshot?.truncated} onClick={() => void reopen(request)}>Cho xin lại</Button></div>)}</div>}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}><DialogContent><DialogHeader><DialogTitle>{confirmation?.kind === "replace" ? "Xác nhận thay thế thiết bị" : "Xác nhận thu hồi quyền"}</DialogTitle><DialogDescription>Quyền hiện tại của {selected && label(selected)} · {roomName} sẽ bị thu hồi. {confirmation?.kind === "replace" && "Thiết bị mới chỉ được cấp quyền sau khi anh xác nhận."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button><Button disabled={busy} onClick={() => { if (confirmation) void perform(confirmation.kind === "replace" ? confirmation.request : undefined, confirmation.activeId); }}>{busy ? "Đang xử lý..." : "Xác nhận"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
