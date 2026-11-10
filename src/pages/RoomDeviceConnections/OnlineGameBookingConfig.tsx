import http from "@/utils/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsAdmin } from "@/hooks/usePermission";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function OnlineGameBookingConfig() {
  const isAdmin = useIsAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["online-game-booking-config"], enabled: isAdmin, refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await http.get<{ capacity: number }>("/bookings/game-config");
      if (!Number.isSafeInteger(data?.capacity) || data.capacity < 0) throw new Error("Invalid config");
      return data;
    },
  });
  if (!isAdmin) return null;
  const value = draft ?? String(query.data?.capacity ?? 0);
  const update = async () => {
    if (busy || value.trim() === "" || !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 1000) return;
    setBusy(true); setError(false);
    try { await http.put("/bookings/game-config", { capacity: Number(value) }); setDraft(null); }
    catch { setError(true); }
    finally { await query.refetch(); setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Số máy Nintendo dùng chung</CardTitle></CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">Số máy áp dụng chung cho tất cả booking, bao gồm Dorm. Đặt 0 nếu không có máy; Music Box không sử dụng máy.</p>
      {query.isLoading ? <p>Đang tải...</p> : query.isError || !query.data ? <div><p role="alert">Không tải được cài đặt.</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div> :
        <div className="flex items-center gap-3"><Input aria-label="Số máy Nintendo" type="number" min={0} max={1000} step={1} value={value} onChange={e => setDraft(e.target.value)} /><Button disabled={busy || value.trim() === "" || !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 1000} onClick={() => void update()}>Lưu</Button></div>}
      {error && <p role="alert" className="text-destructive">Không thể xác nhận cập nhật. Kiểm tra trạng thái trước khi thử lại.</p>}
    </CardContent></Card>;
}
