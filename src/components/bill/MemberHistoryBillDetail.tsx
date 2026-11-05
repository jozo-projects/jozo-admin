import type billAPis from "@/apis/bill.apis";

type Bill = NonNullable<Awaited<ReturnType<typeof billAPis.getBillById>>["data"]["result"]>;
const money = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} đ`
    : "—";

export function MemberHistoryBillDetail({ bill }: { bill: Bill }) {
  const info = [
    ["Phòng", bill.roomName],
    ["Loại phòng", bill.roomType],
    ["Khách hàng", bill.customerName || bill.membership?.name],
    [
      "Số điện thoại",
      bill.customerPhone || bill.phone || bill.membership?.phone,
    ],
    ["Ngày lập", bill.formattedCreatedAt],
    ["Bắt đầu", bill.formattedStartTime],
    ["Kết thúc", bill.formattedEndTime],
    [
      "Thời lượng",
      bill.usageDuration ? `${bill.usageDuration} giờ` : undefined,
    ],
    [
      "Thanh toán",
      bill.paymentMethod === "cash"
        ? "Tiền mặt"
        : bill.paymentMethod === "bank_transfer"
          ? "Chuyển khoản"
          : bill.paymentMethod,
    ],
    ["Hạng thành viên", bill.membership?.tier],
  ];
  return (
    <div className="min-w-0 space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-3 rounded-md border p-3 sm:grid-cols-3">
        {info.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="p-3 text-left">Chi tiết</th>
              <th className="p-3 text-right">SL</th>
              <th className="p-3 text-right">Đơn giá</th>
              <th className="p-3 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bill.items?.length ? (
              bill.items.map((item, index) => (
                <tr key={index}>
                  <td className="min-w-32 p-3">
                    <p>{item.description}</p>
                    {item.discountName && (
                      <p className="text-xs text-muted-foreground">
                        {item.discountName}
                        {typeof item.discountPercentage === "number"
                          ? ` · ${item.discountPercentage}%`
                          : ""}
                      </p>
                    )}
                    {item.isStreakGift && (
                      <p className="text-xs text-muted-foreground">
                        Quà streak
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right">{item.quantity}</td>
                  <td className="whitespace-nowrap p-3 text-right">
                    {money(item.price)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-medium">
                    {money(
                      item.netAmount ??
                        item.grossAmount ??
                        item.price * item.quantity,
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-muted-foreground"
                >
                  Hóa đơn chưa lưu chi tiết các dòng tiền.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <dl className="space-y-2 rounded-md border p-3">
        {bill.activePromotion?.name && (
          <div className="flex justify-between gap-3">
            <dt>Khuyến mãi</dt>
            <dd>{bill.activePromotion.name}</dd>
          </div>
        )}
        {bill.gift?.name && (
          <div className="flex justify-between gap-3">
            <dt>Quà áp dụng</dt>
            <dd>{bill.gift.name}</dd>
          </div>
        )}
        {typeof bill.membershipDiscountAmount === "number" && (
          <div className="flex justify-between gap-3">
            <dt>Giảm giá thành viên</dt>
            <dd>{money(bill.membershipDiscountAmount)}</dd>
          </div>
        )}
        {typeof bill.giftDiscountAmount === "number" && (
          <div className="flex justify-between gap-3">
            <dt>Giảm giá quà tặng</dt>
            <dd>{money(bill.giftDiscountAmount)}</dd>
          </div>
        )}
        {typeof bill.freeHourPromotion?.freeAmount === "number" && (
          <div className="flex justify-between gap-3">
            <dt>
              Ưu đãi giờ miễn phí
              {typeof bill.freeHourPromotion.freeMinutesApplied === "number"
                ? ` (${bill.freeHourPromotion.freeMinutesApplied} phút)`
                : ""}
            </dt>
            <dd>{money(bill.freeHourPromotion.freeAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
          <dt>Tổng thanh toán</dt>
          <dd>{money(bill.totalAmount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Điểm tích luỹ từ hóa đơn</dt>
          <dd className="text-right font-medium">
            {typeof bill.pointsEarned === "number"
              ? `${bill.pointsEarned.toLocaleString("vi-VN")} điểm`
              : "Chưa có bản ghi tích điểm"}
          </dd>
        </div>
      </dl>
      {bill.note && (
        <p className="whitespace-pre-wrap break-words text-muted-foreground">
          Ghi chú: {bill.note}
        </p>
      )}
    </div>
  );
}
