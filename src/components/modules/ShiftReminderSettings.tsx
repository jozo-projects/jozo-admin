import { useState } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  shiftReminderApis,
  isDays,
  isFrequency,
  isMonday,
  isMonth,
  type ReminderConfig,
  type ReminderPeriod,
} from "@/apis/shift-reminder.apis";
import { useIsAdmin } from "@/hooks/usePermission";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
export function weekStartForDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}

function weekLabel(start: string): string {
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const format = (value: string) => value.split("-").reverse().join("/");
  return `${format(start)} – ${format(end.toISOString().slice(0, 10))}`;
}
function shiftWeek(start: string, weeks: number): string {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}
function currentWeek(): string {
  const now = new Date();
  const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  return weekStartForDate(localDate);
}
const weekdays = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];
const frequencyOptions = [
  ["15", "Mỗi 15 phút"],
  ["30", "Mỗi 30 phút"],
  ["60", "Mỗi 1 giờ"],
  ["180", "Mỗi 3 giờ"],
  ["360", "Mỗi 6 giờ"],
  ["720", "Mỗi 12 giờ"],
  ["1440", "Mỗi 1 ngày"],
  ["2880", "Mỗi 2 ngày"],
  ["10080", "Mỗi 1 tuần"],
];

function ConfigForm({ config }: { config: ReminderConfig }) {
  const client = useQueryClient();
  const [enabled, setEnabled] = useState(config.enabled);
  const [period, setPeriod] = useState<ReminderPeriod>(config.period ?? "week");
  const [monthlyDay, setMonthlyDay] = useState(
    String(config.monthlyDeadlineDay ?? 1),
  );
  const [days, setDays] = useState(String(config.requiredDays));
  const [day, setDay] = useState(String(config.deadlineDay));
  const [time, setTime] = useState(config.deadlineTime);
  const [frequency, setFrequency] = useState(String(config.frequencyMinutes));
  const [frequencyMode, setFrequencyMode] = useState(() =>
    frequencyOptions.some(
      ([value]) => value === String(config.frequencyMinutes),
    )
      ? String(config.frequencyMinutes)
      : "custom",
  );
  const mutation = useMutation({
    mutationKey: ["shift-reminder-config-save"],
    mutationFn: shiftReminderApis.saveConfig,
    onSuccess: (data) => {
      client.setQueryData(["shift-reminder-config"], data);
      void client.invalidateQueries({ queryKey: ["shift-reminder-progress"] });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ["shift-reminder-config"] });
    },
  });
  const valid =
    isDays(days, period) &&
    (period === "week" ||
      (/^\d+$/.test(monthlyDay) &&
        Number(monthlyDay) >= 1 &&
        Number(monthlyDay) <= 31)) &&
    isFrequency(frequency) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid)
          mutation.mutate({
            enabled,
            period,
            requiredDays: Number(days),
            deadlineDay: Number(day),
            deadlineTime: time,
            frequencyMinutes: Number(frequency),
            ...(period === "month"
              ? { monthlyDeadlineDay: Number(monthlyDay) }
              : {}),
          });
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={mutation.isPending}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Bật cấu hình nhắc đăng ký ca
        </label>
        <label className="space-y-1 text-sm block">
          <span>Chu kỳ</span>
          <select
            className={inputClass}
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReminderPeriod)}
          >
            <option value="week">Theo tuần</option>
            <option value="month">Theo tháng</option>
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>
              Số ngày yêu cầu mỗi{" "}
              {period === "week" ? "tuần (0–7)" : "tháng (0–31)"}
            </span>
            <Input
              type="number"
              min="0"
              max={period === "week" ? 7 : 31}
              step="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>
          {period === "week" ? (
            <label className="space-y-1 text-sm">
              <span>Ngày hạn trong tuần trước</span>
              <select
                className={inputClass}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {weekdays.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1 text-sm">
              <span>Ngày hạn trong tháng trước (1–31)</span>
              <Input
                type="number"
                min="1"
                max="31"
                step="1"
                value={monthlyDay}
                onChange={(e) => setMonthlyDay(e.target.value)}
              />
            </label>
          )}
          <label className="space-y-1 text-sm">
            <span>Giờ hạn</span>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <div className="space-y-1 text-sm">
            <label className="block" htmlFor="shift-reminder-frequency">
              Nhắc lại
            </label>
            <select
              id="shift-reminder-frequency"
              className={inputClass}
              value={frequencyMode}
              onChange={(e) => {
                setFrequencyMode(e.target.value);
                if (e.target.value !== "custom") setFrequency(e.target.value);
              }}
            >
              {frequencyOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="custom">Tùy chỉnh</option>
            </select>
            {frequencyMode === "custom" && (
              <Input
                aria-label="Số phút tùy chỉnh"
                type="number"
                min="1"
                max="10080"
                step="1"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              />
            )}
            {frequencyMode === "custom" && (
              <p className="text-muted-foreground">
                Nhập số phút từ 1 đến 10.080.
              </p>
            )}
          </div>
        </div>
        {period === "month" && (
          <p className="text-sm text-muted-foreground">
            Nếu tháng trước không có ngày này, hạn là ngày cuối tháng.
          </p>
        )}
        <Button type="submit" disabled={!valid || mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </fieldset>
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          Đã lưu cấu hình.
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          Không thể xác nhận cập nhật. Tải lại và kiểm tra trạng thái trước khi
          thử lại.
        </p>
      )}
    </form>
  );
}

