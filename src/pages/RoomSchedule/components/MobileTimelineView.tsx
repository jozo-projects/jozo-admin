import { IRoom, IRoomSchedule } from "@/@types/Room";
import dayjs, { Dayjs } from "dayjs";
import React, { useEffect, useState } from "react";
import {
  BellIcon,
  DoorOpen,
  Gamepad2,
  Gift,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoomType } from "@/constants/enum";
import { useIsStaff } from "@/hooks/usePermission";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import {
  getEffectiveScheduleRoomType,
  getRoomTypeLabel as getScheduleRoomTypeLabel,
  getScheduleTimelineLabel,
  normalizeRoomType,
} from "../utils/scheduleRoomType";
import { isRoomUnderMaintenance } from "../utils/roomStatus";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  TIMELINE_MINUTE_SPAN,
  formatTimelineHourLabel,
  getScheduleTimelineEnd,
  getTimelineDayEnd,
  getTimelineDayStart,
  packTimelineLanes,
} from "../utils/timelineHours";

const MOBILE_HOUR_HEIGHT = 60; // Chiều cao mỗi giờ tính bằng pixel
const MOBILE_SCALE = MOBILE_HOUR_HEIGHT / 60; // Scale cho mỗi phút
const MOBILE_TIMELINE_HEIGHT =
  MOBILE_HOUR_HEIGHT * (DAY_END_HOUR - DAY_START_HOUR);

interface GroupedSchedules {
  [roomId: string]: IRoomSchedule[];
}

interface MobileTimelineViewProps {
  roomsData: IRoom[];
  grouped: GroupedSchedules;
  date: Dayjs;
  currentTime: Dayjs;
  isToday: boolean;
  notifications: { [roomId: string]: { message: string; timestamp: number } };
  blinkingRooms: { [key: string]: boolean };
  orderNotifications: {
    [roomId: string]: Array<{
      message: string;
      timestamp: number;
      orderData: any;
    }>;
  };
  orderBlinkingRooms: { [key: string]: boolean };
  giftNotifications?: {
    [roomId: string]: {
      gift: any;
      scheduleId: string;
      timestamp: number;
    };
  };
  giftBlinkingRooms?: { [key: string]: boolean };
  onRoomClick: (roomId: string) => void;
  onScheduleClick: (schedule: IRoomSchedule) => void;
  onResolveRequest: (roomId: string) => void;
  onOrderClick: (roomId: string, orderId: string) => void;
  onGiftClick?: (roomId: string) => void;
}

const getRoomTypeLabel = (type: RoomType | string) => {
  switch (normalizeRoomType(type)) {
    case RoomType.Medium:
      return "Vừa";
    case RoomType.Large:
      return "Lớn";
    case RoomType.Dorm:
      return "Dorm";
    default:
      return "Vừa";
  }
};

const getRoomTypeLeadIcon = (type: RoomType | string) => {
  const className = "h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-slate-500";
  if (normalizeRoomType(type) === RoomType.Dorm) {
    return <Gamepad2 className={className} aria-hidden />;
  }
  return <DoorOpen className={className} aria-hidden />;
};

