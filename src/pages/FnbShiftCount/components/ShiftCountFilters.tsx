import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import dayjs from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getFnbBusinessDate } from "../utils";

interface ShiftCountFiltersProps {
  date: string;
  search: string;
  onDateChange: (date: string) => void;
  onSearchChange: (search: string) => void;
}

const ShiftCountFilters = ({
  date,
  search,
  onDateChange,
  onSearchChange,
}: ShiftCountFiltersProps) => {
  const selectedDate = date ? dayjs(date, "YYYY-MM-DD").toDate() : undefined;
  const businessDateToday = getFnbBusinessDate();

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex w-[200px] flex-col gap-2">
        <label className="text-sm font-medium">Ngày kiểm kê</label>
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
                  onDateChange(dayjs(nextDate).format("YYYY-MM-DD"));
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <label className="text-sm font-medium">Tìm món</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nhập tên món..."
            className="h-9 pl-9"
          />
        </div>
      </div>

      {date !== businessDateToday && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => onDateChange(businessDateToday)}
        >
          Về ngày hiện tại
        </Button>
      )}
    </div>
  );
};

export default ShiftCountFilters;