function OverrideEditor({
  userId,
  week,
  period,
  config,
  busy,
}: {
  userId: string;
  week: string;
  period: ReminderPeriod;
  config: ReminderConfig | undefined;
  busy: boolean;
}) {
  const client = useQueryClient();
  const key = ["shift-reminder-override", userId, period, week];
  const [draft, setDraft] = useState<string | null>(null);
  const query = useQuery({
    queryKey: key,
    queryFn: () => shiftReminderApis.getOverride(userId, week, period),
  });
  const mutation = useMutation({
    mutationKey: ["shift-reminder-override-save"],
    mutationFn: async (value: number | null) => {
      const latest = await shiftReminderApis.getConfig();
      if (!config || (latest.period ?? "week") !== period || latest.requiredDays !== config.requiredDays) {
        client.setQueryData(["shift-reminder-config"], latest);
        throw new Error("Configuration changed");
      }
      if (value === null)
        await shiftReminderApis.deleteOverride(userId, week, period);
      else await shiftReminderApis.saveOverride(userId, week, value, period);
    },
    onSuccess: async () => {
      setDraft(null);
      await client.invalidateQueries({ queryKey: key });
      await client.invalidateQueries({ queryKey: ["shift-reminder-progress"] });
    },
    onError: () => {
      setDraft(null);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["shift-reminder-config"] });
    },
  });
  if (query.isLoading) return <p>Đang tải ngoại lệ...</p>;
  if (query.isError || !query.data)
    return (
      <div>
        <p role="alert">Không tải được ngoại lệ.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  const existing =
    "requiredDays" in query.data ? query.data.requiredDays : null;
  const matches = !!config && (config.period ?? "week") === period;
  const general = matches ? config.requiredDays : null;
  const value = draft ?? (general === null || existing === null || existing > general ? "" : String(general - existing));
  const valid = general !== null && isDays(value, period) && Number(value) <= general;
  const disabled = busy || mutation.isPending || query.isFetching;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        {existing === null
          ? "Chưa có ngoại lệ; áp dụng số ngày chung."
          : `Ngoại lệ hiện tại: ${existing} ngày.`}
      </p>
      {!matches && <p role="alert">Kỳ đã chọn khác chu kỳ cấu hình đã lưu hoặc cấu hình chưa tải được; không thể quy đổi số ngày giảm.</p>}
      {general !== null && <p className="text-sm">Mức chung đã lưu: {general} ngày. Mức riêng là số ngày cố định tại lúc lưu; thay đổi mức chung không tự cập nhật ngoại lệ.</p>}
      {general !== null && existing !== null && existing > general && <p role="alert">Mức riêng hiện tại cao hơn mức chung; không thể biểu diễn bằng số ngày giảm. Nhập mức giảm mới hoặc xóa ngoại lệ.</p>}
      {valid && <p className="text-sm">{general} − {Number(value)} = {general - Number(value)} ngày phải đăng ký</p>}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !disabled) mutation.mutate(general - Number(value));
        }}
      >
        <label className="space-y-1 text-sm">
          <span>Số ngày được giảm (0–{general ?? "?"})</span>
          <Input
            disabled={disabled || !matches}
            type="number"
            min="0"
            max={general ?? 0}
            step="1"
            value={value}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <Button
          type="submit"
          disabled={
            !valid || disabled
          }
        >
          Lưu ngoại lệ
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={existing === null || disabled || !matches}
          onClick={() => mutation.mutate(null)}
        >
          Xóa ngoại lệ
        </Button>
      </form>
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          Đã cập nhật ngoại lệ.
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          Không thể xác nhận cập nhật. Kiểm tra trạng thái trước khi thử lại.
        </p>
      )}
    </div>
  );
}

