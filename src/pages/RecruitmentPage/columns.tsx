import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Recruitment,
  RecruitmentStatus,
  CurrentStatus,
  Gender,
  Position,
  WorkShift,
} from "@/@types/Recruitment";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Mail, Phone, Calendar, Eye } from "lucide-react";
import { StatusUpdateCell } from "./StatusUpdateCell";

const statusColors = {
  [RecruitmentStatus.Pending]: "bg-yellow-100 text-yellow-800",
  [RecruitmentStatus.Reviewed]: "bg-blue-100 text-blue-800",
  [RecruitmentStatus.Contacted]: "bg-orange-100 text-orange-800",
  [RecruitmentStatus.Hired]: "bg-green-100 text-green-800",
  [RecruitmentStatus.Rejected]: "bg-red-100 text-red-800",
};

const statusLabels = {
  [RecruitmentStatus.Pending]: "Chờ xử lý",
  [RecruitmentStatus.Reviewed]: "Đã xem xét",
  [RecruitmentStatus.Contacted]: "Đã liên hệ",
  [RecruitmentStatus.Hired]: "Đã tuyển dụng",
  [RecruitmentStatus.Rejected]: "Từ chối",
};

const currentStatusLabels = {
  [CurrentStatus.Student]: "Sinh viên",
  [CurrentStatus.Working]: "Đang làm việc",
  [CurrentStatus.Other]: "Khác",
};

const genderLabels = {
  [Gender.Male]: "Nam",
  [Gender.Female]: "Nữ",
  [Gender.Other]: "Khác",
};

const positionLabels = {
  [Position.Cashier]: "Thu ngân",
  [Position.Server]: "Phục vụ",
  [Position.Parking]: "Giữ xe",
  [Position.Kitchen]: "Bếp",
  [Position.Bartender]: "Bartender",
  [Position.Manager]: "Quản lý",
  [Position.Other]: "Khác",
};

const workShiftLabels = {
  [WorkShift.Morning]: "Sáng",
  [WorkShift.Evening]: "Tối",
  [WorkShift.Night]: "Đêm",
  [WorkShift.FullTime]: "Toàn thời gian",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const calculateAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const columns: ColumnDef<Recruitment>[] = [
  {
    accessorKey: "fullName",
    header: "Ứng viên",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {getInitials(recruitment.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{recruitment.fullName}</div>
            <div className="text-sm text-muted-foreground">
              {Array.isArray(recruitment.position)
                ? recruitment.position
                    .map((pos) => positionLabels[pos as Position] || pos)
                    .join(", ")
                : positionLabels[recruitment.position as Position] ||
                  recruitment.position}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "contact",
    header: "Thông tin liên hệ",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="h-3 w-3 text-gray-400" />
            <span>{recruitment.phone}</span>
          </div>
          {recruitment.email && (
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="h-3 w-3 text-gray-400" />
              <span>{recruitment.email}</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "personalInfo",
    header: "Thông tin cá nhân",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span>{calculateAge(recruitment.birthDate)} tuổi</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {genderLabels[recruitment.gender as Gender] || recruitment.gender}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "currentStatus",
    header: "Tình trạng hiện tại",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="text-sm">
          {currentStatusLabels[recruitment.currentStatus as CurrentStatus] ||
            recruitment.currentStatus}
          {recruitment.otherStatus && (
            <div className="text-xs text-muted-foreground mt-1">
              {recruitment.otherStatus}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "workShifts",
    header: "Ca làm việc",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(recruitment.workShifts) ? (
            <>
              {recruitment.workShifts
                .slice(0, 2)
                .map((shift: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {workShiftLabels[shift as WorkShift] || shift}
                  </Badge>
                ))}
              {recruitment.workShifts.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{recruitment.workShifts.length - 2}
                </Badge>
              )}
            </>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {workShiftLabels[recruitment.workShifts as WorkShift] ||
                recruitment.workShifts}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "submittedAt",
    header: "Ngày nộp",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="text-sm">
          {format(new Date(recruitment.submittedAt), "dd/MM/yyyy", {
            locale: vi,
          })}
          <div className="text-xs text-muted-foreground">
            {format(new Date(recruitment.submittedAt), "HH:mm", { locale: vi })}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Trạng thái",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="space-y-2">
          <Badge
            className={statusColors[recruitment.status as RecruitmentStatus]}
          >
            {statusLabels[recruitment.status as RecruitmentStatus]}
          </Badge>
          <StatusUpdateCell
            recruitmentId={recruitment._id}
            currentStatus={recruitment.status}
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Thao tác",
    cell: ({ row }) => {
      const recruitment = row.original;
      return (
        <div className="flex items-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Chi tiết ứng viên</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Họ tên
                    </label>
                    <p className="text-sm">{recruitment.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Ngày sinh
                    </label>
                    <p className="text-sm">
                      {format(new Date(recruitment.birthDate), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Giới tính
                    </label>
                    <p className="text-sm">
                      {genderLabels[recruitment.gender as Gender] ||
                        recruitment.gender}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Số điện thoại
                    </label>
                    <p className="text-sm">{recruitment.phone}</p>
                  </div>
                  {recruitment.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p className="text-sm">{recruitment.email}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Mạng xã hội
                    </label>
                    <p className="text-sm">{recruitment.socialMedia}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Tình trạng hiện tại
                    </label>
                    <p className="text-sm">
                      {currentStatusLabels[
                        recruitment.currentStatus as CurrentStatus
                      ] || recruitment.currentStatus}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Vị trí ứng tuyển
                    </label>
                    <p className="text-sm">
                      {Array.isArray(recruitment.position)
                        ? recruitment.position
                            .map(
                              (pos) => positionLabels[pos as Position] || pos,
                            )
                            .join(", ")
                        : positionLabels[recruitment.position as Position] ||
                          recruitment.position}
                    </p>
                  </div>
                </div>

                {recruitment.otherStatus && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Tình trạng khác
                    </label>
                    <p className="text-sm">{recruitment.otherStatus}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Ghi chú
                  </label>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {recruitment.note?.trim() || "Không có ghi chú"}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Ca làm việc
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Array.isArray(recruitment.workShifts) ? (
                      recruitment.workShifts.map((shift, index) => (
                        <Badge key={index} variant="secondary">
                          {workShiftLabels[shift as WorkShift] || shift}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">
                        {workShiftLabels[recruitment.workShifts as WorkShift] ||
                          recruitment.workShifts}
                      </Badge>
                    )}
                  </div>
                </div>

                {recruitment.workDays && recruitment.workDays.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Ngày có thể làm việc
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {recruitment.workDays.map(
                        (day: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {day}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      );
    },
  },
];
