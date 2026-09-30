import dayjs, { Dayjs } from "dayjs";
import { IRoomSchedule } from "@/@types/Room";

/**
 * Ranh giới ngày kinh doanh: shop đóng lúc 03:00 sáng.
 * Timeline bắt đầu 03:00 ngày đang chọn...
 */
export const DAY_START_HOUR = 3;
/**
 * ...và kết thúc 03:00 ngày lịch tiếp theo (đúng 24 giờ, một ca trọn vẹn).
 */
export const DAY_END_HOUR = 27;
export const TIMELINE_MINUTE_SPAN = (DAY_END_HOUR - DAY_START_HOUR) * 60;
export const TIMELINE_LEFT_OFFSET = 240;

/** Zoom: mật độ ngang (px / giờ). */
export type TimelineZoom = 15 | 30 | 60;

export const TIMELINE_ZOOM_OPTIONS: {
  value: TimelineZoom;
  label: string;
  pxPerHour: number;
}[] = [
  { value: 60, label: "60p", pxPerHour: 72 },
  { value: 30, label: "30p", pxPerHour: 120 },
  { value: 15, label: "15p", pxPerHour: 180 },
];

export const DEFAULT_TIMELINE_ZOOM: TimelineZoom = 30;

export const getZoomPxPerHour = (zoom: TimelineZoom) =>
  TIMELINE_ZOOM_OPTIONS.find((option) => option.value === zoom)?.pxPerHour ??
  120;

export const getTimelineScale = (zoom: TimelineZoom) =>
  getZoomPxPerHour(zoom) / 60;

export const getTimelineContentWidth = (zoom: TimelineZoom) =>
  getZoomPxPerHour(zoom) * (DAY_END_HOUR - DAY_START_HOUR);

export const getTimelineTotalWidth = (zoom: TimelineZoom) =>
  TIMELINE_LEFT_OFFSET + getTimelineContentWidth(zoom);

/** @deprecated Prefer getTimelineScale(zoom) — kept for gradual migration. */
export const HOUR_MARKER_SPACING = 120;
/** @deprecated Prefer getTimelineScale(zoom) */
export const SCALE = HOUR_MARKER_SPACING / 60;
/** @deprecated Prefer getTimelineTotalWidth(zoom) */
export const TIMELINE_WIDTH =
  HOUR_MARKER_SPACING * (DAY_END_HOUR - DAY_START_HOUR) + TIMELINE_LEFT_OFFSET;

export const getTimelineDayStart = (viewDate: Dayjs) =>
  viewDate
    .startOf("day")
    .hour(DAY_START_HOUR)
    .minute(0)
    .second(0)
    .millisecond(0);

export const getTimelineDayEnd = (viewDate: Dayjs) =>
  getTimelineDayStart(viewDate).add(DAY_END_HOUR - DAY_START_HOUR, "hour");

/** End time thực tế để vẽ schedule đã finish trên timeline. */
export const getScheduleTimelineEnd = (
  schedule: Pick<IRoomSchedule, "status" | "endTime" | "actualEndTime">,
  fallback: Dayjs,
) => {
  const status = schedule.status.toLowerCase();
  if ((status === "finished" || status === "completed") && schedule.actualEndTime) {
    return dayjs(schedule.actualEndTime);
  }
  return schedule.endTime ? dayjs(schedule.endTime) : fallback;
};

/** Nhãn giờ: 3:00…23:00, rồi 0(+1)…3(+1). */
export const formatTimelineHourLabel = (hour: number) => {
  const displayHour = ((hour % 24) + 24) % 24;
  if (hour >= 24) {
    return `${displayHour}(+1)`;
  }
  return `${displayHour}:00`;
};

/**
 * Trước 03:00 sáng vẫn thuộc ca ngày hôm trước.
 */
export const getDefaultBusinessDate = (now: Dayjs = dayjs()) => {
  const overnightEndHour = DAY_END_HOUR - 24;
  if (DAY_END_HOUR > 24 && now.hour() < overnightEndHour) {
    return now.subtract(1, "day").startOf("day");
  }
  return now.startOf("day");
};

export const getTimelineNowMarker = (
  viewDate: Dayjs,
  now: Dayjs,
  options?: { leftOffset?: number; scale?: number },
) => {
  const leftOffset = options?.leftOffset ?? TIMELINE_LEFT_OFFSET;
  const scale = options?.scale ?? SCALE;
  const dayStart = getTimelineDayStart(viewDate);
  const dayEnd = getTimelineDayEnd(viewDate);
  const isToday = !now.isBefore(dayStart) && now.isBefore(dayEnd);

  let markerLeft = 0;
  if (isToday) {
    const totalMinutes = Math.min(
      Math.max(now.diff(dayStart, "minute"), 0),
      TIMELINE_MINUTE_SPAN,
    );
    markerLeft = leftOffset + totalMinutes * scale;
  }

  return { isToday, markerLeft };
};

export const intersectsTimelineWindow = (
  start: Dayjs,
  end: Dayjs,
  viewDate: Dayjs,
) => {
  const windowStart = getTimelineDayStart(viewDate);
  const windowEnd = getTimelineDayEnd(viewDate);
  return start.isBefore(windowEnd) && end.isAfter(windowStart);
};

/** CSS background cho lưới giờ/15 phút — tránh hàng nghìn DOM node. */
export const getTimelineGridBackground = (zoom: TimelineZoom) => {
  const pxPerHour = getZoomPxPerHour(zoom);
  const quarter = pxPerHour / 4;
  return {
    backgroundImage: [
      `repeating-linear-gradient(to right, transparent 0, transparent ${quarter - 1}px, rgb(243 244 246) ${quarter - 1}px, rgb(243 244 246) ${quarter}px)`,
      `repeating-linear-gradient(to right, transparent 0, transparent ${pxPerHour - 1}px, rgb(209 213 219) ${pxPerHour - 1}px, rgb(209 213 219) ${pxPerHour}px)`,
    ].join(", "),
    backgroundSize: `${pxPerHour}px 100%, ${pxPerHour}px 100%`,
  } as const;
};

export type LanePackedItem<T> = {
  item: T;
  lane: number;
  laneCount: number;
  startMin: number;
  endMin: number;
};

/**
 * Greedy lane packing — session chồng giờ được xếp lane riêng, không che nhau.
 */
export const packTimelineLanes = <T,>(
  items: Array<{
    item: T;
    startMin: number;
    endMin: number;
  }>,
): LanePackedItem<T>[] => {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return b.endMin - a.endMin;
  });

  const laneEnds: number[] = [];
  const assigned: Array<{
    item: T;
    lane: number;
    startMin: number;
    endMin: number;
  }> = [];

  for (const entry of sorted) {
    const start = Math.max(0, entry.startMin);
    const end = Math.max(start + 1, entry.endMin);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    assigned.push({ item: entry.item, lane, startMin: start, endMin: end });
  }

  const laneCount = Math.max(1, laneEnds.length);
  return assigned.map((entry) => ({ ...entry, laneCount }));
};

export const ROOM_LANE_HEIGHT = 36;
export const ROOM_LANE_GAP = 4;
export const ROOM_ROW_PADDING_Y = 8;

export const getRoomRowHeight = (laneCount: number) =>
  ROOM_ROW_PADDING_Y * 2 +
  Math.max(1, laneCount) * ROOM_LANE_HEIGHT +
  Math.max(0, laneCount - 1) * ROOM_LANE_GAP;