// Tính toán vị trí và chiều cao cho schedule block trong layout dọc
const getVerticalMarkerStyle = (
  schedule: IRoomSchedule,
  currentTime: Dayjs,
  isToday: boolean,
  viewDate: Dayjs,
) => {
  const eventStart = dayjs(schedule.startTime);
  const dayStart = getTimelineDayStart(viewDate);
  const dayEnd = getTimelineDayEnd(viewDate);
  let offsetMinutes = eventStart.diff(dayStart, "minute");
  if (offsetMinutes < 0) offsetMinutes = 0;

  let durationMinutes = 0;
  const status = schedule.status.toLowerCase();
  if (status === "booked") {
    durationMinutes = schedule.endTime
      ? dayjs(schedule.endTime).diff(eventStart, "minute")
      : 120;
  } else if (status === "locked") {
    durationMinutes = schedule.endTime
      ? dayjs(schedule.endTime).diff(eventStart, "minute")
      : 5;
  } else if (status === "maintenance") {
    durationMinutes = schedule.endTime
      ? dayjs(schedule.endTime).diff(eventStart, "minute")
      : 240;
  } else if (status === "in use") {
    if (schedule.endTime) {
      const eventEnd = dayjs(schedule.endTime);
      durationMinutes = eventEnd.diff(eventStart, "minute");
    } else {
      const now = dayjs();
      const actualEnd = now.isBefore(dayEnd) ? now : dayEnd;
      durationMinutes = actualEnd.diff(eventStart, "minute");
      if (durationMinutes <= 0) durationMinutes = 1;
    }
  } else if (status === "finished" || status === "completed") {
    const eventEnd = getScheduleTimelineEnd(
      schedule,
      eventStart.add(120, "minute"),
    );
    durationMinutes = eventEnd.diff(eventStart, "minute");
  }

  if (offsetMinutes > TIMELINE_MINUTE_SPAN) {
    offsetMinutes = TIMELINE_MINUTE_SPAN;
    durationMinutes = 1;
  }

  durationMinutes = Math.min(
    Math.max(durationMinutes, 1),
    TIMELINE_MINUTE_SPAN - offsetMinutes,
  );

  const top = offsetMinutes * MOBILE_SCALE;
  let height = durationMinutes * MOBILE_SCALE;
  const minHeight = 20; // Chiều cao tối thiểu để có thể nhìn thấy
  if (height < minHeight) height = minHeight;
  if (top + height > MOBILE_TIMELINE_HEIGHT) {
    height = MOBILE_TIMELINE_HEIGHT - top;
  }

  let bgColor = "";
  if (status === "booked") {
    if (schedule.source === "customer") {
      bgColor = "bg-orange-500";
    } else {
      bgColor = "bg-blue-500";
    }
  } else if (status === "locked") {
    bgColor = "bg-orange-500";
  } else if (status === "in use") {
    if (schedule.endTime && dayjs(schedule.endTime).isAfter(currentTime)) {
      bgColor = "bg-green-300";
    } else {
      bgColor = "bg-green-500";
    }
  } else if (status === "maintenance") {
    bgColor = "bg-gray-500";
  } else {
    bgColor = "bg-gray-300";
  }

  // Nếu sự kiện đã hoàn toàn nằm phía trên now marker (đã qua) thì thay đổi màu
  if (isToday) {
    const clampedMinutes = Math.min(
      Math.max(currentTime.diff(dayStart, "minute"), 0),
      TIMELINE_MINUTE_SPAN,
    );
    const markerTop = clampedMinutes * MOBILE_SCALE;

    if (markerTop >= top + height) {
      if (status === "booked") {
        if (schedule.source === "customer") {
          bgColor = "bg-orange-700";
        } else {
          bgColor = "bg-blue-700";
        }
      } else if (status === "locked") {
        bgColor = "bg-orange-700";
      } else if (status === "in use") {
        bgColor = "bg-green-700";
      } else if (status === "maintenance") {
        bgColor = "bg-gray-700";
      } else {
        bgColor = "bg-gray-500";
      }
    }
  }

  return { top, height, bgColor };
};

