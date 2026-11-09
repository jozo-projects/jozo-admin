import api from "@/apis/roomDeviceAuthorization.apis";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useIsAdmin } from "@/hooks/usePermission";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

const CONFIG_KEY = ["room-device-authorization", "config"];

async function getConfig() {
  const { data } = await api.getConfig();
  if (typeof data?.enabled !== "boolean") throw new Error("Invalid authorization config");
  return data;
}

export default function DeviceAuthorizationConfig() {
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const locked = useRef(false);
  const query = useQuery({ queryKey: CONFIG_KEY, queryFn: getConfig, enabled: isAdmin, refetchOnWindowFocus: true });

  const confirm = async () => {
    if (!isAdmin || requested === null || locked.current) return;
    locked.current = true;
    setBusy(true);
    setSaveError(false);
    await queryClient.cancelQueries({ queryKey: CONFIG_KEY });
    try {
      await api.updateConfig(requested);
      // Read back the authoritative value; the PUT response is not assumed to contain it.
      const config = await getConfig();
      queryClient.setQueryData(CONFIG_KEY, config);
      setRequested(null);
    } catch {
      setRequested(null);
      setSaveError(true);
      // A failed request may have reached the server, so never guess its outcome.
      await query.refetch();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  if (!isAdmin) return null;

  return <Card>
    <CardHeader><CardTitle>Xác thực thiết bị phòng</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Yêu cầu thiết bị được duyệt trước khi sử dụng phòng. Cài đặt áp dụng cho toàn bộ phòng.</p>
      {query.isLoading ? <p role="status" className="text-sm">Đang tải cài đặt...</p> : query.isError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Không tải được cài đặt. Hãy thử lại trước khi thay đổi.</p><Button variant="outline" size="sm" disabled={query.isFetching || busy} onClick={() => void query.refetch()}>Thử lại</Button></div> : query.data && <div className="flex flex-wrap items-center gap-3">
        <Switch id="device-authorization-enabled" aria-label="Xác thực thiết bị phòng" checked={query.data.enabled} disabled={!isAdmin || busy || query.isFetching} onCheckedChange={setRequested} />
        <label htmlFor="device-authorization-enabled" className="text-sm font-medium">{query.data.enabled ? "Đang bật" : "Đang tắt"}</label>

        {busy && <span role="status" className="text-sm">Đang lưu và kiểm tra...</span>}
      </div>}
      {saveError && <p role="alert" className="text-sm text-destructive">Không thể xác nhận kết quả cập nhật. Hãy kiểm tra lại trạng thái trước khi thử lại.</p>}
    </CardContent>
    <Dialog open={requested !== null} onOpenChange={(open) => { if (!open && !busy) setRequested(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{requested ? "Bật xác thực thiết bị?" : "Tắt xác thực thiết bị?"}</DialogTitle>
          <DialogDescription>{requested
            ? "Cài đặt có hiệu lực cả với các phòng đang hoạt động. Thiết bị chưa được duyệt có thể bị gián đoạn hoặc không thể sử dụng phòng cho đến khi được duyệt. Hãy kiểm tra các phòng trước khi tiếp tục."
            : "Thiết bị sẽ không còn phải được duyệt để sử dụng phòng, làm giảm khả năng kiểm soát truy cập. Thay đổi áp dụng cho toàn bộ phòng. Bạn có chắc muốn tiếp tục?"}</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setRequested(null)}>Hủy</Button><Button disabled={busy || !isAdmin || query.isError} onClick={() => void confirm()}>{busy ? "Đang lưu..." : "Xác nhận"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>;
}
