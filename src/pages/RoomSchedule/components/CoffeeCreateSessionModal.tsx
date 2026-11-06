import { ICoffeeTable } from "@/@types/CoffeeTable";
import coffeeSessionApis from "@/apis/coffeeSession.apis";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import React from "react";

interface CoffeeCreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: ICoffeeTable | null;
}

const CoffeeCreateSessionModal: React.FC<CoffeeCreateSessionModalProps> = ({
  isOpen,
  onClose,
  table,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [peopleCount, setPeopleCount] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [endTime, setEndTime] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) return;

    const now = dayjs();
    const defaultEnd = now.add(120, "minute");

    setPeopleCount("1");
    setNote("");
    setScheduledDate(now.format("YYYY-MM-DD"));
    setScheduledTime(now.format("HH:mm"));
    setEndTime(defaultEnd.format("HH:mm"));
  }, [isOpen]);

  const createSessionMutation = useMutation({
    mutationFn: () => {
      const start = dayjs(`${scheduledDate}T${scheduledTime}`);
      let end = dayjs(`${scheduledDate}T${endTime}`);

      if (end.isBefore(start) || end.isSame(start)) {
        end = end.add(1, "day");
      }

      const expectedDurationMinutes = Math.max(end.diff(start, "minute"), 1);
      const payload: Parameters<typeof coffeeSessionApis.createCoffeeSession>[0] = {
        tableId: table?._id || "",
        peopleCount: Math.max(1, Number(peopleCount) || 1),
        note: note.trim() || undefined,
        scheduledStartTime: start.toISOString(),
        expectedDurationMinutes,
      };

      return coffeeSessionApis.createCoffeeSession(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffeeSessions"] });
      toast({
        title: "Tạo phiên thành công",
        description: `Đã giữ bàn ${table?.name || ""}.`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Không thể tạo phiên",
        description: error.message || "Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const isInvalidBooking = !scheduledDate || !scheduledTime || !endTime;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Tạo coffee session</DialogTitle>
          <DialogDescription>
            Tạo phiên mới cho bàn <span className="font-medium">{table?.name}</span>.
            Session mới sẽ ở trạng thái `booked`.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coffee-people-count">Số người</Label>
            <Input
              id="coffee-people-count"
              type="number"
              min={1}
              value={peopleCount}
              onChange={(event) => setPeopleCount(event.target.value)}
              placeholder="Nhập số người"
            />
          </div>

          <div className="space-y-2">
            <Label>Ngày bắt đầu</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {scheduledDate
                    ? dayjs(scheduledDate).format("DD/MM/YYYY")
                    : "Chọn ngày bắt đầu"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    scheduledDate
                      ? dayjs(scheduledDate, "YYYY-MM-DD").toDate()
                      : undefined
                  }
                  onSelect={(selectedDateValue) => {
                    if (!selectedDateValue) return;
                    setScheduledDate(
                      dayjs(selectedDateValue).format("YYYY-MM-DD"),
                    );
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coffee-scheduled-time">Giờ bắt đầu</Label>
              <Input
                id="coffee-scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={(event) => setScheduledTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coffee-end-time">Giờ kết thúc</Label>
              <Input
                id="coffee-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coffee-session-note">Ghi chú</Label>
            <Textarea
              id="coffee-session-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: khách đặt trước bàn"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            loading={createSessionMutation.isPending}
            disabled={!table?._id || isInvalidBooking}
            onClick={() => createSessionMutation.mutate()}
          >
            Tạo session booked
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoffeeCreateSessionModal;
