import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { SupportRequest } from "@/@types/SupportRequest";
import SupportRequestModal from "@/pages/RoomSchedule/components/SupportRequestModal";
import { useAllSupportRequestHistory } from "@/hooks/use-support-requests";
import dayjs, { formatUTCToLocal, parseUTCToLocal } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, ClipboardList } from "lucide-react";
import { useMemo, useState } from "react";

const SUPPORT_STATUS_LABELS = {
  waiting: "Đang chờ",
  in_progress: "Đang xử lý",
  completed: "Đã hoàn tất",
  not_supported: "Không hỗ trợ",
} as const;

type SupportStatusFilter = keyof typeof SUPPORT_STATUS_LABELS | "all";

const getSupportStatusGroup = (status: string) => {
  if (status === "pending") return "waiting";
  if (status === "acknowledged") return "in_progress";
  if (status === "resolved") return "completed";
  return "not_supported";
};

function SupportHistoryPage() {
  const [supportDate, setSupportDate] = useState(() =>
    parseUTCToLocal(new Date()).format("YYYY-MM-DD"),
  );
  const [supportRoom, setSupportRoom] = useState("all");
  const [supportStatus, setSupportStatus] =
    useState<SupportStatusFilter>("all");
  const [supportSort, setSupportSort] = useState("newest");
  const [selectedRequest, setSelectedRequest] =
    useState<SupportRequest | null>(null);
  const { data: supportHistory = [], isLoading } = useAllSupportRequestHistory();

  const supportRooms = useMemo(
    () =>
      [...new Set(supportHistory.map((request) => request.roomId))].sort(
        (a, b) => a.localeCompare(b, undefined, { numeric: true }),
      ),
    [supportHistory],
  );

  const selectedSupportDate = supportDate
    ? dayjs(supportDate, "YYYY-MM-DD").toDate()
    : undefined;

  const filteredSupportHistory = useMemo(() => {
    return supportHistory
      .filter((request) => {
        const requestDate = parseUTCToLocal(request.createdAt).format(
          "YYYY-MM-DD",
        );
        return (
          (!supportDate || requestDate === supportDate) &&
          (supportRoom === "all" || request.roomId === supportRoom) &&
          (supportStatus === "all" ||
            getSupportStatusGroup(request.status) === supportStatus)
        );
      })
      .sort((a, b) => {
        if (supportSort === "room") {
          return a.roomId.localeCompare(b.roomId, undefined, { numeric: true });
        }
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return supportSort === "oldest" ? aTime - bTime : bTime - aTime;
      });
  }, [supportDate, supportHistory, supportRoom, supportSort, supportStatus]);

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Lịch sử hỗ trợ"
        description="Tra cứu các yêu cầu hỗ trợ theo ngày, phòng và trạng thái."
        icon={ClipboardList}
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Ngày</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !selectedSupportDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 shrink-0" />
                    {selectedSupportDate ? (
                      format(selectedSupportDate, "dd/MM/yyyy", { locale: vi })
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedSupportDate}
                    onSelect={(nextDate) => {
                      if (nextDate) {
                        setSupportDate(dayjs(nextDate).format("YYYY-MM-DD"));
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Phòng</span>
              <select
                value={supportRoom}
                onChange={(event) => setSupportRoom(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">Tất cả phòng</option>
                {supportRooms.map((roomId) => (
                  <option key={roomId} value={roomId}>
                    Phòng {roomId}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Trạng thái</span>
              <select
                value={supportStatus}
                onChange={(event) =>
                  setSupportStatus(event.target.value as SupportStatusFilter)
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(SUPPORT_STATUS_LABELS).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Sắp xếp</span>
              <select
                value={supportSort}
                onChange={(event) => setSupportSort(event.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="room">Theo phòng</option>
              </select>
            </label>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Đang hiển thị {filteredSupportHistory.length}/{supportHistory.length} lần hỗ trợ
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredSupportHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Không có lịch sử hỗ trợ phù hợp với bộ lọc.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Phòng</th>
                    <th className="px-4 py-3 font-medium">Thời điểm gọi</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Nhân viên</th>
                    <th className="px-4 py-3 font-medium">Nội dung hỗ trợ</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSupportHistory.map((request) => (
                    <tr key={request.requestId} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        Phòng {request.roomId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatUTCToLocal(request.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            getSupportStatusGroup(request.status) ===
                            "completed"
                              ? "secondary"
                              : getSupportStatusGroup(request.status) ===
                                  "not_supported"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {SUPPORT_STATUS_LABELS[
                            getSupportStatusGroup(request.status) as keyof typeof SUPPORT_STATUS_LABELS
                          ]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {request.acknowledgedBy?.name ||
                          request.resolvedBy?.name ||
                          request.closedBy?.name ||
                          "—"}
                      </td>
                      <td className="max-w-[360px] px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">
                          {request.supportNote || "Không có ghi chú hỗ trợ"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {!['resolved', 'closed'].includes(request.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedRequest(request)}
                          >
                            {request.status === "pending"
                              ? "Nhận hỗ trợ"
                              : request.status === "not_supported"
                                ? "Đóng yêu cầu"
                                : "Tiếp tục xử lý"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <SupportRequestModal
        request={selectedRequest}
        roomName={`Phòng ${selectedRequest?.roomId ?? ""}`}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

export default SupportHistoryPage;
