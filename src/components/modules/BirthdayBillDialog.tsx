import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import billApis from "@/apis/bill.apis";
import { useQuery } from "@tanstack/react-query";
import { BirthdaySnapshotDetails } from "./BirthdaySnapshotDetails";
export function BirthdayBillDialog({
  billId,
  onClose,
}: {
  billId: string | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["bill-details", billId],
    queryFn: () => billApis.getBillById(billId!),
    enabled: !!billId,
  });
  const bill = query.data?.data.result;
  return (
    <Dialog
      open={!!billId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bill?.invoiceCode || "Hóa đơn"}</DialogTitle>
        </DialogHeader>
        {query.isFetching ? (
          <p>Đang tải hóa đơn...</p>
        ) : query.isError ? (
          <div role="alert">
            Không thể tải hóa đơn.{" "}
            <Button
              type="button"
              variant="outline"
              onClick={() => void query.refetch()}
            >
              Thử lại
            </Button>
          </div>
        ) : bill ? (
          <div className="space-y-3 text-sm">
            <p>Phòng: {bill.roomName || "—"}</p>
            <p>Tổng: {bill.totalAmount.toLocaleString("vi-VN")}đ</p>
            {bill.birthday && (
              <BirthdaySnapshotDetails birthday={bill.birthday} />
            )}
            {bill.items?.map((item, index) => (
              <p key={index}>
                {item.description} ×{item.quantity} —{" "}
                {item.price.toLocaleString("vi-VN")}đ
              </p>
            ))}
          </div>
        ) : (
          <p>Không tìm thấy hóa đơn.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
