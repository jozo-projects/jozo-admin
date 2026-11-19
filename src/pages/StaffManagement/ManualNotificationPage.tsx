import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Role } from "@/constants/enum";
import ManualNotification from "./ManualNotification";
import ManualNotificationHistory from "./ManualNotificationHistory";
import { loadAllStaff } from "./select-all-staff";
import http from "@/utils/http";
import type { UsersResponse } from "@/@types/user";

export default function ManualNotificationPage() {
  const [selected, setSelected] = useState<{ id: string; name: string }[]>([]);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [allError, setAllError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const selectAll = async () => {
    setLoadingAll(true); setAllReady(false); setAllError(false); setSelected([]);
    try {
      const staff = await loadAllStaff((page, limit) => http.get<UsersResponse>('/users', { params: { page, limit, role: Role.Staff, sort_by: '_id', sort_order: 'asc' } }));
      setSelected(staff); setAllReady(true);
    } catch { setAllError(true); }
    finally { setLoadingAll(false); }
  };
  return <div className="flex w-full min-w-0 flex-col gap-5">
    <PageHeader title="Gửi thông báo nhân viên" />
    <div className="flex justify-end"><Button onClick={() => { setOpen(true); void selectAll(); }}>Tạo thông báo</Button></div>
    <ManualNotificationHistory revision={revision} />
    <Dialog open={open} onOpenChange={value => { if (busy || loadingAll) return; if (!value && dirty && !window.confirm("Đóng sẽ bỏ nội dung đang soạn. Bạn có muốn tiếp tục?")) return; setOpen(value); if (!value) setDirty(false); }}>
    <DialogContent className="block overflow-y-auto sm:max-w-2xl" onEscapeKeyDown={event => { if (busy || loadingAll) event.preventDefault(); }} onPointerDownOutside={event => { if (busy || loadingAll) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Tạo thông báo</DialogTitle><DialogDescription>Thông báo được gửi đến toàn bộ nhân viên, không lọc theo ca.</DialogDescription></DialogHeader>
    <div className="mt-4 space-y-4">
      <Card><CardContent className="space-y-4 p-4 sm:p-6">
        <div><h2 className="font-semibold">Toàn bộ nhân viên</h2><p className="text-sm text-muted-foreground">Bao gồm tất cả tài khoản staff, kể cả tài khoản bị khóa; không lọc theo ca. Tối đa 50 người mỗi lần gửi.</p></div>
        {loadingAll && <p role="status">Đang tải tất cả nhân viên...</p>}
        {allError && <p role="alert">Không tải được danh sách đầy đủ hoặc danh sách đã thay đổi. Không thể gửi; hãy thử tải lại.</p>}
        <Button type="button" variant="outline" disabled={busy || loadingAll} onClick={() => void selectAll()}>Tải lại danh sách nhân viên</Button>
        <p className="text-xs text-muted-foreground">Danh sách có thể thay đổi sau khi tải; hãy tải lại và kiểm tra trước khi gửi.</p>
      </CardContent></Card>
      <ManualNotification selected={selected} selectionLoading={!allReady} onBusyChange={setBusy} onDirtyChange={setDirty} onChanged={() => setRevision(value => value + 1)} />
    </div>
    </DialogContent></Dialog>
  </div>;
}
