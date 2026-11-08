import { IRoom, IRoomSchedule } from "@/@types/Room";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import dayjs from "@/lib/dayjs";
import { VN_TZ } from "@/utils/revenuePeriod";

interface Props {
  schedule: IRoomSchedule | null;
  rooms?: IRoom[];
  roomName?: string;
  onClose: () => void;
}

export default function HistoricalScheduleDetails({ schedule, rooms = [], roomName, onClose }: Props) {
  if (!schedule) return null;
  const cancelled = schedule.status.toLowerCase() === "cancelled";
  const room = rooms.find((item) => String(item._id) === String(schedule.roomId));
  const formatTime = (value?: string | null) => value && dayjs(value).isValid() ? dayjs(value).tz(VN_TZ).format("DD/MM/YYYY HH:mm") : "Không có dữ liệu";
  const rows = [
    ["Trạng thái", cancelled ? "Đã huỷ" : "Đã kết thúc"],
    ["Phòng", roomName || room?.roomName || "Không xác định"],
    ["Mã booking", schedule.bookingCode || "—"],
    ["Khách hàng", schedule.customerName || "—"],
    ["Số điện thoại", schedule.customerPhone || "—"],
    ["Nguồn đặt", schedule.source || "—"],
    ["Bắt đầu", formatTime(schedule.startTime)],
    ...(cancelled ? [
      ["Thời điểm huỷ", formatTime(schedule.cancelledAt)],
      ["Nguồn huỷ", ({ customer: "Khách", staff: "Nhân viên / admin", system: "Hệ thống" } as Record<string, string>)[schedule.cancellationSource || ""] || schedule.cancellationSource || "Không có dữ liệu"],
      ["Người huỷ", schedule.cancelledBy === "customer" ? "Khách (chưa xác định danh tính)" : schedule.cancelledBy || "Không có dữ liệu"],
      ["Lý do huỷ", schedule.cancellationReason || "Không có dữ liệu"],
    ] : [["Kết thúc", formatTime(schedule.actualEndTime || schedule.endTime)]]),
    ["Ghi chú", schedule.note || "—"],
  ];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết phiên {cancelled ? "đã huỷ" : "đã kết thúc"}</DialogTitle>
          <DialogDescription>Thông tin lịch phòng đã lưu · chỉ xem</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[110px_1fr] gap-3 border-b pb-2 last:border-0">
              <dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
