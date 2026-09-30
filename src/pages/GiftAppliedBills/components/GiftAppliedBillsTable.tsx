import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import {
  SOURCE_META,
  type GiftAppliedBillItem,
} from "../constants";

interface GiftAppliedBillsTableProps {
  items: GiftAppliedBillItem[];
  page: number;
  totalPages: number;
  total: number;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value: number) => `${formatCurrency(value || 0)} VNĐ`;

const AppliedSourceBadge = ({
  source,
}: {
  source: GiftAppliedBillItem["appliedSource"];
}) => {
  const meta = SOURCE_META[source];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};

const GiftAppliedBillsTable = ({
  items,
  page,
  totalPages,
  total,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onPageChange,
}: GiftAppliedBillsTableProps) => {
  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-md border">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 rounded-md border p-10 text-center text-sm text-destructive">
        Không thể tải danh sách bill ưu đãi.
        <div>
          <Button type="button" variant="outline" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Mã bill</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Phòng</TableHead>
              <TableHead>Nguồn / loại</TableHead>
              <TableHead>Vì sao được ưu đãi</TableHead>
              <TableHead>Giảm</TableHead>
              <TableHead>Tổng bill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  Không có bill nào trong bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(item.endTime)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.invoiceCode}
                  </TableCell>
                  <TableCell>
                    {item.customerName || "-"}
                    <div className="text-xs text-muted-foreground">
                      {item.customerPhone}
                    </div>
                    {item.memberTier && (
                      <Badge variant="outline" className="mt-1">
                        {item.memberTier}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{item.roomName}</TableCell>
                  <TableCell className="space-y-1">
                    <AppliedSourceBadge source={item.appliedSource} />
                    <div className="text-xs text-muted-foreground">
                      {item.appliedKind === "fnb"
                        ? "F&B / tặng món"
                        : "Giảm giá"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium">{item.giftName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.appliedReason}
                    </div>
                    {item.appliedSource === "streak" &&
                      item.streakGifts?.map((streak) => (
                        <div
                          key={streak.streakCount}
                          className="mt-1 flex items-center gap-1 text-xs text-violet-600"
                        >
                          <Zap className="h-3 w-3" />
                          Mốc {streak.streakCount}:{" "}
                          {streak.items
                            .map((gift) => `${gift.name} ×${gift.quantity}`)
                            .join(", ")}
                        </div>
                      ))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMoney(
                      item.giftDiscountAmount + item.membershipDiscountAmount,
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMoney(item.totalAmount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {page}/{totalPages} · {total} bill
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftAppliedBillsTable;
