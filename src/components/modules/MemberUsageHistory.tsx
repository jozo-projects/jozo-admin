import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import membershipApis from "@/apis/membership.apis";
import { Button } from "@/components/ui/button";

const dateLabel = (value?: string) =>
  value
    ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "—";

export function MemberUsageHistory({
  memberId,
  onOpenBill,
}: {
  memberId: string;
  onOpenBill?: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const fieldId = useId();
  const [draft, setDraft] = useState({ from: "", to: "", search: "" });
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    search?: string;
  }>({});
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to);
  const applyFilters = () => {
    if (invalidRange) return;
    setPage(1);
    setFilters({
      startDate: draft.from
        ? new Date(`${draft.from}T00:00:00+07:00`).toISOString()
        : undefined,
      endDate: draft.to
        ? new Date(`${draft.to}T23:59:59.999+07:00`).toISOString()
        : undefined,
      search: draft.search.trim() || undefined,
    });
  };
  const query = useQuery({
    queryKey: ["member-usage-history", memberId, page, filters],
    queryFn: async () =>
      (await membershipApis.getMemberUsageHistory(memberId, page, 10, filters))
        .data.result,
    enabled: Boolean(memberId),
  });
  const data = query.data;
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Lịch sử sử dụng</h3>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalCount} phiên · {data.totalAmount.toLocaleString("vi-VN")}
            đ
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <Label htmlFor={`${fieldId}-search`}>Mã hóa đơn</Label>
          <Input
            id={`${fieldId}-search`}
            placeholder="Tìm mã hóa đơn"
            maxLength={100}
            value={draft.search}
            onChange={(event) =>
              setDraft({ ...draft, search: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyFilters();
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-from`}>Từ ngày lập hóa đơn</Label>
          <Input
            id={`${fieldId}-from`}
            type="date"
            value={draft.from}
            onChange={(event) =>
              setDraft({ ...draft, from: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${fieldId}-to`}>Đến ngày</Label>
          <Input
            id={`${fieldId}-to`}
            type="date"
            value={draft.to}
            onChange={(event) => setDraft({ ...draft, to: event.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={invalidRange}
          onClick={applyFilters}
        >
          Lọc
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDraft({ from: "", to: "", search: "" });
            setFilters({});
            setPage(1);
          }}
        >
          Xóa lọc
        </Button>
      </div>
      {invalidRange && (
        <p role="alert" className="text-sm text-destructive">
          Ngày bắt đầu phải trước ngày kết thúc.
        </p>
      )}
      {query.isLoading ? (
        <p className="text-sm">Đang tải lịch sử...</p>
      ) : query.isError ? (
        <div role="alert" className="text-sm">
          Không thể tải lịch sử.{" "}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
          >
            Thử lại
          </Button>
        </div>
      ) : !data?.items.length ? (
        <p className="text-sm text-muted-foreground">
          Không có hóa đơn phù hợp.
        </p>
      ) : (
        <div className="divide-y">
          {data.items.map((item) => (
            <div key={item.billId} className="space-y-1 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                {onOpenBill ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => onOpenBill(item.billId)}
                  >
                    {item.invoiceCode || "Mở hóa đơn"}
                  </Button>
                ) : (
                  <span className="font-medium">
                    {item.invoiceCode || "Hóa đơn"}
                  </span>
                )}
                <span className="font-medium">
                  {item.totalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <p>{item.roomName}</p>
              <p className="text-xs text-muted-foreground">
                {typeof item.pointsEarned === "number"
                  ? `Tích luỹ: ${item.pointsEarned.toLocaleString("vi-VN")} điểm`
                  : "Chưa có bản ghi tích điểm"}
              </p>
              <p className="text-xs text-muted-foreground">
                {dateLabel(item.startTime || item.createdAt)} →{" "}
                {dateLabel(item.endTime)}
              </p>
            </div>
          ))}
        </div>
      )}
      {data && data.totalCount > data.limit && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span>Trang {page}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * data.limit >= data.totalCount || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </section>
  );
}
