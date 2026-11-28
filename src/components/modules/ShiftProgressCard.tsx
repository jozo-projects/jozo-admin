import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import useAuth from "@/hooks/useAuth";
import PATHS from "@/constants/paths";
import http from "@/utils/http";
import { Card } from "@/components/ui/card";
import type { PersonalProgress } from "./shift-registration-progress";

export async function fetchPersonalProgress(
  week: string,
  month: string,
): Promise<PersonalProgress> {
  const request = (params: { week: string } | { month: string }) =>
    http.get<Omit<PersonalProgress, "activePeriod"> & { error?: string }>(
      "/shift-reminders/me/progress",
      {
        params,
        skipErrorToast: true,
        timeout: 5000,
        validateStatus: (status) =>
          (status >= 200 && status < 300) || status === 400,
      },
    );
  const weekly = await request({ week });
  if (!weekly.data.error) return { ...weekly.data, activePeriod: "week" };
  if (weekly.data.error !== "PERIOD_MISMATCH")
    throw new Error("PROGRESS_UNAVAILABLE");
  const monthly = await request({ month });
  if (monthly.data.error) throw new Error("PROGRESS_UNAVAILABLE");
  return { ...monthly.data, activePeriod: "month" };
}

// Vietnam is UTC+7, with no daylight-saving transitions.
export function nextVietnamWeek(now = new Date()): string {
  const vietnamDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = vietnamDate.getUTCDay();
  const monday = new Date(
    Date.UTC(
      vietnamDate.getUTCFullYear(),
      vietnamDate.getUTCMonth(),
      vietnamDate.getUTCDate() + (day === 0 ? 1 : 8 - day),
    ),
  );
  return monday.toISOString().slice(0, 10);
}
export function nextVietnamMonth(now = new Date()): string {
  const vietnamDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(vietnamDate.getUTCFullYear(), vietnamDate.getUTCMonth() + 1, 1),
  )
    .toISOString()
    .slice(0, 10);
}

export default function ShiftProgressCard({
  calendar = false,
}: { calendar?: boolean }) {
  const { user } = useAuth();
  const [week, setWeek] = useState(nextVietnamWeek);
  const [month, setMonth] = useState(nextVietnamMonth);
  useEffect(() => {
    const refresh = () => {
      setWeek(nextVietnamWeek());
      setMonth(nextVietnamMonth());
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const progress = useQuery({
    queryKey: ["shift-reminder-progress", user?._id, week, month],
    queryFn: () => fetchPersonalProgress(week, month),
    enabled: !!user?._id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const data = progress.data;
  if (
    !calendar &&
    !progress.isError &&
    data?.enabled &&
    data.registeredDays >= data.requiredDays
  )
    return null;
  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div aria-live="polite">
        <h2 className="font-semibold">
          Đăng ký ca{" "}
          {data?.activePeriod === "month"
            ? "tháng tới"
            : data?.activePeriod === "week"
              ? "tuần tới"
              : ""}
        </h2>
        {data && !progress.isError && (
          <p className="text-sm text-muted-foreground">
            {data.activePeriod === "month"
              ? "Tháng từ " + month.split("-").reverse().join("/")
              : "Tuần từ " + week.split("-").reverse().join("/")}{" "}
          </p>
        )}
        {progress.isPending ? (
          <p className="text-sm">Đang tải tiến độ...</p>
        ) : progress.isError ? (
          <p className="text-sm text-destructive">
            Không thể tải tiến độ.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void progress.refetch()}
            >
              Thử lại
            </button>
          </p>
        ) : !data ? (
          <p className="text-sm">Không có dữ liệu tiến độ.</p>
        ) : !data.enabled ? (
          <p className="text-sm">Nhắc đăng ký ca đang tắt.</p>
        ) : (
          <>
            <p className="text-sm">
              Đã đăng ký {data.registeredDays}/{data.requiredDays} ngày.{" "}
              {data.registeredDays >= data.requiredDays
                ? "Đã đủ số ngày yêu cầu."
                : `Còn ${data.requiredDays - data.registeredDays} ngày cần đăng ký.`}
            </p>
            {data.deadline && !Number.isNaN(Date.parse(data.deadline)) && (
              <p className="text-sm">
                Hạn đăng ký:{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(data.deadline))}{" "}
                (giờ Việt Nam)
              </p>
            )}
          </>
        )}
      </div>
      {!calendar && (
        <Link
          to={PATHS.MY_SCHEDULE}
          className="text-sm font-medium text-primary underline"
        >
          Đến lịch làm việc
        </Link>
      )}
    </Card>
  );
}
