import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import React from "react";

/** Date picker shadcn (Calendar + Popover) — value: YYYY-MM-DD */
const ScheduleDatePicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}> = ({ value, onChange, placeholder = "Chọn ngày", id, className }) => {
  const selected = value ? dayjs(value, "YYYY-MM-DD").toDate() : undefined;

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start px-3 text-left text-sm font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          {selected ? dayjs(selected).format("DD/MM/YYYY") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(nextDate) => {
            if (!nextDate) return;
            onChange(dayjs(nextDate).format("YYYY-MM-DD"));
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default ScheduleDatePicker;
