import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Headphones, Loader2 } from "lucide-react";
import type { SupportRequest } from "@/@types/SupportRequest";
import {
  useAcknowledgeSupportRequest,
  useCloseUnsupportedSupportRequest,
  useResolveSupportRequest,
} from "@/hooks/use-support-requests";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface SupportRequestModalProps {
  request: SupportRequest | null;
  roomName: string;
  onClose: () => void;
}

const SupportRequestModal: React.FC<SupportRequestModalProps> = ({
  request,
  roomName,
  onClose,
}) => {
  const { toast } = useToast();
  const [supportNote, setSupportNote] = useState("");
  const acknowledge = useAcknowledgeSupportRequest();
  const closeUnsupported = useCloseUnsupportedSupportRequest();
  const resolve = useResolveSupportRequest();

  useEffect(() => {
    if (!request || request.status !== "acknowledged") setSupportNote("");
  }, [request]);

  if (!request) return null;

  const isPending = request.status === "pending";
  const isAcknowledged = request.status === "acknowledged";
  const isNotSupported = request.status === "not_supported";
  const isSubmitting =
    acknowledge.isPending || closeUnsupported.isPending || resolve.isPending;

  const handleAcknowledge = () => {
    acknowledge.mutate(request.requestId, {
      onSuccess: () =>
        toast({
          title: "Đã nhận yêu cầu hỗ trợ",
          description: `Phòng ${roomName} sẽ thấy nhân viên đang đến hỗ trợ.`,
        }),
      onError: () =>
        toast({
          title: "Không thể nhận hỗ trợ",
          description: "Yêu cầu có thể đã hết hạn hoặc đã được xử lý.",
          variant: "destructive",
        }),
    });
  };

  const handleCloseUnsupported = () => {
    closeUnsupported.mutate(request.requestId, {
      onSuccess: () => {
        toast({ title: "Đã đóng yêu cầu chưa được hỗ trợ" });
        onClose();
      },
      onError: () =>
        toast({
          title: "Không thể đóng yêu cầu",
          description: "Vui lòng thử lại.",
          variant: "destructive",
        }),
    });
  };

  const handleResolve = () => {
    const note = supportNote.trim();
    if (!note) {
      toast({
        title: "Chưa nhập nội dung hỗ trợ",
        description:
          "Vui lòng ghi lại khách cần hỗ trợ vấn đề gì và đã xử lý ra sao.",
        variant: "destructive",
      });
      return;
    }

    resolve.mutate(
      { requestId: request.requestId, supportNote: note },
      {
        onSuccess: () => {
          toast({ title: "Đã kết thúc yêu cầu hỗ trợ" });
          onClose();
        },
        onError: () =>
          toast({
            title: "Không thể kết thúc hỗ trợ",
            description: "Vui lòng thử lại.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-red-500" />
            Yêu cầu hỗ trợ — {roomName}
          </DialogTitle>
          <DialogDescription>
            Ghi nhận đầy đủ nội dung để theo dõi lịch sử hỗ trợ của phòng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {isPending || isNotSupported ? (
                <Clock3 className="h-4 w-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              {isPending
                ? "Khách đang chờ xác nhận"
                : isNotSupported
                  ? "Chưa được hỗ trợ sau thời gian chờ"
                  : "Đã nhận hỗ trợ"}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {request.message || "Khách đang gọi nhân viên hỗ trợ."}
            </p>
          </div>

          {isAcknowledged && (
            <div className="space-y-2">
              <label htmlFor="support-note" className="text-sm font-medium">
                Nội dung hỗ trợ <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="support-note"
                value={supportNote}
                onChange={(event) => setSupportNote(event.target.value)}
                placeholder="Ví dụ: Khách báo hết pin remote, đã thay pin và kiểm tra lại thiết bị."
                rows={5}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Note này được lưu vào lịch sử để tracking các lần hỗ trợ.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isPending && (
            <Button onClick={handleAcknowledge} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Nhận hỗ trợ
            </Button>
          )}
          {isAcknowledged && (
            <Button
              onClick={handleResolve}
              disabled={isSubmitting || !supportNote.trim()}
            >
              {resolve.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Kết thúc hỗ trợ
            </Button>
          )}
          {isNotSupported && (
            <Button
              variant="destructive"
              onClick={handleCloseUnsupported}
              disabled={isSubmitting}
            >
              {closeUnsupported.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Đóng yêu cầu
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupportRequestModal;
