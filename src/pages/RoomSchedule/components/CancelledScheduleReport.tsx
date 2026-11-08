import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IRoomSchedule } from "@/@types/Room";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dayjs from "@/lib/dayjs";
import { RevenueRange, VN_TZ } from "@/utils/revenuePeriod";
import HistoricalScheduleDetails from "./HistoricalScheduleDetails";

const sourceLabel: Record<string, string> = { customer: "Khách", staff: "Nhân viên / admin", admin: "Admin", system: "Hệ thống", unknown: "Không rõ" };
const LIMIT = 20;

export default function CancelledScheduleReport({ range, rooms }: { range: RevenueRange; rooms?: Record<string, string> }) {
  const [selected, setSelected] = useState<IRoomSchedule | null>(null);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["cancelledScheduleReport", range.start, range.end, page],
    queryFn: async () => {
      const response = await roomsScheduleApis.getCancelledSchedules(range.start, range.end, page, LIMIT);
      const result = response.data.result;
      if (!result || !Array.isArray(result.items) || !Array.isArray(result.bySource)) throw new Error("Không nhận được báo cáo lịch huỷ");
      return result;
    },
    refetchOnMount: "always",
  });
  const data = query.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Theo thời điểm huỷ, trong khoảng hiển thị phía trên (bao gồm mốc đầu, không gồm mốc cuối). Kỳ ngày/tuần/tháng/quý tính từ 03:00 giờ Việt Nam. Báo cáo gồm lịch phòng bị huỷ, có thể gồm lịch không phải booking.</p>
      {query.isPending ? <p>Đang tải lịch bị huỷ…</p> : query.isError || !data ? (
        <div role="alert" className="text-sm text-destructive">Không tải được dữ liệu. <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Thử lại</Button></div>
      ) : <>
        <Card><CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-4">
          <div><div className="text-sm text-muted-foreground">Lịch bị huỷ trong kỳ</div><div className="text-2xl font-semibold">{data.total}</div></div>
          <div className="text-sm text-muted-foreground">{data.bySource.map(({ source, count }) => <span key={source} className="mr-4 inline-block">{sourceLabel[source] || source || "Không rõ"}: <strong className="text-foreground">{count}</strong></span>)}</div>
        </CardContent></Card>
        {data.unknownTimestampCount > 0 && <p className="rounded-md border p-3 text-sm text-muted-foreground">Có {data.unknownTimestampCount} lịch huỷ cũ chưa có thời điểm huỷ; không tính vào kỳ này. Có thể xem chi tiết trên timeline.</p>}
        <Card><CardHeader className="py-4"><CardTitle className="text-base">Danh sách lịch bị huỷ</CardTitle></CardHeader><CardContent>
          {data.items.length === 0 ? <p className="text-sm text-muted-foreground">Không có lịch bị huỷ trong kỳ này.</p> : <div className="divide-y">{data.items.map((item) => (
            <button key={item._id} type="button" onClick={() => setSelected(item)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 py-3 text-left text-sm hover:text-primary">
              <span>Huỷ: {item.cancelledAt ? dayjs(item.cancelledAt).tz(VN_TZ).format("DD/MM/YYYY HH:mm") : "Không rõ"}</span>
              <span className="font-medium">{rooms?.[item.roomId] || "Phòng không xác định"}</span>
              <span>{item.customerName || item.customerPhone || item.bookingCode || "Không có thông tin khách"}</span>
              <span className="text-muted-foreground">{sourceLabel[item.cancellationSource || "unknown"] || item.cancellationSource}</span>
              <span className="ml-auto text-muted-foreground">Xem chi tiết →</span>
            </button>
          ))}</div>}
          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
            <span>Trang {page}</span>
            <Button size="sm" variant="outline" disabled={page * LIMIT >= data.total} onClick={() => setPage(page + 1)}>Sau</Button>
          </div>
        </CardContent></Card>
      </>}
      <HistoricalScheduleDetails schedule={selected} roomName={selected ? rooms?.[selected.roomId] : undefined} onClose={() => setSelected(null)} />
    </div>
  );
}