const MobileTimelineView: React.FC<MobileTimelineViewProps> = ({
  roomsData,
  grouped,
  date,
  currentTime,
  isToday,
  notifications,
  blinkingRooms,
  orderNotifications,
  orderBlinkingRooms,
  giftNotifications = {},
  giftBlinkingRooms = {},
  onRoomClick,
  onScheduleClick,
  onResolveRequest,
  onOrderClick,
  onGiftClick,
}) => {
  const isStaff = useIsStaff();
  // State để cập nhật thời gian real-time
  const [currentTimeState, setCurrentTimeState] = useState(currentTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeState(dayjs());
    }, 60000); // Cập nhật mỗi phút

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4 pb-4 -mx-4 sm:mx-0">
      {roomsData?.map((room) => {
        const roomSchedules = grouped[room._id] || [];
        const hasNotification = notifications[room._id];
        const isBlinking = blinkingRooms[room._id];
        const orderNotificationsForRoom = orderNotifications[room._id] || [];
        const hasOrderNotification = orderNotificationsForRoom.length > 0;
        const isOrderBlinking = orderBlinkingRooms[room._id];
        const hasGiftNotification = giftNotifications[room._id];
        const isGiftBlinking = giftBlinkingRooms[room._id];
        const isMaintenance = isRoomUnderMaintenance(room);

        // Tìm schedule có gift nhưng chưa finished
        const scheduleWithGift = roomSchedules.find((schedule) => {
          const scheduleGift = (schedule as unknown as { gift?: any })?.gift;
          const status = schedule.status?.toLowerCase();
          return (
            scheduleGift &&
            status !== "finished" &&
            status !== "cancelled" &&
            status !== "completed"
          );
        });
        const scheduleGiftInfo = scheduleWithGift
          ? (scheduleWithGift as unknown as { gift?: any })?.gift
          : null;

        // Tìm schedule "in use" để hiển thị thông tin
        const inUseSchedule = roomSchedules.find(
          (s) => s.status.toLowerCase() === "in use"
        );
        let inUseDuration = null;
        if (inUseSchedule) {
          const duration = currentTimeState.diff(
            dayjs(inUseSchedule.startTime),
            "minute"
          );
          if (duration < 60) {
            inUseDuration = `${duration} phút`;
          } else {
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            inUseDuration = `${hours}h${minutes > 0 ? ` ${minutes}p` : ""}`;
          }
        }

        // Tự động mở card nếu có schedule "in use" hoặc có notification
        const shouldDefaultOpen =
          !!inUseSchedule ||
          !!hasNotification ||
          !!hasOrderNotification ||
          !!hasGiftNotification;

        return (
          <Collapsible key={room._id} defaultOpen={shouldDefaultOpen}>
            <Card
              className={`overflow-hidden ${
                isMaintenance ? "border-red-200 bg-red-50/40" : ""
              }`}
            >
              <CollapsibleTrigger className="w-full touch-manipulation">
                <div className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRoomClick(room._id);
                      }}
                      className={`hover:underline active:opacity-70 text-left font-medium text-sm sm:text-base touch-manipulation min-h-[44px] inline-flex items-center gap-1.5 ${
                        isMaintenance ? "text-red-600" : "text-blue-600"
                      } ${
                        isBlinking
                          ? "animate-[blink_1s_ease-in-out_infinite]"
                          : ""
                      }`}
                    >
                      {getRoomTypeLeadIcon(room.roomType)}
                      {room.roomName}
                    </button>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                      {getRoomTypeLabel(room.roomType)}
                    </span>
                    {isMaintenance && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center shrink-0"
                            aria-label="Đang bảo trì"
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Đang bảo trì — không thể đặt phòng</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {hasNotification && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResolveRequest(room._id);
                            }}
                            className="flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:opacity-70"
                          >
                            <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 animate-bounce" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{hasNotification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {dayjs(hasNotification.timestamp).format("HH:mm")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {hasOrderNotification &&
                      orderNotificationsForRoom.map((notification, orderIndex) => (
                        <Tooltip key={notification.orderData.orderId}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOrderClick(
                                  room._id,
                                  notification.orderData.orderId,
                                );
                              }}
                              className={`flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:opacity-70 ${
                                isOrderBlinking ? "animate-pulse" : ""
                              }`}
                              aria-label={`Đơn FNB ${orderIndex + 1} của ${room.roomName}`}
                            >
                              <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Đơn {orderIndex + 1}/{orderNotificationsForRoom.length}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    {scheduleGiftInfo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Quà tặng: {scheduleGiftInfo.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {hasGiftNotification && onGiftClick && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onGiftClick(room._id);
                            }}
                            className={`flex-shrink-0 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center active:opacity-70 ${
                              isGiftBlinking ? "animate-pulse" : ""
                            }`}
                          >
                            <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Quà tặng: {hasGiftNotification.gift.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {inUseSchedule && inUseDuration && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs sm:text-sm font-medium whitespace-nowrap">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Đang dùng: {inUseDuration}</span>
                      </div>
                    )}
                    <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                      {roomSchedules.length} lịch
                    </span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 sm:px-4 pb-4 overflow-x-hidden">
                  {/* Timeline dọc */}
                  <div
                    className="relative overflow-y-auto max-h-[600px] sm:max-h-[800px] border border-gray-200 rounded-md"
                    style={{
                      minHeight: `${Math.min(MOBILE_TIMELINE_HEIGHT, 600)}px`,
                    }}
                  >
                    <div
                      className="relative"
                      style={{ height: `${MOBILE_TIMELINE_HEIGHT}px` }}
                    >
                      {/* Hour markers */}
                      {Array.from({
                        length: DAY_END_HOUR - DAY_START_HOUR + 1,
                      }).map((_, index) => {
                        const hour = DAY_START_HOUR + index;
                        const top = index * MOBILE_HOUR_HEIGHT;
                        return (
                          <div
                            key={`hour-marker-${hour}`}
                            className="absolute left-0 right-0 border-t border-gray-200"
                            style={{ top: `${top}px` }}
                          >
                            <div
                              className={`absolute left-0 top-0 -translate-y-1/2 bg-white px-2 text-xs sm:text-sm font-medium ${
                                hour >= 24 ? "text-amber-700" : "text-gray-600"
                              }`}
                            >
                              {formatTimelineHourLabel(hour)}
                            </div>
                          </div>
                        );
                      })}

                      {/* 15-minute markers */}
                      {Array.from({
                        length: (DAY_END_HOUR - DAY_START_HOUR) * 4,
                      }).map((_, index) => {
                        const top = (index + 1) * (MOBILE_HOUR_HEIGHT / 4);
                        return (
                          <div
                            key={`quarter-${index}`}
                            className="absolute left-8 right-0 border-t border-gray-100"
                            style={{ top: `${top}px` }}
                          />
                        );
                      })}

                      {/* Now marker (nếu đang trong khung ngày kinh doanh) */}
                      {isToday &&
                        (() => {
                          const dayStart = getTimelineDayStart(date);
                          const clampedMinutes = Math.min(
                            Math.max(currentTime.diff(dayStart, "minute"), 0),
                            TIMELINE_MINUTE_SPAN,
                          );
                          const markerTop = clampedMinutes * MOBILE_SCALE;
                          return (
                            <>
                              <div
                                className="absolute left-0 right-0 bg-red-500 w-full"
                                style={{
                                  top: `${markerTop}px`,
                                  height: "2px",
                                  zIndex: 10,
                                }}
                              />
                              <div
                                className="absolute bg-white px-2 py-1 rounded shadow text-xs sm:text-sm text-red-500 font-medium"
                                style={{
                                  top: `${markerTop - 12}px`,
                                  left: "8px",
                                  zIndex: 11,
                                }}
                              >
                                {currentTime.format("HH:mm")}
                              </div>
                            </>
                          );
                        })()}

                      {/* Schedule blocks */}
                      {(() => {
                        const visible = roomSchedules.filter((schedule) => {
                          if (!isStaff) return true;
                          const status = schedule.status.toLowerCase();
                          return (
                            status !== "finished" && status !== "completed"
                          );
                        });
                        const packed = packTimelineLanes(
                          visible.map((schedule) => {
                            const { top, height } = getVerticalMarkerStyle(
                              schedule,
                              currentTime,
                              isToday,
                              date,
                            );
                            return {
                              item: schedule,
                              startMin: top / MOBILE_SCALE,
                              endMin: (top + height) / MOBILE_SCALE,
                            };
                          }),
                        );
                        const laneCount = packed[0]?.laneCount ?? 1;

                        return packed.map(({ item: schedule, lane }) => {
                        const { top, height, bgColor } = getVerticalMarkerStyle(
                          schedule,
                          currentTime,
                          isToday,
                          date,
                        );
                        const leftPct = 12 + lane * ((100 - 14) / laneCount);
                        const widthPct = (100 - 14) / laneCount - 1;
                        const eventStart = dayjs(schedule.startTime);
                        const eventEnd = getScheduleTimelineEnd(
                          schedule,
                          eventStart.add(120, "minute"),
                        );
                        const status = schedule.status.toLowerCase();
                        const scheduleLabel = getScheduleTimelineLabel(
                          room.roomName,
                          schedule,
                          room,
                        );
                        const scheduleSizeLabel = getScheduleRoomTypeLabel(
                          getEffectiveScheduleRoomType(schedule, room),
                        );

                        let tooltipContent = "";
                        if (status === "booked") {
                          tooltipContent = `Size: ${scheduleSizeLabel}\nBắt đầu: ${eventStart.format(
                            "HH:mm"
                          )}\nKết thúc: ${eventEnd.format("HH:mm")}`;
                        } else if (status === "locked") {
                          const lockedDuration = dayjs().diff(
                            dayjs(schedule.startTime),
                            "minute"
                          );
                          tooltipContent = `Đã khóa ${lockedDuration} phút`;
                        } else if (status === "in use") {
                          const inUseDuration = dayjs().diff(
                            dayjs(schedule.startTime),
                            "minute"
                          );
                          const durationText =
                            inUseDuration < 60
                              ? `${inUseDuration} phút`
                              : `${Math.floor(inUseDuration / 60)} giờ${
                                  inUseDuration % 60 > 0
                                    ? ` ${inUseDuration % 60} phút`
                                    : ""
                                }`;
                          tooltipContent = `Size: ${scheduleSizeLabel}\nĐang sử dụng ${durationText}`;
                        } else if (status === "maintenance") {
                          tooltipContent = `Bảo trì\nBắt đầu: ${eventStart.format(
                            "HH:mm",
                          )}\nKết thúc: ${eventEnd.format(
                            "HH:mm",
                          )}\nBấm để chỉnh sửa / kết thúc`;
                        }

                        const eventElement = (
                          <div
                            key={schedule._id}
                            className={`absolute ${bgColor} opacity-80 rounded shadow-sm hover:opacity-100 active:opacity-90 transition-[opacity,box-shadow] duration-150 hover:shadow-md cursor-pointer touch-manipulation min-h-[32px]`}
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 32)}px`,
                              left: `${Math.max(leftPct, 10)}%`,
                              width: `${Math.max(widthPct, 18)}%`,
                              zIndex: lane + 1,
                            }}
                            onClick={() => onScheduleClick(schedule)}
                          >
                            <div className="p-2 sm:p-1.5 h-full flex flex-col justify-center">
                              <div className="text-xs sm:text-sm text-white font-medium truncate leading-tight">
                                {eventStart.format("HH:mm")}
                                {schedule.endTime &&
                                  ` - ${eventEnd.format("HH:mm")}`}
                              </div>
                              {height >= 40 && (
                                <div className="text-xs text-white/90 truncate mt-1 leading-tight">
                                  {status === "booked" || status === "in use"
                                    ? scheduleLabel
                                    : schedule.customerName || schedule.status}
                                </div>
                              )}
                            </div>
                          </div>
                        );

                        if (tooltipContent) {
                          return (
                            <Tooltip key={schedule._id}>
                              <TooltipTrigger asChild>
                                {eventElement}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="whitespace-pre-line">
                                  {tooltipContent}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return eventElement;
                      });
                      })()}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default MobileTimelineView;
