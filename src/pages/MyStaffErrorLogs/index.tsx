import {
  StaffErrorLogStatus,
  StaffErrorLogType,
} from "@/@types/staffErrorLog";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyStaffErrorLogs } from "@/hooks/use-staff-error-logs";
import { AlertTriangle, BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

const LogTypeBadge = ({ type }: { type: StaffErrorLogType }) =>
  type === StaffErrorLogType.Warning ? (
    <Badge variant="secondary">Cảnh cáo</Badge>
  ) : (
    <Badge variant="destructive">Phạt tiền</Badge>
  );

const StatusBadge = ({ status }: { status: StaffErrorLogStatus }) =>
  status === StaffErrorLogStatus.Active ? (
    <Badge>Đang hiệu lực</Badge>
  ) : (
    <Badge variant="outline">Đã hủy</Badge>
  );

const MyStaffErrorLogsPage = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<{
    type: StaffErrorLogType | "";
    status: StaffErrorLogStatus | "";
    startDate: string;
    endDate: string;
  }>({
    type: (searchParams.get("type") as StaffErrorLogType | null) || "",
    status: (searchParams.get("status") as StaffErrorLogStatus | null) || "",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
  });

  const { data: logs = [], isLoading } = useMyStaffErrorLogs(filters);

  const activeLogs = useMemo(
    () => logs.filter((log) => log.status === StaffErrorLogStatus.Active),
    [logs]
  );
  const activePenaltyAmount = activeLogs.reduce(
    (sum, log) => sum + (log.type === StaffErrorLogType.Penalty ? log.amount : 0),
    0
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Lỗi của tôi"
        description="Xem cảnh cáo/phạt tiền đã được admin ghi nhận"
        icon={BellRing}
      />

      {activeLogs.length > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-warning">
              <AlertTriangle className="size-4" />
              Thông báo lỗi đang hiệu lực
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-foreground">
            Bạn đang có <strong>{activeLogs.length}</strong> log lỗi đang hiệu lực
            {activePenaltyAmount > 0 && (
              <>
                , tổng tiền phạt <strong>{money(activePenaltyAmount)}</strong>
              </>
            )}
            . Vui lòng liên hệ admin nếu cần đối soát.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div>
            <Label>Loại</Label>
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  type: event.target.value as StaffErrorLogType | "",
                }))
              }
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Tất cả</option>
              <option value={StaffErrorLogType.Warning}>Cảnh cáo</option>
              <option value={StaffErrorLogType.Penalty}>Phạt tiền</option>
            </select>
          </div>
          <div>
            <Label>Trạng thái</Label>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value as StaffErrorLogStatus | "",
                }))
              }
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Tất cả</option>
              <option value={StaffErrorLogStatus.Active}>Đang hiệu lực</option>
              <option value={StaffErrorLogStatus.Cancelled}>Đã hủy</option>
            </select>
          </div>
          <div>
            <Label>Từ ngày</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, startDate: event.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label>Đến ngày</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, endDate: event.target.value }))
              }
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Lỗi</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Ngày xảy ra</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Người ghi nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Chưa có log lỗi nào
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      <LogTypeBadge type={log.type} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.presetName || log.title}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate" title={log.note}>
                      {log.note}
                    </TableCell>
                    <TableCell>
                      {log.type === StaffErrorLogType.Penalty ? money(log.amount) : "-"}
                    </TableCell>
                    <TableCell>{formatDateTime(log.occurredAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell>{log.createdByName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStaffErrorLogsPage;