export function EmployeeShiftOverride({ userId }: { userId: string }) {
  const [selected, setSelected] = useState("");
  const [week, setWeek] = useState(() => shiftWeek(currentWeek(), 1));
  const [period, setPeriod] = useState<ReminderPeriod>("week");
  const date = period === "month" ? `${selected}-01` : week;
  const validDate = period === "month" ? isMonth(date) : isMonday(date);
  const config = useQuery({ queryKey: ["shift-reminder-config"], queryFn: shiftReminderApis.getConfig });
  const savingConfig = useIsMutating({ mutationKey: ["shift-reminder-config-save"] }) > 0;
  const savingOverride = useIsMutating({ mutationKey: ["shift-reminder-override-save"] }) > 0;
  return <div className="space-y-3 border-t pt-4">
    <p className="text-sm text-muted-foreground">Ngoại lệ chỉ áp dụng cho nhân viên này và kỳ được chọn.</p>
    {config.isLoading ? <p>Đang tải cấu hình...</p> : config.isError ? <div><p role="alert">Không tải được cấu hình.</p><Button variant="outline" onClick={() => void config.refetch()}>Thử lại</Button></div> : null}
    <label className="space-y-1 text-sm block"><span>Chu kỳ ngoại lệ</span>
      <select className={inputClass} value={period} disabled={savingOverride} onChange={e => { setPeriod(e.target.value as ReminderPeriod); setSelected(""); }}>
        <option value="week">Theo tuần</option><option value="month">Theo tháng</option>
      </select>
    </label>
    {period === "week" ? <div className="space-y-2 text-sm">
      <p>Tuần áp dụng (thứ Hai – Chủ nhật)</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={savingOverride} onClick={() => setWeek(currentWeek())}>Tuần này</Button>
        <Button type="button" variant="outline" disabled={savingOverride} onClick={() => setWeek(shiftWeek(currentWeek(), 1))}>Tuần tới</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" aria-label="Tuần trước" disabled={savingOverride} onClick={() => setWeek(shiftWeek(week, -1))}>‹</Button>
        <p className="text-center font-medium" aria-live="polite">{weekLabel(week)}</p>
        <Button type="button" variant="outline" aria-label="Tuần tiếp theo" disabled={savingOverride} onClick={() => setWeek(shiftWeek(week, 1))}>›</Button>
      </div>
      <p className="text-muted-foreground">Dùng mũi tên để chọn tuần khác.</p>
    </div> : <label className="space-y-1 text-sm block"><span>Tháng áp dụng</span>
      <Input type="month" value={selected} disabled={savingOverride} onChange={e => setSelected(e.target.value)} />
    </label>}
    {period === "month" && selected && !validDate && <p role="alert">Vui lòng chọn tháng hợp lệ.</p>}
    {validDate && <OverrideEditor key={`${userId}:${period}:${date}:${config.data?.period ?? "week"}:${config.data?.requiredDays ?? "unknown"}`} userId={userId} week={date} period={period} config={config.isError || config.isLoading ? undefined : config.data} busy={savingConfig || config.isFetching || config.isError} />}
  </div>;
}

function SettingsContent() {
  const config = useQuery({
    queryKey: ["shift-reminder-config"],
    queryFn: shiftReminderApis.getConfig,
  });
  const savingOverride = useIsMutating({ mutationKey: ["shift-reminder-override-save"] }) > 0;
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Nhắc đăng ký ca</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Nhắc cho tuần hoặc tháng sau được thử trong kỳ hiện tại theo tần suất
          tính từ hạn. Không gửi bù khi bỏ lỡ; không đảm bảo thông báo được tạo.
        </p>
        {config.isLoading ? (
          <p>Đang tải cấu hình...</p>
        ) : config.isError || !config.data ? (
          <div>
            <p role="alert">Không tải được cấu hình.</p>
            <Button variant="outline" onClick={() => void config.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <fieldset disabled={savingOverride || config.isFetching}><ConfigForm key={JSON.stringify(config.data)} config={config.data} /></fieldset>
        )}
        <p className="text-sm text-muted-foreground">Quản lý ngoại lệ theo từng nhân viên tại Quản lý Admin/Staff.</p>
      </CardContent>
    </Card>
  );
}

export default function ShiftReminderSettings() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <SettingsContent /> : null;
}
