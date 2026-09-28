import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import staffScheduleApis from "@/apis/staffSchedule.apis";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeScheduleStatus, ShiftType } from "@/constants/enum";
import { useMySchedules, ViewMode } from "@/hooks/use-my-schedules";
import { cn } from "@/lib/utils";
import StaffScheduleDetailModal from "@/pages/StaffSchedule/components/StaffScheduleDetailModal";
import EmployeeScheduleRegistrationModal from "./components/EmployeeScheduleRegistrationModal";
import { ShiftRegistrationCalendar } from "./components/ShiftRegistrationCalendar";
import DateSchedulesModal from "./components/DateSchedulesModal";
import { format } from "date-fns";
import dayjs, { Dayjs } from "dayjs";
import {
  AlertCircle,
  Briefcase,
  CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  PlayCircle,
  Plus,
  XCircle,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

const MySchedulePage = () => {
  type ShiftFilterValue = ShiftType | "all_shifts" | "custom" | undefined;

  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [selectedStatus, setSelectedStatus] = useState<
    EmployeeScheduleStatus | undefined
  >(undefined);
  const [selectedShiftType, setSelectedShiftType] =
    useState<ShiftFilterValue>("all_shifts");
  const [selectedSchedule, setSelectedSchedule] =
    useState<IEmployeeSchedule | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isDateSchedulesModalOpen, setIsDateSchedulesModalOpen] =
    useState(false);
  const [calendarDate, setCalendarDate] = useState<Dayjs>(dayjs());
  const [selectedDateForRegistration, setSelectedDateForRegistration] =
    useState<Date | undefined>(undefined);
  const [selectedDateForSchedules, setSelectedDateForSchedules] =
    useState<Dayjs | null>(null);

  const { toast } = useToast();
  const {
    onScheduleStatusUpdated,
    offScheduleStatusUpdated,
    onScheduleAssigned,
    offScheduleAssigned,
  } = useSocket();

  // Deeplink support: read scheduleId from URL
  const searchParams = new URLSearchParams(window.location.search);
  const setSearchParams = useCallback((next: Record<string, string>) => {
    void router.navigate({ to: "/my-schedule", search: next as never, replace: true });
  }, [router]);
  const scheduleIdFromUrl = searchParams.get("scheduleId");

  // Calculate date range based on view mode
  const { startDate, endDate, dates } = useMemo(() => {
    let start: Dayjs;
    let end: Dayjs;
    const dateList: Dayjs[] = [];

    if (viewMode === "day") {
      start = currentDate.startOf("day");
      end = currentDate.endOf("day");
      dateList.push(currentDate);
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.day();
      if (dayOfWeek === 0) {
        start = currentDate.subtract(6, "day");
      } else {
        const daysToSubtract = dayOfWeek - 1;
        start = currentDate.subtract(daysToSubtract, "day");
      }
      end = start.add(6, "day");
      for (let i = 0; i < 7; i++) {
        dateList.push(start.add(i, "day"));
      }
    } else {
      start = currentDate.startOf("month");
      end = currentDate.endOf("month");
      const daysInMonth = currentDate.daysInMonth();
      for (let i = 0; i < daysInMonth; i++) {
        dateList.push(start.add(i, "day"));
      }
    }

    return { startDate: start, endDate: end, dates: dateList };
  }, [viewMode, currentDate]);

  // Build options for API call
  const options = useMemo(() => {
    const opts: {
      filterType: ViewMode;
      date?: Dayjs;
      startDate?: Dayjs;
      endDate?: Dayjs;
      status?: EmployeeScheduleStatus;
      shiftType?: ShiftType;
    } = {
      filterType: viewMode,
    };

    if (viewMode === "day") {
      opts.date = currentDate;
    } else if (viewMode === "week") {
      opts.startDate = startDate;
      opts.endDate = endDate;
    } else {
      // month view
      opts.date = currentDate;
    }

    if (selectedStatus !== "all") {
      opts.status = selectedStatus;
    }

    if (
      selectedShiftType &&
      selectedShiftType !== "all_shifts" &&
      selectedShiftType !== "custom"
    ) {
      opts.shiftType = selectedShiftType;
    }

    return opts;
  }, [
    viewMode,
    currentDate,
    startDate,
    endDate,
    selectedStatus,
    selectedShiftType,
  ]);

  const scheduleQuery = useMySchedules(options);
  const schedules = useMemo(
    () => scheduleQuery.data?.schedules ?? [],
    [scheduleQuery.data?.schedules],
  );
  const { isLoading, refetch } = scheduleQuery;

  // Get all schedules for calendar month (for calendar display, no filters)
  const {
    data: { schedules: calendarSchedules = [] } = { schedules: [] },
    refetch: refetchCalendarSchedules,
  } = useMySchedules({
    filterType: "month",
    date: calendarDate,
  });

  // Fetch schedule detail from URL (deeplink support)
  const { data: scheduleDetailResponse, error: scheduleDetailError } = useQuery(
    {
      queryKey: ["schedule-detail", scheduleIdFromUrl, "full"],
      queryFn: async () => {
        if (!scheduleIdFromUrl) return null;
        const response = await staffScheduleApis.getScheduleById(
          scheduleIdFromUrl,
          { salaryView: "full" },
        );
        return response.data.result;
      },
      enabled: !!scheduleIdFromUrl,
      retry: false,
    },
  );

  // Handle schedule detail loaded from URL
  useEffect(() => {
    if (scheduleDetailResponse && scheduleIdFromUrl) {
      setSelectedSchedule(scheduleDetailResponse);
      setIsDetailModalOpen(true);
    }
  }, [scheduleDetailResponse, scheduleIdFromUrl]);

  // Handle schedule detail error
  useEffect(() => {
    if (scheduleDetailError && scheduleIdFromUrl) {
      toast({
        title: "Error",
        description: "Could not find this work shift",
        variant: "destructive",
      });
      // Clear invalid scheduleId from URL
      setSearchParams({});
    }
  }, [scheduleDetailError, scheduleIdFromUrl, toast, setSearchParams]);

  // Socket listener for schedule status updates
  useEffect(() => {
    const handleScheduleStatusUpdated = (data: {
      scheduleId: string;
      schedule: {
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      };
      status: string;
      message: string;
    }) => {
      console.log("Shift status changed:", data);

      // Show toast notification
      const statusLabels: Record<string, string> = {
        [EmployeeScheduleStatus.Approved]: "has been approved",
        [EmployeeScheduleStatus.Rejected]: "has been rejected",
        [EmployeeScheduleStatus.InProgress]: "has started",
        [EmployeeScheduleStatus.Completed]: "has been completed",
        [EmployeeScheduleStatus.Cancelled]: "has been cancelled",
        [EmployeeScheduleStatus.Absent]: "was marked absent",
      };

      const statusLabel = statusLabels[data.status] || "has been updated";

      toast({
        title: "Shift status updated",
        description:
          data.message ||
          `Work shift on ${dayjs(data.schedule.date).format(
            "DD/MM/YYYY",
          )} ${statusLabel}`,
        duration: 5000,
      });

      // Refetch schedules to update the view
      refetch();
      refetchCalendarSchedules();
    };

    const handleScheduleAssigned = (data: {
      schedules: Array<{
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      }>;
      message: string;
    }) => {
      console.log("You were assigned shifts:", data);

      // Show toast notification
      toast({
        title: "New shift assignments",
        description:
          data.message ||
          `You have been assigned ${data.schedules.length} new work shift${data.schedules.length === 1 ? "" : "s"}`,
        duration: 5000,
      });

      // Refetch schedules to update the view
      refetch();
      refetchCalendarSchedules();
    };

    onScheduleStatusUpdated(handleScheduleStatusUpdated);
    onScheduleAssigned(handleScheduleAssigned);

    return () => {
      offScheduleStatusUpdated(handleScheduleStatusUpdated);
      offScheduleAssigned(handleScheduleAssigned);
    };
  }, [
    onScheduleStatusUpdated,
    offScheduleStatusUpdated,
    onScheduleAssigned,
    offScheduleAssigned,
    refetch,
    refetchCalendarSchedules,
    toast,
  ]);

  // Group schedules by date (for filtered view)
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, IEmployeeSchedule[]>();
    schedules.forEach((schedule) => {
      const dateKey = schedule.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(schedule);
    });
    return map;
  }, [schedules]);

  // Group calendar schedules by date (for calendar modal)
  const calendarSchedulesByDate = useMemo(() => {
    const map = new Map<string, IEmployeeSchedule[]>();
    calendarSchedules.forEach((schedule) => {
      const dateKey = schedule.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(schedule);
    });
    return map;
  }, [calendarSchedules]);

  const handlePrevious = () => {
    if (viewMode === "day") {
      setCurrentDate(currentDate.subtract(1, "day"));
    } else if (viewMode === "week") {
      setCurrentDate(currentDate.subtract(1, "week"));
    } else {
      setCurrentDate(currentDate.subtract(1, "month"));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setCurrentDate(currentDate.add(1, "day"));
    } else if (viewMode === "week") {
      setCurrentDate(currentDate.add(1, "week"));
    } else {
      setCurrentDate(currentDate.add(1, "month"));
    }
  };

  const handleScheduleClick = (schedule: IEmployeeSchedule) => {
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
    // Update URL with scheduleId for deeplink support
    setSearchParams({ scheduleId: schedule._id });
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSchedule(null);
    // Clear scheduleId from URL
    setSearchParams({});
    refetch();
    refetchCalendarSchedules();
  };

  const handleCalendarDateClick = (date: Dayjs) => {
    // Check if date has existing schedules (use calendarSchedules, not filtered schedules)
    const dateKey = date.format("YYYY-MM-DD");
    const daySchedules = calendarSchedulesByDate.get(dateKey) || [];

    if (daySchedules.length > 0) {
      // Show schedules list modal (button to register more will be hidden if already has 2 shifts)
      setSelectedDateForSchedules(date);
      setIsDateSchedulesModalOpen(true);
    } else {
      // No shifts, show registration modal
      setSelectedDateForRegistration(date.toDate());
      setIsRegistrationModalOpen(true);
    }
  };

  const handleCloseRegistrationModal = () => {
    setIsRegistrationModalOpen(false);
    setSelectedDateForRegistration(undefined);
    refetch();
    refetchCalendarSchedules();
  };

  const handleCloseCalendarModal = () => {
    setIsCalendarModalOpen(false);
    setCalendarDate(dayjs());
  };

  const handleCloseDateSchedulesModal = () => {
    setIsDateSchedulesModalOpen(false);
    setSelectedDateForSchedules(null);
  };

  const handleScheduleClickFromDateModal = (schedule: IEmployeeSchedule) => {
    setIsDateSchedulesModalOpen(false);
    setSelectedSchedule(schedule);
    setIsDetailModalOpen(true);
    // Update URL with scheduleId for deeplink support
    setSearchParams({ scheduleId: schedule._id });
  };

  const handleRegisterNewFromDateModal = () => {
    if (selectedDateForSchedules) {
      setIsDateSchedulesModalOpen(false);
      setSelectedDateForRegistration(selectedDateForSchedules.toDate());
      setIsRegistrationModalOpen(true);
    }
  };

  const getStatusColor = (status: EmployeeScheduleStatus) => {
    switch (status) {
      case EmployeeScheduleStatus.Approved:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case EmployeeScheduleStatus.InProgress:
        return "bg-purple-100 text-purple-800 border-purple-200";
      case EmployeeScheduleStatus.Completed:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case EmployeeScheduleStatus.Pending:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case EmployeeScheduleStatus.Rejected:
      case EmployeeScheduleStatus.Cancelled:
        return "bg-red-100 text-red-800 border-red-200";
      case EmployeeScheduleStatus.Absent:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: EmployeeScheduleStatus) => {
    switch (status) {
      case EmployeeScheduleStatus.Completed:
        return <CheckCircle2 className="h-4 w-4" />;
      case EmployeeScheduleStatus.InProgress:
        return <PlayCircle className="h-4 w-4" />;
      case EmployeeScheduleStatus.Pending:
        return <AlertCircle className="h-4 w-4" />;
      case EmployeeScheduleStatus.Rejected:
      case EmployeeScheduleStatus.Cancelled:
      case EmployeeScheduleStatus.Absent:
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getShiftLabel = (schedule: IEmployeeSchedule) => {
    const shift = schedule.shift || schedule.shiftType;
    if (schedule.customStartTime && schedule.customEndTime) {
      return `${schedule.customStartTime} - ${schedule.customEndTime}`;
    }
    if (shift === "shift1" || shift === "morning")
      return "Shift 1 (09:00 - 14:00)";
    if (shift === "shift2" || shift === "afternoon" || shift === "evening")
      return "Shift 2 (14:00 - 19:00)";
    if (shift === "shift3" || shift === "all") return "Shift 3 (19:00 - 01:00)";
    return shift || "Custom";
  };

  const getShiftBadgeColor = (schedule: IEmployeeSchedule) => {
    const shift = schedule.shift || schedule.shiftType;
    if (shift === "shift1" || shift === "morning")
      return "bg-orange-100 text-orange-800";
    if (shift === "shift2" || shift === "afternoon" || shift === "evening")
      return "bg-indigo-100 text-indigo-800";
    if (shift === "shift3" || shift === "all")
      return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="My Work Schedule"
        description="View and manage your work schedule"
        icon={Briefcase}
      />

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & View</CardTitle>
          <CardDescription>
            Select time range and filters to view your work schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <Tabs
                value={viewMode}
                onValueChange={(value) => setViewMode(value as ViewMode)}
              >
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[200px] justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {viewMode === "day"
                        ? currentDate.format("DD/MM/YYYY")
                        : viewMode === "week"
                          ? `${startDate.format("DD/MM")} - ${endDate.format(
                              "DD/MM/YYYY",
                            )}`
                          : currentDate.format("MM/YYYY")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentDate.toDate()}
                      onSelect={(date) => date && setCurrentDate(dayjs(date))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="default"
                onClick={() => setIsCalendarModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Register Shift
              </Button>

              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as EmployeeScheduleStatus | undefined)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Pending}>
                    Pending
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Approved}>
                    Approved
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.InProgress}>
                    In Progress
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Completed}>
                    Completed
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Absent}>
                    Absent
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Rejected}>
                    Rejected
                  </SelectItem>
                  <SelectItem value={EmployeeScheduleStatus.Cancelled}>
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedShiftType}
                onValueChange={(value) =>
                  setSelectedShiftType(value as ShiftFilterValue)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Shift Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_shifts">All Shifts</SelectItem>
                  <SelectItem value="shift1">Shift 1</SelectItem>
                  <SelectItem value="shift2">Shift 2</SelectItem>
                  <SelectItem value="shift3">Shift 3</SelectItem>
                  <SelectItem value="custom">Custom Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Work Schedule</CardTitle>
          <CardDescription>
            {viewMode === "day"
              ? `Work schedule for ${currentDate.format("DD/MM/YYYY")}`
              : viewMode === "week"
                ? `Work schedule from ${startDate.format(
                    "DD/MM",
                  )} to ${endDate.format("DD/MM/YYYY")}`
                : `Work schedule for ${currentDate.format("MM/YYYY")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No work shifts found
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different time range or change the filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dates.map((date) => {
                const dateKey = date.format("YYYY-MM-DD");
                const daySchedules = schedulesByDate.get(dateKey) || [];

                // Sort schedules: morning shifts first, then afternoon, then custom
                const sortedSchedules = [...daySchedules].sort((a, b) => {
                  const shiftA = a.shift || a.shiftType || "custom";
                  const shiftB = b.shift || b.shiftType || "custom";

                  const shiftOrder: Record<string, number> = {
                    morning: 1,
                    afternoon: 2,
                    custom: 3,
                  };

                  return (
                    (shiftOrder[shiftA] || 999) - (shiftOrder[shiftB] || 999)
                  );
                });

                const isToday = date.isSame(dayjs(), "day");
                const isPast = date.isBefore(dayjs(), "day");

                if (daySchedules.length === 0 && viewMode === "month") {
                  return null;
                }

                return (
                  <div
                    key={dateKey}
                    className={cn(
                      "border rounded-lg p-4 transition-colors cursor-pointer hover:shadow-lg",
                      isToday && "border-blue-500 bg-blue-50/50",
                      isPast && !isToday && "opacity-60",
                    )}
                    onClick={() => {
                      setSelectedDateForRegistration(date.toDate());
                      setIsRegistrationModalOpen(true);
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3
                          className={cn(
                            "text-lg font-semibold",
                            isToday && "text-blue-600",
                          )}
                        >
                          {format(date.toDate(), "EEEE, dd/MM/yyyy")}
                        </h3>
                        {isToday && (
                          <Badge
                            variant="default"
                            className="bg-blue-600 whitespace-nowrap"
                          >
                            Today
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {daySchedules.length} shift
                        {daySchedules.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {sortedSchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No work shifts
                      </p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {sortedSchedules.map((schedule) => (
                          <div
                            key={schedule._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleClick(schedule);
                            }}
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary",
                              getStatusColor(schedule.status),
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(schedule.status)}
                                <Badge
                                  variant="outline"
                                  className={getShiftBadgeColor(schedule)}
                                >
                                  {getShiftLabel(schedule)}
                                </Badge>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border",
                                  getStatusColor(schedule.status),
                                )}
                              >
                                {schedule.status ===
                                EmployeeScheduleStatus.Pending
                                  ? "Pending"
                                  : schedule.status ===
                                      EmployeeScheduleStatus.Approved
                                    ? "Approved"
                                    : schedule.status ===
                                        EmployeeScheduleStatus.InProgress
                                      ? "In Progress"
                                      : schedule.status ===
                                          EmployeeScheduleStatus.Completed
                                        ? "Completed"
                                        : schedule.status ===
                                            EmployeeScheduleStatus.Absent
                                          ? "Absent"
                                          : schedule.status ===
                                              EmployeeScheduleStatus.Rejected
                                            ? "Rejected"
                                            : schedule.status ===
                                                EmployeeScheduleStatus.Cancelled
                                              ? "Cancelled"
                                              : schedule.status}
                              </Badge>
                            </div>
                            {schedule.status ===
                              EmployeeScheduleStatus.Rejected &&
                              schedule.rejectedReason && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  <span className="font-medium">
                                    Rejection reason:{" "}
                                  </span>
                                  {schedule.rejectedReason}
                                </p>
                              )}
                            {schedule.status !==
                              EmployeeScheduleStatus.Rejected &&
                              schedule.note && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {schedule.note}
                                </p>
                              )}
                            {schedule.shiftInfo && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                <div>
                                  {schedule.shiftInfo.name}:{" "}
                                  {schedule.shiftInfo.startTime} -{" "}
                                  {schedule.shiftInfo.endTime}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <StaffScheduleDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        schedule={selectedSchedule}
        refetchSchedules={refetch}
        allowEmployeeSelfDelete
      />

      {/* Calendar Modal for Shift Registration */}
      <Dialog
        open={isCalendarModalOpen}
        onOpenChange={handleCloseCalendarModal}
      >
        <DialogContent className="overflow-y-auto p-0 sm:max-w-3xl sm:p-5 lg:max-w-4xl lg:p-6">
          <DialogHeader className="border-b px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-left sm:border-0 sm:px-0 sm:pb-2 sm:pt-0">
            <DialogTitle className="text-lg tracking-tight sm:text-xl">
              Register Work Shift
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choose an available date to register your shift
            </p>
          </DialogHeader>
          <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-0 sm:pb-0 sm:pt-0">
            <ShiftRegistrationCalendar
              schedules={calendarSchedules}
              onDateClick={handleCalendarDateClick}
              currentDate={calendarDate}
              onCurrentDateChange={setCalendarDate}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Registration Modal */}
      <EmployeeScheduleRegistrationModal
        isOpen={isRegistrationModalOpen}
        onClose={handleCloseRegistrationModal}
        refetchSchedules={refetch}
        initialDate={selectedDateForRegistration}
      />

      {/* Date Schedules Modal */}
      {selectedDateForSchedules && (
        <DateSchedulesModal
          isOpen={isDateSchedulesModalOpen}
          onClose={handleCloseDateSchedulesModal}
          date={selectedDateForSchedules}
          schedules={
            calendarSchedulesByDate.get(
              selectedDateForSchedules.format("YYYY-MM-DD"),
            ) || []
          }
          onScheduleClick={handleScheduleClickFromDateModal}
          onRegisterNew={handleRegisterNewFromDateModal}
        />
      )}
    </div>
  );
};

export default MySchedulePage;
