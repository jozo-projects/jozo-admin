import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IFnbShiftCountResponse } from "@/apis/fnbShiftCount.apis";
import dayjs from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ShiftCountHistoryTableProps {
  records: IFnbShiftCountResponse[];
  total: number;
  page: number;
  limit: number;
  isLoading?: boolean;
  historyFrom: string;
  historyTo: string;
  onHistoryFromChange: (value: string) => void;
  onHistoryToChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onViewRecord: (record: IFnbShiftCountResponse) => void;
}

const ShiftCountHistoryTable = ({
  records,
  total,
  page,
  limit,
  isLoading,
  historyFrom,
  historyTo,
  onHistoryFromChange,
  onHistoryToChange,
  onPageChange,
  onViewRecord,
}: ShiftCountHistoryTableProps) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const renderDatePicker = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => {
    const selectedDate = value ? dayjs(value, "YYYY-MM-DD").toDate() : undefined;

    return (
      <div className="flex w-[200px] flex-col gap-2">
        <label className="text-sm font-medium">{label}</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground",
              )}
            >
              <Calendar className="mr-2 h-4 w-4 shrink-0" />
              {selectedDate ? (
                format(selectedDate, "dd/MM/yyyy", { locale: vi })
              ) : (
                <span>Chọn ngày</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(nextDate) => {
                if (nextDate) {
                  onChange(dayjs(nextDate).format("YYYY-MM-DD"));
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {renderDatePicker("Từ ngày", historyFrom, onHistoryFromChange)}
        {renderDatePicker("Đến ngày", historyTo, onHistoryToChange)}
      </div>

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-md border">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead className="text-center">Món hụt</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      Không có bản ghi kiểm kê trong khoảng thời gian này.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.businessDate}>
                      <TableCell className="font-medium">
                        {dayjs(record.businessDate).format("DD/MM/YYYY")}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center font-semibold",
                          (record.summary?.shortageCount ?? 0) > 0 && "text-destructive",
                        )}
                      >
                        {record.summary?.shortageCount ?? 0}
                      </TableCell>
                      <TableCell>
                        {record.editable ? "Có thể sửa" : "Chỉ xem"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewRecord(record)}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Trang {page}/{totalPages} · {total} ngày
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShiftCountHistoryTable;
