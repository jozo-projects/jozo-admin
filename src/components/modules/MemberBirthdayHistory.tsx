import { useState } from "react";
import { useMemberBirthdayHistory } from "@/hooks/use-member-birthday";
import { BirthdaySnapshotDetails } from "./BirthdaySnapshotDetails";
import { Button } from "@/components/ui/button";
export function MemberBirthdayHistory({
  memberId,
  onOpenBill,
}: {
  memberId: string;
  onOpenBill: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const query = useMemberBirthdayHistory(memberId, page);
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">Lịch sử ưu đãi sinh nhật</h3>
      <p className="text-xs text-muted-foreground">
        Thông tin tại thời điểm sử dụng, không tính lại theo cấu hình hiện tại.
      </p>
      {query.isLoading ? (
        <p>Đang tải lịch sử...</p>
      ) : query.isError ? (
        <div role="alert">
          Không thể tải lịch sử.{" "}
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : !query.data?.items.length ? (
        <p className="text-sm text-muted-foreground">
          Chưa sử dụng ưu đãi sinh nhật.
        </p>
      ) : (
        query.data.items.map((item) => (
          <div key={item.billId} className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                {new Date(item.birthday.appliedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </span>
              <Button
                type="button"
                variant="link"
                onClick={() => onOpenBill(item.billId)}
              >
                {item.invoiceCode || "Mở hóa đơn"}
              </Button>
            </div>
            <BirthdaySnapshotDetails birthday={item.birthday} />
            <p className="text-sm">
              Tổng bill: {item.totalAmount.toLocaleString("vi-VN")}đ
            </p>
          </div>
        ))
      )}
      <div className="flex items-center justify-between gap-2 text-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || query.isFetching}
          onClick={() => setPage((value) => value - 1)}
        >
          Trước
        </Button>
        <span>
          Trang {page} · {query.data?.totalCount ?? 0} lượt
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            !query.data ||
            page * query.data.limit >= query.data.totalCount ||
            query.isFetching
          }
          onClick={() => setPage((value) => value + 1)}
        >
          Sau
        </Button>
      </div>
    </section>
  );
}
