import staffScheduleApis, {
  IEmployeeSelfRegisterRequest,
} from "@/apis/staffSchedule.apis";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon, CircleXIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import { ShiftType } from "@/constants/enum";

const areTimesValid = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return true;

  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  let endTotal = endHours * 60 + endMinutes;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  return endTotal > startTotal;
};

// Define schema using zod
const employeeScheduleSchema = z
  .object({
    date: z.date({
      required_error: "Vui lòng chọn ngày làm việc",
    }),
    shifts: z
      .array(z.enum([ShiftType.Morning, ShiftType.Afternoon, ShiftType.All]))
      .min(1, "Vui lòng chọn ít nhất một ca"),
    note: z.string().max(500).optional(),
    customStartTime: z.string().optional(),
    customEndTime: z.string().optional(),
  })
  .refine(
    (data) => {
      return areTimesValid(data.customStartTime, data.customEndTime);
    },
    {
      message: "Khoảng thời gian không hợp lệ",
      path: ["customEndTime"],
    },
  );

type FormValues = z.infer<typeof employeeScheduleSchema>;

interface EmployeeScheduleRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  refetchSchedules?: () => void;
  initialDate?: Date;
  initialShift?: ShiftType;
}

const EmployeeScheduleRegistrationModal: React.FC<
  EmployeeScheduleRegistrationModalProps
> = ({ isOpen, onClose, refetchSchedules, initialDate, initialShift }) => {
  const [timeError, setTimeError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(employeeScheduleSchema),
    defaultValues: {
      date: initialDate || new Date(),
      shifts: initialShift ? [initialShift] : [],
      note: "",
      customStartTime: "",
      customEndTime: "",
    },
  });

  const { control, handleSubmit, reset, setError, watch, setValue } = form;

  const customStartTime = watch("customStartTime");
  const customEndTime = watch("customEndTime");
  const selectedShifts = watch("shifts");

  // Update form when modal opens with initial values
  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setValue("date", initialDate);
      }
      setValue("shifts", initialShift ? [initialShift] : []);
    }
  }, [isOpen, initialDate, initialShift, setValue]);

  // Auto-fill time when exactly one shift is selected
  useEffect(() => {
    if (selectedShifts.length === 1) {
      const selectedShift = selectedShifts[0];
      if (selectedShift === ShiftType.Morning) {
        setValue("customStartTime", "09:00");
        setValue("customEndTime", "14:00");
      } else if (selectedShift === ShiftType.Afternoon) {
        setValue("customStartTime", "14:00");
        setValue("customEndTime", "19:00");
      } else if (selectedShift === ShiftType.All) {
        setValue("customStartTime", "19:00");
        setValue("customEndTime", "01:00");
      }
    } else {
      setValue("customStartTime", "");
      setValue("customEndTime", "");
    }
  }, [selectedShifts, setValue]);

  // Validate time when values change
  useEffect(() => {
    if (customStartTime && customEndTime) {
      if (!areTimesValid(customStartTime, customEndTime)) {
        setTimeError("Khoảng thời gian không hợp lệ");
      } else {
        setTimeError("");
      }
    } else {
      setTimeError("");
    }
  }, [customStartTime, customEndTime]);

  const { mutate: registerSchedule, isPending: isSubmitting } = useMutation({
    mutationFn: (data: IEmployeeSelfRegisterRequest) =>
      staffScheduleApis.registerMySchedule(data),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description:
          "Đăng ký ca thành công. Vui lòng chờ quản lý duyệt.",
      });
      reset();
      refetchSchedules?.();
      onClose();
    },
    onError: (error: unknown) => {
      // Check whether the response includes an errors object
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<
              string,
              {
                type?: string;
                value?: unknown;
                msg?: string;
                path?: string;
                location?: string;
              }
            >;
          };
        };
        message?: string;
      };

      const responseData = axiosError?.response?.data;
      const errors = responseData?.errors;

      if (errors && typeof errors === "object") {
        // Extract all msg values from the errors object
        const errorMessages: string[] = [];
        const fieldErrors: Record<string, string> = {};

        Object.entries(errors).forEach(([field, errorData]) => {
          if (errorData?.msg) {
            errorMessages.push(errorData.msg);
            fieldErrors[field] = errorData.msg;
          }
        });

        // Show all messages in the toast
        if (errorMessages.length > 0) {
          toast({
            title: responseData?.message || "Thông tin không hợp lệ",
            description: errorMessages.join(", "),
            variant: "destructive",
          });
        }

        // Map errors to the corresponding form fields
        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (
            field === "shifts" ||
            field === "date" ||
            field === "note" ||
            field === "customStartTime" ||
            field === "customEndTime"
          ) {
            setError(
              field as
                | "shifts"
                | "date"
                | "note"
                | "customStartTime"
                | "customEndTime",
              {
                type: "server",
                message: message,
              },
            );
          }
        });
      } else {
        // Fallback: show a generic message
        const errorMessage =
          responseData?.message ||
          axiosError?.message ||
          "Không thể đăng ký lịch làm việc";
        toast({
          title: "Lỗi",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (values: FormValues) => {
    // Validate time before submit
    if (!areTimesValid(values.customStartTime, values.customEndTime)) {
      setTimeError("Khoảng thời gian không hợp lệ");
      return;
    }

    const dateStr = format(values.date, "yyyy-MM-dd");
    const payload: IEmployeeSelfRegisterRequest = {
      date: dateStr,
      shifts: values.shifts,
      note: values.note || undefined,
      customStartTime: values.customStartTime || undefined,
      customEndTime: values.customEndTime || undefined,
    };
    registerSchedule(payload);
  };

  const handleClose = () => {
    reset({
      date: new Date(),
      shifts: [],
      note: "",
      customStartTime: "",
      customEndTime: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="overflow-y-auto overscroll-y-contain pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6">
        <DialogHeader>
          <DialogTitle>Đăng ký lịch làm việc</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Ngày làm việc</FormLabel>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Chọn ngày</span>
                          )}
                          {field.value ? (
                            <CircleXIcon
                              className="ml-auto h-4 w-4 opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                field.onChange(undefined);
                              }}
                            />
                          ) : (
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <Portal>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          locale={vi}
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Portal>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="shifts"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base">Ca làm</FormLabel>
                  <div className="flex flex-col space-y-2">
                    {[
                      {
                        value: ShiftType.Morning,
                        label: "Ca 1: 09:00 - 14:00",
                      },
                      {
                        value: ShiftType.Afternoon,
                        label: "Ca 2: 14:00 - 19:00",
                      },
                      { value: ShiftType.All, label: "Ca 3: 19:00 - 01:00" },
                    ].map((shiftOption) => (
                      <FormItem
                        key={shiftOption.value}
                        className="flex items-center space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(shiftOption.value)}
                            onCheckedChange={(isChecked) => {
                              const nextValues = isChecked
                                ? [...(field.value || []), shiftOption.value]
                                : (field.value || []).filter(
                                    (value) => value !== shiftOption.value,
                                  );
                              field.onChange(nextValues);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          {shiftOption.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú (không bắt buộc)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Nhập ghi chú..."
                      className="resize-none"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || !!timeError}>
                {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeScheduleRegistrationModal;
