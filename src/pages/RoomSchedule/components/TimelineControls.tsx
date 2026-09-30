import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import dayjs, { Dayjs } from "dayjs";
import {
  ChevronLeft,
  ChevronRight,
  CircleXIcon,
  LocateFixed,
} from "lucide-react";
import React, { useId } from "react";
import {
  TIMELINE_ZOOM_OPTIONS,
  TimelineZoom,
  getDefaultBusinessDate,
} from "../utils/timelineHours";

const LEGEND_ITEMS = [
  { label: "Booked (admin)", className: "bg-blue-500" },
  { label: "Booked (online)", className: "bg-orange-500" },
  { label: "Locked", className: "bg-orange-500" },
  { label: "In use", className: "bg-green-500" },
  { label: "Quá hạn / đã qua", className: "bg-green-700" },
  { label: "Maintenance", className: "bg-gray-500" },
] as const;

interface TimelineControlsProps {
  date: Dayjs;
  onDateChange: (date: Dayjs) => void;
  zoom: TimelineZoom;
  onZoomChange: (zoom: TimelineZoom) => void;
  autoScrollEnabled: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  onGoToNow: () => void;
  isBusinessToday: boolean;
  dateLabel?: string;
  extraActions?: React.ReactNode;
  className?: string;
}

const TimelineControls: React.FC<TimelineControlsProps> = ({
  date,
  onDateChange,
  zoom,
  onZoomChange,
  autoScrollEnabled,
  onAutoScrollChange,
  onGoToNow,
  isBusinessToday,
  dateLabel = "Chọn ngày",
  extraActions,
  className,
}) => {
  const autoScrollId = useId();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Ngày trước"
            onClick={() => onDateChange(date.subtract(1, "day"))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover modal={true}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[168px] justify-start pl-3 text-left font-normal"
              >
                {date.format("DD/MM/YYYY")}
                <CircleXIcon
                  className="ml-auto h-4 w-4 opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateChange(getDefaultBusinessDate());
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date.toDate()}
                onSelect={(newDate) => newDate && onDateChange(dayjs(newDate))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Ngày sau"
            onClick={() => onDateChange(date.add(1, "day"))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isBusinessToday ? "secondary" : "outline"}
            onClick={() => onDateChange(getDefaultBusinessDate())}
          >
            Hôm nay
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isBusinessToday}
            onClick={onGoToNow}
            className="gap-1.5"
          >
            <LocateFixed className="h-4 w-4" />
            Về hiện tại
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Ca 03:00 → 03:00(+1)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border bg-white p-1">
            {TIMELINE_ZOOM_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={zoom === option.value ? "default" : "ghost"}
                className="h-7 px-2.5"
                onClick={() => onZoomChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={autoScrollEnabled}
              onCheckedChange={onAutoScrollChange}
              id={autoScrollId}
            />
            <label htmlFor={autoScrollId} className="cursor-pointer">
              Auto-scroll
            </label>
          </div>
          {extraActions}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{dateLabel}</span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className={cn("inline-block h-2.5 w-2.5 rounded-sm", item.className)}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
        <span className="text-amber-700">Nhãn (+1) = sáng hôm sau</span>
      </div>
    </div>
  );
};

export default TimelineControls;
