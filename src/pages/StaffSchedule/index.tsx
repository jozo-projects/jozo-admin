import { User } from "@/@types/user";
import { IEmployeeSchedule } from "@/apis/staffSchedule.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeScheduleStatus, Role, ShiftType } from "@/constants/enum";
import PATHS from "@/constants/paths";
import { useStaffSchedules, ViewMode } from "@/hooks/use-staff-schedules";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/usePermission";
import { useUsers } from "@/hooks/use-users";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";
import StaffScheduleRegistrationModal from "@/pages/RoomSchedule/components/StaffScheduleRegistrationModal";
import dayjs, { Dayjs } from "dayjs";
import { CalendarIcon, ChevronLeft, ChevronRight, Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import StaffScheduleDetailModal from "./components/StaffScheduleDetailModal";
import StaffScheduleShiftFilter, {
  getVisibleShifts,
  type ShiftFilter,
} from "./components/StaffScheduleShiftFilter";
import PaginationContainer from "@/pages/RecruitmentPage/components/PaginationContainer";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const StaffSchedulePage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<IEmployeeSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("all");
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [initialShift, setInitialShift] = useState<ShiftType | undefined>(
    undefined,
  );

  const { users, isLoadingUsers, pagination } = useUsers({
    page: currentPage,
    limit: pageSize,
    search: searchTerm || undefined,
    role: Role.Staff,
  });
  const isAdmin = useIsAdmin();

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const { toast } = useToast();
  const { onNewScheduleRegistration, offNewScheduleRegistration } = useSocket();

  const { startDate, endDate, dates } = useMemo(() => {
    let start: Dayjs;
    let end: Dayjs;
    const dateList: Dayjs[] = [];

    if (viewMode === "day") {
      start = currentDate.startOf("day");
      end = currentDate.startOf("day");
      dateList.push(currentDate);
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.day();
      if (dayOfWeek === 0) {
        start = currentDate.subtract(6, "day");
      } else {
        start = currentDate.subtract(dayOfWeek - 1, "day");
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

  const visibleShifts = useMemo(
    () => getVisibleShifts(shiftFilter),
    [shiftFilter],
  );

  const {
    data: schedules = [],
    isLoading: isLoadingSchedules,
    refetch,
  } = useStaffSchedules(startDate, endDate, viewMode, {
    filterType: viewMode === "day" ? "day" : undefined,
    date: viewMode === "day" ? currentDate : undefined,
  });

  useEffect(() => {
    const handleNewScheduleRegistration = (data: {
      userId: string;
      userName?: string;
      schedules: Array<{
        date: string;
        shiftType: string;
        status: string;
      }>;
      message: string;
    }) => {
      toast({
        title: "Đăng ký ca mới",
        description:
          data.message ||
          `${data.userName || "Nhân viên"} vừa đăng ký ${
            data.schedules.length
          } ca làm việc`,
        duration: 5000,
      });
      refetch();
    };

    onNewScheduleRegistration(handleNewScheduleRegistration);

    return () => {
      offNewScheduleRegistration(handleNewScheduleRegistration);
    };
  }, [onNewScheduleRegistration, offNewScheduleRegistration, refetch, toast]);

  const staffList = users;
  const filteredStaff = staffList;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const totalRecords = pagination?.total ?? filteredStaff.length;
  const totalPages =
    pagination?.total_pages ??
    Math.max(1, Math.ceil(totalRecords / (pageSize || 1)));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStaff = filteredStaff;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const getUserName = (user: User) => {
    return user.name || user.full_name || "No name";
  };

  const getSalarySnapshotTooltip = (schedule: IEmployeeSchedule | null) => {
    const hourly =
      typeof schedule?.salary?.hourlyRate === "number"
        ? schedule.salary.hourlyRate
        : schedule?.salarySnapshot?.hourlyRate;
    if (typeof hourly !== "number" || Number.isNaN(hourly)) return "";

    return `\nĐơn giá/giờ (server): ${hourly.toLocaleString("vi-VN")} VNĐ`;
  };

  const getSalarySourceTooltip = (schedule: IEmployeeSchedule | null) => {
    if (!schedule?.salarySource && !schedule?.salaryResolution) return "";

    const sourceLabelMap: Record<string, string> = {
      global: "Snapshot global",
      probation: "Thử việc",
      legacy_manual: "Legacy / thủ công",
      special: "Đặc biệt theo ca",
      override: "Override nhân viên",
      snapshot: "Snapshot ca",
      fallback: "Mặc định hệ thống",
    };

    const mode = schedule.salaryResolution?.mode
      ? `\nResolution: ${sourceLabelMap[schedule.salaryResolution.mode] || schedule.salaryResolution.mode}`
      : "";
    const specials = schedule.salaryResolution?.specialBusinessDates?.length
      ? `\nNgày đặc biệt: ${schedule.salaryResolution.specialBusinessDates.join(", ")}`
      : "";

    return `\nNguồn lương: ${sourceLabelMap[schedule.salarySource || ""] || schedule.salarySource || "—"}${mode}${specials}`;
  };

  const scheduleMap = useMemo(() => {
    const map = new Map<string, IEmployeeSchedule>();
    if (Array.isArray(schedules)) {
      schedules.forEach((schedule) => {
        const shift = schedule.shift || schedule.shiftType;
        const normalizedShift =
          shift === "evening" || shift === "afternoon"
            ? ShiftType.Afternoon
            : shift === "morning"
              ? ShiftType.Morning
              : shift === "all"
                ? ShiftType.All
                : shift;
        const key = `${schedule.userId}-${schedule.date}-${normalizedShift}`;
        map.set(key, schedule);
      });
    }
    return map;
  }, [schedules]);

  const getScheduleStatus = (
    userId: string,
    date: Dayjs,
    shift: ShiftType,
  ): IEmployeeSchedule | null => {
    const key = `${userId}-${date.format("YYYY-MM-DD")}-${shift}`;
    return scheduleMap.get(key) || null;
  };

  const isPastDate = (date: Dayjs): boolean => {
    const today = dayjs().startOf("day");
    return date.startOf("day").isBefore(today);
  };

  const getStatusColor = (
    status: EmployeeScheduleStatus | null,
    isPast: boolean,
    canInteract: boolean,
  ): string => {
    if (isPast && !canInteract) {
      if (!status) {
        return "bg-gray-50 border border-gray-200 border-dashed opacity-50 cursor-not-allowed";
      }
      switch (status) {
        case EmployeeScheduleStatus.Approved:
          return "bg-blue-500 opacity-60 cursor-not-allowed";
        case EmployeeScheduleStatus.Completed:
          return "bg-emerald-500 opacity-60 cursor-not-allowed";
        case EmployeeScheduleStatus.InProgress:
          return "bg-purple-500 opacity-60 cursor-not-allowed";
        case EmployeeScheduleStatus.Rejected:
        case EmployeeScheduleStatus.Cancelled:
          return "bg-red-500 opacity-60 cursor-not-allowed";
        case EmployeeScheduleStatus.Absent:
          return "bg-gray-400 opacity-60 cursor-not-allowed";
        case EmployeeScheduleStatus.Pending:
          return "bg-yellow-400 opacity-60 cursor-not-allowed";
        default:
          return "bg-gray-50 border border-gray-200 border-dashed opacity-50 cursor-not-allowed";
      }
    }

    if (isPast && canInteract) {
      if (!status) {
        return "bg-amber-50 border border-amber-300 border-dashed hover:bg-amber-100 hover:border-amber-400";
      }
      switch (status) {
        case EmployeeScheduleStatus.Approved:
          return "bg-blue-500 opacity-75 hover:bg-blue-600";
        case EmployeeScheduleStatus.Completed:
          return "bg-emerald-500 opacity-75 hover:bg-emerald-600";
        case EmployeeScheduleStatus.InProgress:
          return "bg-purple-500 opacity-75 hover:bg-purple-600";
        case EmployeeScheduleStatus.Rejected:
        case EmployeeScheduleStatus.Cancelled:
          return "bg-red-500 opacity-75 hover:bg-red-600";
        case EmployeeScheduleStatus.Absent:
          return "bg-gray-400 opacity-75 hover:bg-gray-500";
        case EmployeeScheduleStatus.Pending:
          return "bg-yellow-400 opacity-75 hover:bg-yellow-500";
        default:
          return "bg-amber-50 border border-amber-300 border-dashed hover:bg-amber-100 hover:border-amber-400";
      }
    }

    if (!status)
      return "bg-gray-100 border border-gray-300 border-dashed hover:bg-gray-200 hover:border-gray-400";

    switch (status) {
      case EmployeeScheduleStatus.Approved:
        return "bg-blue-500 hover:bg-blue-600";
      case EmployeeScheduleStatus.Completed:
        return "bg-emerald-500 hover:bg-emerald-600";
      case EmployeeScheduleStatus.InProgress:
        return "bg-purple-500 hover:bg-purple-600";
      case EmployeeScheduleStatus.Rejected:
      case EmployeeScheduleStatus.Cancelled:
        return "bg-red-500 hover:bg-red-600";
      case EmployeeScheduleStatus.Absent:
        return "bg-gray-400 hover:bg-gray-500";
      case EmployeeScheduleStatus.Pending:
        return "bg-yellow-400 hover:bg-yellow-500";
      default:
        return "bg-gray-100 border border-gray-300 border-dashed hover:bg-gray-200 hover:border-gray-400";
    }
  };

  const handleStaffClick = (userId: string) => {
    navigate(PATHS.STAFF_EARNINGS_DETAIL.replace(":userId", userId));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
    setSelectedStaffName("");
    setInitialDate(undefined);
    setInitialShift(undefined);
    refetch();
  };

  const handleCellClick = (
    schedule: IEmployeeSchedule | null,
    userId: string,
    staffName: string,
    date: Dayjs,
    shift: ShiftType,
  ) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setIsDetailModalOpen(true);
    } else {
      setSelectedUserId(userId);
      setSelectedStaffName(staffName);
      setInitialDate(date.toDate());
      setInitialShift(shift);
      setIsModalOpen(true);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSchedule(null);
    refetch();
  };

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

  const handleToday = () => {
    setCurrentDate(dayjs());
  };

  if (isLoadingUsers || isLoadingSchedules) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Staff Schedule Management"
        description="Click on staff name to view earnings details, or click on a cell to view/register schedule"
        icon={CalendarIcon}
      />

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="day">Ngày</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 flex-wrap">
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
                  onSelect={(date: Date | undefined) =>
                    date && setCurrentDate(dayjs(date))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="icon" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-[300px]"
          />
        </div>
      </div>

      <StaffScheduleShiftFilter
        value={shiftFilter}
        onChange={setShiftFilter}
        className="mb-4 max-w-xl"
      />

      <div className="border rounded-md overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                rowSpan={2}
                className="min-w-[250px] sticky left-0 bg-white z-10"
              >
                Staff Name
              </TableHead>
              {dates.map((date) => (
                <TableHead
                  key={date.format("YYYY-MM-DD")}
                  colSpan={visibleShifts.length}
                  className="text-center"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {dayNames[date.day()]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {date.format("DD/MM")}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {dates.map((date) => (
                <React.Fragment key={date.format("YYYY-MM-DD")}>
                  {visibleShifts.map((shift) => (
                    <TableHead
                      key={`${date.format("YYYY-MM-DD")}-${shift.type}`}
                      className="min-w-[80px] text-center text-xs"
                    >
                      {shift.label}
                    </TableHead>
                  ))}
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStaff.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={dates.length * visibleShifts.length + 1}
                  className="text-center py-8 text-gray-500"
                >
                  {searchTerm ? "No staff found" : "No staff available"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedStaff.map((user: User) => {
                const userName = getUserName(user);
                return (
                  <TableRow key={user._id}>
                    <TableCell
                      className={cn(
                        "min-w-[250px] sticky left-0 bg-white z-10 font-medium",
                        "cursor-pointer hover:text-blue-600 hover:underline py-6",
                      )}
                      onClick={() => handleStaffClick(user._id)}
                    >
                      {userName}
                    </TableCell>
                    {dates.map((date) => {
                      const isPast = isPastDate(date);
                      const canInteractPast = isAdmin;

                      return (
                        <React.Fragment key={date.format("YYYY-MM-DD")}>
                          {visibleShifts.map((shiftDef, shiftIndex) => {
                            const schedule = getScheduleStatus(
                              user._id,
                              date,
                              shiftDef.type,
                            );
                            const status = schedule?.status || null;
                            const canClick =
                              !!schedule || !isPast || canInteractPast;
                            const isLastShift =
                              shiftIndex === visibleShifts.length - 1;
                            const tooltip = `Ngày: ${date.format("DD/MM/YYYY")}
Ca: ${shiftDef.label}
Trạng thái: ${schedule ? status || "Không có" : "Chưa đăng ký"}${
                              schedule?.note
                                ? `\nGhi chú: ${schedule.note}`
                                : ""
                            }${getSalarySnapshotTooltip(schedule)}${getSalarySourceTooltip(schedule)}`;

                            return (
                              <TableCell
                                key={`${date.format("YYYY-MM-DD")}-${shiftDef.type}`}
                                className={cn(
                                  "px-2 py-6 text-center min-w-[80px]",
                                  !isLastShift && "border-r border-gray-300",
                                  getStatusColor(status, isPast, canClick),
                                  canClick &&
                                    "cursor-pointer transition-colors",
                                )}
                                title={tooltip}
                                onClick={
                                  canClick
                                    ? () =>
                                        handleCellClick(
                                          schedule,
                                          user._id,
                                          userName,
                                          date,
                                          shiftDef.type,
                                        )
                                    : undefined
                                }
                              />
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalRecords > 0 && (
        <PaginationContainer
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={totalRecords}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      )}

      {selectedUserId && (
        <StaffScheduleRegistrationModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userId={selectedUserId}
          staffName={selectedStaffName}
          refetchSchedules={refetch}
          initialDate={initialDate}
          initialShift={initialShift}
          allowPastDates={isAdmin}
        />
      )}

      <StaffScheduleDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        schedule={selectedSchedule}
        refetchSchedules={refetch}
      />
    </div>
  );
};

export default StaffSchedulePage;
