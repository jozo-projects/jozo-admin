import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { GiftAppliedBillsFilters } from "../constants";

interface GiftAppliedBillsFiltersProps {
  filters: GiftAppliedBillsFilters;
  onChange: (next: Partial<GiftAppliedBillsFilters>) => void;
}

const renderDatePicker = (
  label: string,
  value: string,
  onChange: (value: string) => void,
  disabled?: (date: Date) => boolean,
) => {
  const selectedDate = value ? dayjs(value, "YYYY-MM-DD").toDate() : undefined;

  return (
    <div className="flex w-[200px] flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
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
            disabled={disabled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const GiftAppliedBillsFilters = ({
  filters,
  onChange,
}: GiftAppliedBillsFiltersProps) => {
  const handleStartDateChange = (value: string) => {
    onChange({
      startDate: value,
      ...(filters.endDate && value > filters.endDate
        ? { endDate: value }
        : {}),
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      {renderDatePicker("Từ ngày", filters.startDate, handleStartDateChange)}
      {renderDatePicker(
        "Đến ngày",
        filters.endDate,
        (value) => onChange({ endDate: value }),
        filters.startDate
          ? (date) => dayjs(date).isBefore(dayjs(filters.startDate), "day")
          : undefined,
      )}

      <div className="flex w-[180px] flex-col gap-2">
        <label className="text-sm font-medium">Loại</label>
        <Select
          value={filters.kind}
          onValueChange={(value) =>
            onChange({ kind: value as GiftAppliedBillsFilters["kind"] })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="fnb">F&B</SelectItem>
            <SelectItem value="discount">Giảm giá</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-[180px] flex-col gap-2">
        <label className="text-sm font-medium">Nguồn ưu đãi</label>
        <Select
          value={filters.source}
          onValueChange={(value) =>
            onChange({ source: value as GiftAppliedBillsFilters["source"] })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="gift">Quà tặng</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[240px] flex-1 flex-col gap-2">
        <label className="text-sm font-medium">Tìm kiếm</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Mã bill, tên hoặc SĐT member"
            className="h-9 pl-9"
          />
        </div>
      </div>
    </div>
  );
};

export default GiftAppliedBillsFilters;
