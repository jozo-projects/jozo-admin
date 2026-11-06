import { CoffeeSessionStatus, ICoffeeSession } from "@/@types/CoffeeSession";
import coffeeSessionApis from "@/apis/coffeeSession.apis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getCoffeeSessionDisplayEnd,
  getCoffeeSessionDisplayStart,
} from "@/utils/coffeeSession";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import React from "react";

interface CoffeeBookedModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ICoffeeSession | null;
  tableName?: string;
}

const CoffeeBookedModal: React.FC<CoffeeBookedModalProps> = ({
  isOpen,
  onClose,
  session,
  tableName,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [peopleCount, setPeopleCount] = React.useState("1");
  const [note, setNote] = React.useState("");
  const sessionDetailQuery = useQuery({
    queryKey: ["coffeeSession", session?._id],
    queryFn: async () => {
      if (!session?._id) return null;
      const response = await coffeeSessionApis.getCoffeeSessionById(
        session._id,
      );
      return (response.data.result || null) as ICoffeeSession | null;
    },
    enabled: isOpen && !!session?._id,
    refetchOnWindowFocus: false,
  });
  const sessionDetail = sessionDetailQuery.data || session;

  React.useEffect(() => {
    setCustomerName(sessionDetail?.customerName || "");
    setCustomerPhone(sessionDetail?.customerPhone || "");
    setPeopleCount(String(sessionDetail?.peopleCount || 1));
    setNote(sessionDetail?.note || "");
  }, [sessionDetail]);

  const updateSessionMutation = useMutation({
    mutationFn: (status: CoffeeSessionStatus) =>
      coffeeSessionApis.updateCoffeeSession(sessionDetail?._id || "", {
        status,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        peopleCount: Math.max(1, Number(peopleCount) || 1),
        note: note.trim() || undefined,
      }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["coffeeSessions"] });
      queryClient.invalidateQueries({
        queryKey: ["coffeeSession", sessionDetail?._id],
      });
      toast({
        title: "Cập nhật phiên thành công",
        description:
          status === "in-use"
            ? "Phiên đã chuyển sang trạng thái đang sử dụng."
            : status === "completed"
              ? "Phiên đã được hoàn tất."
              : "Đã lưu thông tin phiên booked.",
      });
      onClose();
    },
  });

  const bookedStart = sessionDetail
    ? getCoffeeSessionDisplayStart(sessionDetail)
    : null;
  const bookedEnd = sessionDetail
    ? getCoffeeSessionDisplayEnd(sessionDetail)
    : null;
  const planSnapshot = sessionDetail?.planSnapshot;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Booked coffee session</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{tableName || "Coffee table"}</span>{" "}
            đang ở trạng thái giữ bàn.
          </DialogDescription>
        </DialogHeader>

        {sessionDetail?.pinCode && (
          <Badge variant="secondary" className="flex items-center gap-x-1">
            <span className="text-sm text-muted-foreground">Mã pin:</span>
            <span className="font-medium">{sessionDetail?.pinCode}</span>
          </Badge>
        )}

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
            <Badge>Booked</Badge>
            {sessionDetailQuery.isLoading && (
              <Badge variant="secondary">Đang tải chi tiết...</Badge>
            )}

            <span className="text-sm text-muted-foreground">
              {bookedStart
                ? `Bắt đầu dự kiến ${dayjs(bookedStart).format("HH:mm DD/MM/YYYY")}`
                : "Chưa có thông tin thời gian"}
            </span>
            {bookedStart && bookedEnd && (
              <span className="text-sm text-muted-foreground">
                ({bookedStart.format("HH:mm")} - {bookedEnd.format("HH:mm")})
              </span>
            )}
          </div>

          {planSnapshot && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm text-muted-foreground">Giá / người</p>
                <p className="font-medium">
                  {planSnapshot.pricePerPerson?.toLocaleString("vi-VN")}{" "}
                  {planSnapshot.currency || "VND"}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm text-muted-foreground">
                  Số người snapshot
                </p>
                <p className="font-medium">
                  {planSnapshot.peopleCount || 0} người
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm text-muted-foreground">Tổng dự kiến</p>
                <p className="font-medium">
                  {planSnapshot.totalPrice?.toLocaleString("vi-VN")}{" "}
                  {planSnapshot.currency || "VND"}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="booked-people-count">Số người</Label>
            <Input
              id="booked-people-count"
              type="number"
              min={1}
              value={peopleCount}
              onChange={(event) => setPeopleCount(event.target.value)}
              placeholder="Nhập số người"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booked-note">Ghi chú</Label>
            <Textarea
              id="booked-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ví dụ: khách đang chờ thêm bạn"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              loading={updateSessionMutation.isPending}
              onClick={() => updateSessionMutation.mutate("booked")}
            >
              Lưu booked
            </Button>
            <Button
              loading={updateSessionMutation.isPending}
              onClick={() => updateSessionMutation.mutate("in-use")}
            >
              Bắt đầu sử dụng
            </Button>
            <Button
              variant="secondary"
              loading={updateSessionMutation.isPending}
              onClick={() => updateSessionMutation.mutate("completed")}
            >
              Hoàn tất phiên
            </Button>
          </div>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CoffeeBookedModal;
