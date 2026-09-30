import dayjs, { toIsoStringWithZeroSubsecond } from "@/lib/dayjs";

interface BuildBillDateTimeFromScheduleParams {
  scheduleStartTime: string | Date;
  selectedStartTime?: string;
  selectedStartDate?: string;
  selectedEndTime?: string;
  selectedEndDate?: string;
  useCurrentTimeForEnd?: boolean;
}

interface BuildBillDateTimeFromScheduleResult {
  actualStartTime: string;
  actualEndTime: string;
  actualStartDate: string;
  suggestedEndDate: string;
  isCrossDay: boolean;
}

const parseHourMinute = (time?: string) => {
  if (!time) return null;

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
};

export const buildBillDateTimeFromSchedule = ({
  scheduleStartTime,
  selectedStartTime,
  selectedStartDate,
  selectedEndTime,
  selectedEndDate,
  useCurrentTimeForEnd = false,
}: BuildBillDateTimeFromScheduleParams): BuildBillDateTimeFromScheduleResult => {
  const scheduleStart = dayjs(scheduleStartTime);
  const startTimeParts = parseHourMinute(selectedStartTime);

  const baseStartDate = selectedStartDate
    ? dayjs(selectedStartDate)
    : dayjs(scheduleStart.format("YYYY-MM-DD"));

  const actualStart = baseStartDate
    .set("hour", startTimeParts?.hour ?? scheduleStart.hour())
    .set("minute", startTimeParts?.minute ?? scheduleStart.minute())
    .set("second", 0)
    .set("millisecond", 0);

  if (useCurrentTimeForEnd) {
    return {
      actualStartTime: toIsoStringWithZeroSubsecond(actualStart),
      actualEndTime: dayjs().toISOString(),
      actualStartDate: actualStart.format("YYYY-MM-DD"),
      suggestedEndDate: actualStart.format("YYYY-MM-DD"),
      isCrossDay: dayjs().isAfter(actualStart, "day"),
    };
  }

  const endTimeParts = parseHourMinute(selectedEndTime) || {
    hour: actualStart.hour(),
    minute: actualStart.minute(),
  };

  const baseEndDate = selectedEndDate
    ? dayjs(selectedEndDate)
    : dayjs(actualStart.format("YYYY-MM-DD"));

  let actualEnd = baseEndDate
    .set("hour", endTimeParts.hour)
    .set("minute", endTimeParts.minute)
    .set("second", 0)
    .set("millisecond", 0);

  if (actualEnd.isBefore(actualStart)) {
    actualEnd = actualEnd.add(1, "day");
  }

  return {
    actualStartTime: toIsoStringWithZeroSubsecond(actualStart),
    actualEndTime: toIsoStringWithZeroSubsecond(actualEnd),
    actualStartDate: actualStart.format("YYYY-MM-DD"),
    suggestedEndDate: actualEnd.format("YYYY-MM-DD"),
    isCrossDay: !actualEnd.isSame(actualStart, "day"),
  };
};
