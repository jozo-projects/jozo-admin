import { useState } from "react";
import { vi } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import dayjs from "@/lib/dayjs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  fixedRevenueRange, revenueRangeLabel, VN_TZ,
  DEFAULT_REVENUE_SETTINGS, type RevenueSettings, type RevenuePeriod, type RevenueRange,
} from "@/utils/revenuePeriod";

const labels: Record<RevenuePeriod, string> = {
  daily: "Ngày", weekly: "Tuần", monthly: "Tháng", quarterly: "Quý", custom: "Tùy chọn",
};
const localDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const vn = (iso: string) => dayjs(iso).tz(VN_TZ);

function CustomRange({ range, onApply }: {
  range: RevenueRange;
  onApply: (range: RevenueRange) => void;
}) {
  const [start, setStart] = useState(() => vn(range.start).format("YYYY-MM-DDTHH:mm"));
  const [end, setEnd] = useState(() => vn(range.end).format("YYYY-MM-DDTHH:mm"));
  const parse = (value: string) => {
    if (!value) return null;
    try {
      const parsed = dayjs.tz(value, VN_TZ);
      return parsed.isValid() && parsed.format("YYYY-MM-DDTHH:mm") === value ? parsed : null;
    } catch {
      return null;
    }
  };
  const parsedStart = parse(start), parsedEnd = parse(end);
  const valid = !!parsedStart && !!parsedEnd && parsedEnd.valueOf() > parsedStart.valueOf();
  return (
    <form className="space-y-2" onSubmit={(event) => {
      event.preventDefault();
      if (parsedStart && parsedEnd && valid) {
        onApply({ start: parsedStart.toISOString(), end: parsedEnd.toISOString() });
      }
    }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="space-y-1 text-sm">
          <span>Từ</span>
          <Input type="datetime-local" aria-label="Bắt đầu (giờ VN)" value={start}
            onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span>Đến</span>
          <Input type="datetime-local" aria-label="Kết thúc (giờ VN)" value={end}
            onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <Button type="submit" disabled={!valid}>Áp dụng</Button>
      </div>
      {!valid && <p role="alert" className="text-sm text-destructive">Kết thúc phải sau bắt đầu; vui lòng nhập đủ ngày và giờ hợp lệ.</p>}
    </form>
  );
}

export function RevenuePeriodSelector({ period, date, range, isStaff, onPeriod, onDate, onCustom, settings = DEFAULT_REVENUE_SETTINGS }: {
  settings?: RevenueSettings;
  period: RevenuePeriod;
  date: string;
  range: RevenueRange;
  isStaff: boolean;
  onPeriod: (period: RevenuePeriod) => void;
  onDate: (date: string) => void;
  onCustom: (range: RevenueRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const periodStart = vn(range.start);
  const periodEndDay = vn(range.end).subtract(1, "day");
  const move = (direction: number) => {
    if (period === "custom") return;
    const unit = period === "daily" || period === "weekly" ? "day" : "month";
    const amount = period === "weekly" ? 7 : period === "quarterly" ? 3 : 1;
    onDate(periodStart.add(amount * direction, unit).format("YYYY-MM-DD"));
  };
  const chooseDay = (day: Date) => {
    onDate(dayjs(day).format("YYYY-MM-DD"));
    setOpen(false);
  };
  const week = fixedRevenueRange("weekly", date, settings);
  const cutoff = String(settings.monthStartDay).padStart(2, "0");
  const pickerLabel = period === "daily" ? "Chọn ngày" : period === "weekly" ? "Chọn tuần" : period === "monthly" ? "Chọn tháng" : "Chọn quý";
  const title = period === "daily" ? periodStart.format("DD/MM/YYYY")
    : period === "weekly" ? `${periodStart.format("DD/MM")} – ${periodEndDay.format("DD/MM/YYYY")}`
    : period === "monthly" ? `Tháng ${periodStart.format("MM/YYYY")}`
    : `Quý ${Math.floor(periodStart.month() / 3) + 1}/${periodStart.year()}`;
  return (
    <section aria-label="Chọn kỳ doanh thu" className="space-y-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {!isStaff && <div className="flex max-w-full flex-wrap gap-1 self-start rounded-lg bg-muted p-1" role="group" aria-label="Loại kỳ">
          {(Object.keys(labels) as RevenuePeriod[]).map((key) => (
            <Button key={key} size="sm" variant={period === key ? "default" : "ghost"}
              aria-pressed={period === key} onClick={() => { setOpen(false); onPeriod(key); }}>
              {labels[key]}
            </Button>
          ))}
        </div>}
        {period !== "custom" && <div className="inline-flex items-center self-start rounded-md border">
          <Button size="icon" variant="ghost" aria-label="Kỳ trước" title="Kỳ trước" onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" aria-label={pickerLabel} className="gap-2 px-2 font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />{title}<ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={period === "daily" || period === "weekly" ? "w-auto p-0" : "w-64 space-y-3 p-3"} align="end">
              {period === "weekly" ? <Calendar mode="range" locale={vi} weekStartsOn={1} defaultMonth={localDate(date)}
                selected={{ from: localDate(vn(week.start).format("YYYY-MM-DD")), to: localDate(vn(week.end).subtract(1, "day").format("YYYY-MM-DD")) }}
                onDayClick={chooseDay} initialFocus />
                : period === "daily" ? <Calendar mode="single" locale={vi} weekStartsOn={1}
                  selected={localDate(date)} defaultMonth={localDate(date)} onSelect={(day) => day && chooseDay(day)} initialFocus />
                : period === "monthly" ? <label className="block space-y-1 text-sm">
                  <span>Tháng</span><Input type="month" aria-label="Chọn tháng" value={periodStart.format("YYYY-MM")}
                    onChange={(e) => { if (e.target.value) onDate(`${e.target.value}-${cutoff}`); }} />
                </label>
                : <div className="flex gap-2">
                  <Select value={String(Math.floor(periodStart.month() / 3) + 1)} onValueChange={(value) =>
                    onDate(`${periodStart.year()}-${String((Number(value) - 1) * 3 + 1).padStart(2, "0")}-${cutoff}`)}>
                    <SelectTrigger className="w-28" aria-label="Quý"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>Quý {q}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-24" type="text" inputMode="numeric" aria-label="Năm của quý"
                    key={periodStart.year()} defaultValue={periodStart.format("YYYY")}
                    onChange={(e) => { if (/^\d{4}$/.test(e.target.value) && Number(e.target.value) >= 1000) onDate(`${e.target.value}-${periodStart.format("MM")}-${cutoff}`); }}
                    onBlur={(e) => { e.target.value = periodStart.format("YYYY"); }} />
                </div>}
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="ghost" aria-label="Kỳ sau" title="Kỳ sau" onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>}
      </div>
      {period === "custom" && <CustomRange range={range} onApply={onCustom} />}
      <p className="text-xs text-muted-foreground" aria-live="polite">{revenueRangeLabel(range)} · Giờ VN</p>
    </section>
  );
}
