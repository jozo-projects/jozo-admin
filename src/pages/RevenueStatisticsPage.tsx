import billAPis from "@/apis/bill.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dayjs from "@/lib/dayjs";
import type { Dayjs } from "dayjs";
import { TrendingUp, History, Pencil } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
// import { formatCurrency } from "@/utils/formatters";
import {
  BillPaymentMethod,
  IBill,
  IBillPaymentMethodHistoryLog,
  IRevenueResult,
  RevenueBreakdown,
} from "@/@types/Bill";
import roomApis from "@/apis/room.apis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin, useIsStaff } from "@/hooks/usePermission";
import { formatCurrency } from "@/utils/formatters";
import {
  getFnbRevenue,
  normalizeRevenueBreakdown,
  REVENUE_CATEGORY_LABELS,
  resolveBillRevenueBreakdown,
  sumBillRevenueBreakdowns,
} from "@/utils/revenueBreakdown";
import { useMutation, useQuery } from "@tanstack/react-query";

interface BillItem {
  description: string;
  price: number;
  quantity: number;
  originalPrice?: number;
  discountName?: string;
  discountPercentage?: number;
  promotionId?: string;
}

const paymentMethodMap: Record<string, string> = {
  bank_transfer: "Chuyển khoản",
  Bank_Transfer: "Chuyển khoản",
  BANK_TRANSFER: "Chuyển khoản",
  "bank transfer": "Chuyển khoản",
  "Bank Transfer": "Chuyển khoản",
  "BANK TRANSFER": "Chuyển khoản",
  transfer: "Chuyển khoản",
  Transfer: "Chuyển khoản",
  TRANSFER: "Chuyển khoản",
  cash: "Tiền mặt",
  Cash: "Tiền mặt",
  CASH: "Tiền mặt",
  momo: "MoMo",
  MoMo: "MoMo",
  MOMO: "MoMo",
  zalo_pay: "Zalo Pay",
  Zalo_Pay: "Zalo Pay",
  ZALO_PAY: "Zalo Pay",
  vnpay: "VNPay",
  VNPay: "VNPay",
  VNPAY: "VNPay",
  visa: "Visa",
  Visa: "Visa",
  VISA: "Visa",
  mastercard: "Mastercard",
  Mastercard: "Mastercard",
  MASTERCARD: "Mastercard",
};

interface DateInfo {
  date?: string;
  formattedDate?: string;
  /** BE có thể trả (vd. mã kỳ); không có thì FE hiển thị theo dateRange */
  timeRange?: string;
  week?: number;
  year?: number;
  dateRange?: string;
  startDate?: Date;
  endDate?: Date;
  month?: string;
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/** Chuẩn hóa ngày chọn trên lịch về nửa đêm theo giờ VN */
const calendarDateStartVn = (selectedDate: Date): Dayjs => {
  const ymd = dayjs(selectedDate).format("YYYY-MM-DD");
  return dayjs.tz(ymd, VN_TZ).startOf("day");
};

/** Tuần T2–CN (cùng logic nhiều màn lịch trong app); FE gửi start/end ISO cho GET /bill/revenue */
const startOfWeekMondayVn = (dayVn: Dayjs): Dayjs => {
  const d = dayVn.startOf("day");
  const dow = d.day();
  if (dow === 0) return d.subtract(6, "day");
  return d.subtract(dow - 1, "day");
};

/**
 * Kỳ doanh thu tháng (6 → 5): từ 00:00 ngày 6 tháng M đến cuối ngày 5 tháng M+1 (giờ VN).
 * Ví dụ kỳ chứa 15/05: 06/05 → 05/06.
 */
const revenueMonthPeriod6To5Containing = (
  dayVn: Dayjs,
): { periodStart: Dayjs; defaultEndDay: Dayjs } => {
  const d = dayVn.startOf("day");
  const periodStart =
    d.date() >= 6
      ? d.date(6).startOf("day")
      : d.subtract(1, "month").date(6).startOf("day");
  const defaultEndDay = periodStart.add(1, "month").date(5).startOf("day");
  return { periodStart, defaultEndDay };
};

/** Date giữa trưa local để Calendar không lệch ngày khi parse */
const localDateFromYmd = (ymd: string): Date => {
  const [y, m, day] = ymd.split("-").map(Number);
  return new Date(y, m - 1, day, 12, 0, 0, 0);
};

const localDateFromDayjsVnDay = (d: Dayjs): Date =>
  localDateFromYmd(d.format("YYYY-MM-DD"));

const mapBillRevenueToState = (result: IRevenueResult) => {
  const startVn = dayjs.utc(result.startDate).tz(VN_TZ);
  const endVn = dayjs.utc(result.endDate).tz(VN_TZ);
  const byCategory = result.byCategory
    ? normalizeRevenueBreakdown(result.byCategory)
    : sumBillRevenueBreakdowns(result.bills);
  return {
    totalRevenue: result.totalRevenue,
    serviceRoomRevenue: result.serviceRoomRevenue ?? byCategory.SERVICE_ROOM,
    fnbRevenue: result.fnbRevenue ?? getFnbRevenue(byCategory),
    byCategory,
    billCount: result.billCount,
    bills: result.bills as RevenueBill[],
    dateInfo: {
      timeRange: result.timeRange,
      dateRange: result.dateRange,
      formattedDate: result.dateRange,
      startDate: startVn.toDate(),
      endDate: endVn.toDate(),
      month: startVn.format("MMMM"),
      year: startVn.year(),
    } satisfies DateInfo,
  };
};

type RevenueSummary = {
  totalRevenue: number;
  serviceRoomRevenue: number;
  fnbRevenue: number;
  byCategory: RevenueBreakdown;
  billCount: number;
  bills: RevenueBill[];
  dateInfo: DateInfo;
};

type RevenueData = {
  loading: boolean;
  error: string | null;
  data: RevenueSummary | null;
};

type RevenueBill = IBill & {
  source?: "karaoke" | "retail" | string;
  completedBy?: string;
  createdBy?: string;
  giftDiscountAmount?: number;
  membershipDiscountAmount?: number;
  gift?: {
    name?: string;
    type?: string;
    discountPercentage?: number;
    discountAmount?: number;
    items?: Array<{ name: string; quantity?: number }>;
  };
  streakGifts?: Array<{
    streakCount: number;
    items?: Array<{ name: string; quantity: number }>;
  }>;
};

type BenefitSource = "all" | "membership" | "gift" | "streak";

const getBillBenefit = (
  bill: RevenueBill,
): {
  source: Exclude<BenefitSource, "all">;
  label: string;
  reason: string;
} | null => {
  if (bill.streakGifts?.length) {
    const gifts = bill.streakGifts
      .flatMap((gift) => gift.items?.map((item) => `${item.name} x${item.quantity}`) || [])
      .join(", ");
    const milestones = bill.streakGifts
      .map((gift) => `${gift.streakCount} lần`)
      .join(", ");
    return {
      source: "streak",
      label: "Streak",
      reason: `Đạt streak ${milestones}${gifts ? ` — tặng ${gifts}` : ""}`,
    };
  }
  const streakLines = (
    bill as RevenueBill & {
      items?: Array<{ isStreakGift?: boolean; streakCount?: number }>;
    }
  ).items?.filter((item) => item.isStreakGift);
  if (streakLines?.length) {
    const milestones = Array.from(
      new Set(
        streakLines
          .map((item) => (item as { streakCount?: number }).streakCount)
          .filter((count): count is number => count !== undefined),
      ),
    )
      .map((count) => `${count} lần`)
      .join(", ");
    return {
      source: "streak",
      label: "Streak",
      reason: `Tặng quà streak${milestones ? ` — mốc ${milestones}` : ""}`,
    };
  }
  if (bill.gift || (bill.giftDiscountAmount || 0) > 0) {
    const giftName = bill.gift?.name || "Quà membership";
    const discount = bill.gift?.discountPercentage
      ? `giảm ${bill.gift.discountPercentage}%`
      : bill.gift?.discountAmount || bill.giftDiscountAmount
        ? `giảm ${formatCurrency(bill.gift?.discountAmount || bill.giftDiscountAmount || 0)}đ`
        : bill.gift?.items?.length
          ? `tặng ${bill.gift.items.map((item) => item.name).join(", ")}`
          : "được áp dụng";
    return {
      source: "gift",
      label: "Quà tặng",
      reason: `${giftName} — ${discount}`,
    };
  }
  if (
    bill.membershipDiscountAmount ||
    bill.membership?.discountPercentage ||
    bill.membership?.discountAmount
  ) {
    return {
      source: "membership",
      label: "Membership",
      reason:
        bill.membership?.note ||
        `Ưu đãi hạng ${bill.membership?.tier || "member"}`,
    };
  }
  return null;
};

const formatBillDate = (dateString: string) =>
  dayjs.utc(dateString).tz(VN_TZ).format("DD/MM/YYYY HH:mm");

const formatPaymentMethod = (method: string) =>
  paymentMethodMap[method] || method;

const StatCard = ({
  label,
  children,
  hint,
  accent,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) => (
  <Card>
    <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
      <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
      <p
        className={`text-base font-semibold sm:text-2xl ${
          accent ? "text-emerald-600" : ""
        }`}
      >
        {children}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] font-normal text-muted-foreground sm:text-xs">
          {hint}
        </p>
      ) : null}
    </CardContent>
  </Card>
);

const formatBreakdownAmount = (value: number) =>
  `${formatCurrency(value)} VNĐ`;

const BillRevenueBreakdownText = ({ bill }: { bill: RevenueBill }) => {
  const breakdown = resolveBillRevenueBreakdown(bill);
  return (
    <div className="mt-1 space-y-0.5 text-[11px] font-normal text-muted-foreground">
      <div>
        {REVENUE_CATEGORY_LABELS.SERVICE_ROOM}{" "}
        {formatCurrency(breakdown.SERVICE_ROOM)}
      </div>
      <div>
        F&B {formatCurrency(getFnbRevenue(breakdown))}
        {breakdown.FNB_RETAIL > 0 || breakdown.FNB_PREPARED > 0
          ? ` · ${REVENUE_CATEGORY_LABELS.FNB_RETAIL} ${formatCurrency(breakdown.FNB_RETAIL)} · ${REVENUE_CATEGORY_LABELS.FNB_PREPARED} ${formatCurrency(breakdown.FNB_PREPARED)}`
          : ""}
      </div>
      {breakdown.OTHER > 0 ? (
        <div>
          {REVENUE_CATEGORY_LABELS.OTHER} {formatCurrency(breakdown.OTHER)}
        </div>
      ) : null}
    </div>
  );
};

const RevenueSummaryCards = ({
  periodCards,
  stats,
  isStaff,
}: {
  periodCards: ReactNode;
  stats: Pick<
    RevenueSummary,
    | "totalRevenue"
    | "serviceRoomRevenue"
    | "fnbRevenue"
    | "byCategory"
    | "billCount"
  >;
  isStaff: boolean;
}) => (
  <div
    className={`grid grid-cols-2 gap-3 sm:gap-4 ${
      isStaff ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-5"
    }`}
  >
    {periodCards}
    {!isStaff && (
      <>
        <StatCard label="Tổng doanh thu" accent>
          {formatBreakdownAmount(stats.totalRevenue)}
        </StatCard>
        <StatCard label="Phí thu âm">
          {formatBreakdownAmount(stats.serviceRoomRevenue)}
        </StatCard>
        <StatCard
          label="F&B"
          hint={`${REVENUE_CATEGORY_LABELS.FNB_RETAIL} ${formatCurrency(stats.byCategory.FNB_RETAIL)} · ${REVENUE_CATEGORY_LABELS.FNB_PREPARED} ${formatCurrency(stats.byCategory.FNB_PREPARED)}${
            stats.byCategory.OTHER > 0
              ? ` · ${REVENUE_CATEGORY_LABELS.OTHER} ${formatCurrency(stats.byCategory.OTHER)}`
              : ""
          }`}
        >
          {formatBreakdownAmount(stats.fnbRevenue)}
        </StatCard>
      </>
    )}
    <StatCard label="Số lượng hóa đơn">{stats.billCount}</StatCard>
  </div>
);

interface BillsTableSectionProps {
  bills: RevenueBill[];
  roomsData?: Record<string, string>;
  isStaff: boolean;
  isAdmin: boolean;
  onBillClick: (billId: string) => void;
  onPaymentMethodEdit: (bill: RevenueBill) => void;
  onPaymentMethodHistory: (bill: RevenueBill) => void;
}

/** Bảng hóa đơn: dạng bảng trên desktop, dạng thẻ trên mobile */
const BillsTableSection = ({
  bills,
  roomsData,
  isStaff,
  isAdmin,
  onBillClick,
  onPaymentMethodEdit,
  onPaymentMethodHistory,
}: BillsTableSectionProps) => (
  <Card>
    <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
      <CardTitle className="text-base sm:text-lg">Chi tiết hóa đơn</CardTitle>
    </CardHeader>
    <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
      {/* Desktop: bảng */}
      <div className="hidden rounded-md border sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã hóa đơn</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Phòng</TableHead>
                <TableHead>Ưu đãi</TableHead>
                <TableHead>PT thanh toán</TableHead>
                <TableHead>Người hoàn tất</TableHead>
                <TableHead>Người tạo</TableHead>
                {!isStaff && (
                  <TableHead className="text-right">Số tiền</TableHead>
                )}
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill._id || "unknown"}>
                  <TableCell className="font-medium">
                    <button
                      className="text-blue-600 hover:underline focus:outline-none"
                      onClick={() => bill._id && onBillClick(bill._id)}
                    >
                      {bill.invoiceCode || "N/A"}
                    </button>
                  </TableCell>
                  <TableCell>
                    {formatBillDate(bill.createdAt.toString())}
                  </TableCell>
                  <TableCell>
                    {bill.source === "retail"
                      ? "Bán lẻ"
                      : roomsData?.[bill.roomId] || bill.roomId || "N/A"}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    {(() => {
                      const benefit = getBillBenefit(bill);
                      return benefit ? (
                        <>
                          <Badge variant={benefit.source === "streak" ? "outline" : "secondary"}>
                            {benefit.label}
                          </Badge>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {benefit.reason}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {formatPaymentMethod(bill.paymentMethod || "N/A")}
                  </TableCell>
                  <TableCell>{bill.completedBy || "N/A"}</TableCell>
                  <TableCell>{bill.createdBy || "N/A"}</TableCell>
                  {!isStaff && (
                    <TableCell className="text-right">
                      <div>{formatCurrency(bill.totalAmount)} VNĐ</div>
                      <BillRevenueBreakdownText bill={bill} />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPaymentMethodEdit(bill)}
                        aria-label={`Đổi phương thức thanh toán ${bill.invoiceCode || "hóa đơn"}`}
                      >
                        <Pencil className="mr-1 h-4 w-4" /> Đổi
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPaymentMethodHistory(bill)}
                          aria-label={`Xem lịch sử phương thức thanh toán ${bill.invoiceCode || "hóa đơn"}`}
                        >
                          <History className="mr-1 h-4 w-4" /> Log
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile: thẻ */}
      <div className="space-y-2 sm:hidden">
        {bills.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Không có hóa đơn
          </p>
        ) : (
          bills.map((bill) => (
            <div
              key={bill._id || "unknown"}
              className="rounded-md border p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  className="font-medium text-blue-600 hover:underline focus:outline-none"
                  onClick={() => bill._id && onBillClick(bill._id)}
                >
                  {bill.invoiceCode || "N/A"}
                </button>
                {!isStaff && (
                  <div className="text-right">
                    <span className="font-semibold">
                      {formatCurrency(bill.totalAmount)} VNĐ
                    </span>
                    <BillRevenueBreakdownText bill={bill} />
                  </div>
                )}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onPaymentMethodEdit(bill)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => onPaymentMethodHistory(bill)}
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Thời gian
                  </span>
                  <span>{formatBillDate(bill.createdAt.toString())}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Phòng
                  </span>
                  <span>
                    {bill.source === "retail"
                      ? "Bán lẻ"
                      : roomsData?.[bill.roomId] || bill.roomId || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    PT thanh toán
                  </span>
                  <span>
                    {formatPaymentMethod(bill.paymentMethod || "N/A")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Người hoàn tất
                  </span>
                  <span>{bill.completedBy || "N/A"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Người tạo
                  </span>
                  <span>{bill.createdBy || "N/A"}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

const RevenueStatisticsPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  /** Chỉ dùng tab tuần / tháng: ngày kết thúc kỳ (mặc định CN cùng tuần hoặc ngày 5 tháng sau của kỳ 6→5) */
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(() =>
    localDateFromYmd(dayjs().format("YYYY-MM-DD")),
  );
  const [activeTab, setActiveTab] = useState<string>("daily");
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [billDetailOpen, setBillDetailOpen] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("all");
  const [benefitSource, setBenefitSource] = useState<BenefitSource>("all");
  const isStaff = useIsStaff();
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  const [paymentMethodBill, setPaymentMethodBill] =
    useState<RevenueBill | null>(null);
  const [paymentMethodDialogOpen, setPaymentMethodDialogOpen] = useState(false);
  const [confirmPaymentMethodDialogOpen, setConfirmPaymentMethodDialogOpen] =
    useState(false);
  const [nextPaymentMethod, setNextPaymentMethod] =
    useState<BillPaymentMethod>("cash");
  const [historyBill, setHistoryBill] = useState<RevenueBill | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // Đảm bảo staff chỉ có thể xem tab "daily"
  useEffect(() => {
    if (isStaff && activeTab !== "daily") {
      setActiveTab("daily");
    }
  }, [isStaff, activeTab]);

  const weekStartKey = useMemo(
    () =>
      startOfWeekMondayVn(calendarDateStartVn(selectedDate)).format(
        "YYYY-MM-DD",
      ),
    [selectedDate],
  );

  const monthPeriodStartKey = useMemo(
    () =>
      revenueMonthPeriod6To5Containing(
        calendarDateStartVn(selectedDate),
      ).periodStart.format("YYYY-MM-DD"),
    [selectedDate],
  );

  // Đồng bộ ngày kết thúc mặc định khi đổi tab hoặc khi đổi tuần / kỳ tháng (6→5), không reset khi chỉ đổi ngày trong cùng tuần hoặc cùng kỳ
  useEffect(() => {
    if (activeTab !== "weekly") return;
    const mon = dayjs.tz(weekStartKey, VN_TZ).startOf("day");
    setSelectedEndDate(localDateFromDayjsVnDay(mon.add(6, "day")));
  }, [activeTab, weekStartKey]);

  useEffect(() => {
    if (activeTab !== "monthly") return;
    const periodStart = dayjs.tz(monthPeriodStartKey, VN_TZ).startOf("day");
    const defaultEndDay = periodStart.add(1, "month").date(5).startOf("day");
    setSelectedEndDate(localDateFromDayjsVnDay(defaultEndDay));
  }, [activeTab, monthPeriodStartKey]);

  const weekStartVn = useMemo(
    () => dayjs.tz(weekStartKey, VN_TZ).startOf("day"),
    [weekStartKey],
  );

  const monthPeriod6To5 = useMemo(
    () => revenueMonthPeriod6To5Containing(calendarDateStartVn(selectedDate)),
    [selectedDate],
  );

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
    select: (data) =>
      data.data.result?.reduce(
        (acc, room) => {
          acc[room._id] = room.roomName;
          return acc;
        },
        {} as Record<string, string>,
      ),
  });

  const { data: billDetail, isLoading: isLoadingBillDetail } = useQuery({
    queryKey: ["billDetail", selectedBill],
    queryFn: () => (selectedBill ? billAPis.getBillById(selectedBill) : null),
    enabled: !!selectedBill,
  });

  const {
    data: paymentMethodHistory,
    isLoading: isLoadingPaymentMethodHistory,
  } = useQuery({
    queryKey: ["billPaymentMethodHistory", historyBill?._id],
    queryFn: () =>
      historyBill ? billAPis.getPaymentMethodHistory(historyBill._id) : null,
    enabled: isAdmin && historyDialogOpen && !!historyBill?._id,
  });

  const handleBillClick = (billId: string) => {
    setSelectedBill(billId);
    setBillDetailOpen(true);
  };

  const [dailyRevenue, setDailyRevenue] = useState<RevenueData>({
    loading: false,
    error: null,
    data: null,
  });

  const [weeklyRevenue, setWeeklyRevenue] = useState<RevenueData>({
    loading: false,
    error: null,
    data: null,
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState<RevenueData>({
    loading: false,
    error: null,
    data: null,
  });

  const fetchDailyRevenue = useCallback(async () => {
    setDailyRevenue((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const d = calendarDateStartVn(selectedDate);
      const startIso = d.startOf("day").toISOString();
      const endIso = d.endOf("day").toISOString();
      const response = await billAPis.getBillRevenue(startIso, endIso);

      if (response?.data?.result) {
        setDailyRevenue({
          loading: false,
          error: null,
          data: mapBillRevenueToState(response.data.result),
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải dữ liệu doanh thu ngày";
      setDailyRevenue({
        loading: false,
        error: errorMessage,
        data: null,
      });
    }
  }, [selectedDate]);

  const fetchWeeklyRevenue = useCallback(async () => {
    setWeeklyRevenue((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const mon = weekStartVn;
      const endDay = calendarDateStartVn(selectedEndDate);
      const startIso = mon.startOf("day").toISOString();
      const endCandidate = endDay.endOf("day");
      const endIso = (endCandidate.isBefore(mon, "day") ? mon : endDay)
        .endOf("day")
        .toISOString();
      const response = await billAPis.getBillRevenue(startIso, endIso);

      if (response?.data?.result) {
        setWeeklyRevenue({
          loading: false,
          error: null,
          data: mapBillRevenueToState(response.data.result),
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải dữ liệu doanh thu tuần";
      setWeeklyRevenue({
        loading: false,
        error: errorMessage,
        data: null,
      });
    }
  }, [selectedEndDate, weekStartVn]);

  const fetchMonthlyRevenue = useCallback(async () => {
    setMonthlyRevenue((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { periodStart } = monthPeriod6To5;
      const endDay = calendarDateStartVn(selectedEndDate);
      const startIso = periodStart.startOf("day").toISOString();
      const endIso = (
        endDay.isBefore(periodStart, "day") ? periodStart : endDay
      )
        .endOf("day")
        .toISOString();
      const response = await billAPis.getBillRevenue(startIso, endIso);

      if (response?.data?.result) {
        setMonthlyRevenue({
          loading: false,
          error: null,
          data: mapBillRevenueToState(response.data.result),
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải dữ liệu doanh thu tháng";
      setMonthlyRevenue({
        loading: false,
        error: errorMessage,
        data: null,
      });
    }
  }, [monthPeriod6To5, selectedEndDate]);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyRevenue();
    } else if (activeTab === "weekly" && !isStaff) {
      fetchWeeklyRevenue();
    } else if (activeTab === "monthly" && !isStaff) {
      fetchMonthlyRevenue();
    }
  }, [
    activeTab,
    fetchDailyRevenue,
    fetchMonthlyRevenue,
    fetchWeeklyRevenue,
    isStaff,
  ]);

  const updatePaymentMethodMutation = useMutation({
    mutationFn: ({
      billId,
      paymentMethod,
    }: {
      billId: string;
      paymentMethod: BillPaymentMethod;
    }) => billAPis.updatePaymentMethod(billId, paymentMethod),
    onSuccess: () => {
      setConfirmPaymentMethodDialogOpen(false);
      setPaymentMethodDialogOpen(false);
      toast({
        title: "Thành công",
        description: "Đã cập nhật phương thức thanh toán.",
      });
      if (activeTab === "daily") fetchDailyRevenue();
      else if (activeTab === "weekly") fetchWeeklyRevenue();
      else fetchMonthlyRevenue();
    },
    onError: (error: unknown) => {
      toast({
        title: "Không thể cập nhật",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi.",
        variant: "destructive",
      });
    },
  });

  const handlePaymentMethodEdit = (bill: RevenueBill) => {
    if (!bill._id) return;
    const current =
      bill.paymentMethod === "bank_transfer" ? "bank_transfer" : "cash";
    setPaymentMethodBill(bill);
    setNextPaymentMethod(current);
    setPaymentMethodDialogOpen(true);
  };

  const handlePaymentMethodHistory = (bill: RevenueBill) => {
    if (!isAdmin || !bill._id) return;
    setHistoryBill(bill);
    setHistoryDialogOpen(true);
  };

  const handleContinuePaymentMethod = () => {
    if (!paymentMethodBill?._id) return;
    const current =
      paymentMethodBill.paymentMethod === "bank_transfer"
        ? "bank_transfer"
        : "cash";
    if (current === nextPaymentMethod) {
      toast({
        title: "Chưa có thay đổi",
        description: "Vui lòng chọn phương thức khác.",
      });
      return;
    }
    setPaymentMethodDialogOpen(false);
    setConfirmPaymentMethodDialogOpen(true);
  };

  const handleConfirmPaymentMethod = () => {
    if (!paymentMethodBill?._id || updatePaymentMethodMutation.isPending)
      return;
    updatePaymentMethodMutation.mutate({
      billId: paymentMethodBill._id,
      paymentMethod: nextPaymentMethod,
    });
  };

  const handleTabChange = (value: string) => {
    // Nếu là staff, chỉ cho phép tab "daily"
    if (isStaff && value !== "daily") {
      return;
    }
    setActiveTab(value);
    // Reset filter khi chuyển tab
    setSelectedPaymentMethod("all");
  };

  const sortBillsByEndTimeDesc = (bills: RevenueBill[]) => {
    return [...bills].sort((a, b) => {
      const endTimeA = dayjs(a.endTime).valueOf();
      const endTimeB = dayjs(b.endTime).valueOf();

      return endTimeB - endTimeA;
    });
  };

  // Lọc bills theo paymentMethod
  const filterBillsByPaymentMethod = (bills: RevenueBill[]) => {
    if (selectedPaymentMethod === "all") return bills;
    // value có thể là nhiều methods phân cách bởi dấu phẩy
    const methods = selectedPaymentMethod.split(",");
    return bills.filter((bill) => methods.includes(bill.paymentMethod));
  };

  const filterBillsByBenefitSource = (bills: RevenueBill[]) => {
    if (benefitSource === "all") return bills;
    return bills.filter(
      (bill) => getBillBenefit(bill)?.source === benefitSource,
    );
  };

  // Lấy tất cả các payment methods để hiển thị trong filter (không phụ thuộc vào dữ liệu)
  const getAllPaymentMethodOptions = () => {
    const methods = [
      { value: ["cash", "Cash", "CASH"], label: "Tiền mặt" },
      {
        value: [
          "bank_transfer",
          "Bank_Transfer",
          "BANK_TRANSFER",
          "bank transfer",
          "Bank Transfer",
          "BANK TRANSFER",
          "transfer",
          "Transfer",
          "TRANSFER",
        ],
        label: "Chuyển khoản",
      },
      { value: ["momo", "MoMo", "MOMO"], label: "MoMo" },
      { value: ["zalo_pay", "Zalo_Pay", "ZALO_PAY"], label: "Zalo Pay" },
      { value: ["vnpay", "VNPay", "VNPAY"], label: "VNPay" },
      { value: ["visa", "Visa", "VISA"], label: "Visa" },
      {
        value: ["mastercard", "Mastercard", "MASTERCARD"],
        label: "Mastercard",
      },
    ];

    return methods.map((opt) => ({
      value: opt.value.join(","),
      label: opt.label,
    }));
  };

  // Tính lại tổng doanh thu và số lượng hóa đơn sau khi filter
  const calculateFilteredStats = (data: RevenueSummary) => {
    const filteredBills = sortBillsByEndTimeDesc(
      filterBillsByBenefitSource(filterBillsByPaymentMethod(data.bills)),
    );
    const isUnfiltered =
      selectedPaymentMethod === "all" && benefitSource === "all";

    if (isUnfiltered) {
      return {
        filteredBills,
        totalRevenue: data.totalRevenue,
        serviceRoomRevenue: data.serviceRoomRevenue,
        fnbRevenue: data.fnbRevenue,
        byCategory: data.byCategory,
        billCount: data.billCount,
      };
    }

    const byCategory = sumBillRevenueBreakdowns(filteredBills);
    return {
      filteredBills,
      totalRevenue: filteredBills.reduce(
        (sum, bill) => sum + bill.totalAmount,
        0,
      ),
      serviceRoomRevenue: byCategory.SERVICE_ROOM,
      fnbRevenue: getFnbRevenue(byCategory),
      byCategory,
      billCount: filteredBills.length,
    };
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Thống kê doanh thu"
        description="Theo ngày; theo tuần (T2–CN, chọn thêm ngày kết thúc); theo kỳ tháng 6→5 (ngày 6 tháng này đến ngày 5 tháng sau, có thể chỉnh ngày kết thúc)"
        icon={TrendingUp}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start sm:w-auto sm:min-w-[9rem]"
            >
              {activeTab === "daily" && (
                <>
                  Ngày: {calendarDateStartVn(selectedDate).format("DD/MM/YYYY")}
                </>
              )}
              {activeTab === "weekly" && (
                <>Tuần từ (T2): {weekStartVn.format("DD/MM/YYYY")}</>
              )}
              {activeTab === "monthly" && (
                <>
                  Kỳ từ (ngày 6):{" "}
                  {monthPeriod6To5.periodStart.format("DD/MM/YYYY")}
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {!isStaff && (activeTab === "weekly" || activeTab === "monthly") && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start sm:w-auto sm:min-w-[9rem]"
              >
                Đến: {calendarDateStartVn(selectedEndDate).format("DD/MM/YYYY")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedEndDate}
                onSelect={(date) => date && setSelectedEndDate(date)}
                initialFocus
                disabled={(date) => {
                  const cell = calendarDateStartVn(date);
                  if (activeTab === "weekly") {
                    return cell.isBefore(weekStartVn, "day");
                  }
                  return cell.isBefore(monthPeriod6To5.periodStart, "day");
                }}
              />
            </PopoverContent>
          </Popover>
        )}

        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            if (activeTab === "daily") fetchDailyRevenue();
            else if (activeTab === "weekly") fetchWeeklyRevenue();
            else if (activeTab === "monthly") fetchMonthlyRevenue();
          }}
        >
          Làm mới
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <TabsList
            className={
              isStaff ? "w-full sm:w-auto" : "grid w-full grid-cols-3 sm:w-auto"
            }
          >
            <TabsTrigger value="daily">Ngày</TabsTrigger>
            {!isStaff && (
              <>
                <TabsTrigger value="weekly">Tuần</TabsTrigger>
                <TabsTrigger value="monthly">Tháng</TabsTrigger>
              </>
            )}
          </TabsList>

          {(dailyRevenue.data?.bills ||
            weeklyRevenue.data?.bills ||
            monthlyRevenue.data?.bills) && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Lọc theo PT thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {getAllPaymentMethodOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={benefitSource}
                onValueChange={(value) =>
                  setBenefitSource(value as BenefitSource)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Lọc ưu đãi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ưu đãi</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="gift">Quà tặng</SelectItem>
                  <SelectItem value="streak">Streak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <TabsContent value="daily">
          {dailyRevenue.loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          ) : dailyRevenue.error ? (
            <div className="text-red-500 p-4 text-center">
              {dailyRevenue.error}
            </div>
          ) : dailyRevenue.data ? (
            (() => {
              const { filteredBills, ...stats } =
                calculateFilteredStats(dailyRevenue.data);
              return (
                <div className="space-y-4 sm:space-y-6">
                  <RevenueSummaryCards
                    isStaff={isStaff}
                    stats={stats}
                    periodCards={
                      <StatCard label="Ngày">
                        {dailyRevenue.data.dateInfo.formattedDate}
                      </StatCard>
                    }
                  />

                  <BillsTableSection
                    bills={filteredBills}
                    roomsData={roomsData}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    onBillClick={handleBillClick}
                    onPaymentMethodEdit={handlePaymentMethodEdit}
                    onPaymentMethodHistory={handlePaymentMethodHistory}
                  />
                </div>
              );
            })()
          ) : (
            <div className="text-center p-8">
              Dữ liệu sẽ tự động tải theo ngày đã chọn
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly">
          {weeklyRevenue.loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          ) : weeklyRevenue.error ? (
            <div className="text-red-500 p-4 text-center">
              {weeklyRevenue.error}
            </div>
          ) : weeklyRevenue.data ? (
            (() => {
              const { filteredBills, ...stats } =
                calculateFilteredStats(weeklyRevenue.data);
              return (
                <div className="space-y-4 sm:space-y-6">
                  <RevenueSummaryCards
                    isStaff={isStaff}
                    stats={stats}
                    periodCards={
                      <StatCard label="Khoảng thời gian">
                        {weeklyRevenue.data.dateInfo.dateRange}
                      </StatCard>
                    }
                  />

                  <BillsTableSection
                    bills={filteredBills}
                    roomsData={roomsData}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    onBillClick={handleBillClick}
                    onPaymentMethodEdit={handlePaymentMethodEdit}
                    onPaymentMethodHistory={handlePaymentMethodHistory}
                  />
                </div>
              );
            })()
          ) : (
            <div className="text-center p-8">
              Dữ liệu sẽ tự động tải theo khoảng thời gian đã chọn
            </div>
          )}
        </TabsContent>

        <TabsContent value="monthly">
          {monthlyRevenue.loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          ) : monthlyRevenue.error ? (
            <div className="text-red-500 p-4 text-center">
              {monthlyRevenue.error}
            </div>
          ) : monthlyRevenue.data ? (
            (() => {
              const { filteredBills, ...stats } =
                calculateFilteredStats(monthlyRevenue.data);
              return (
                <div className="space-y-4 sm:space-y-6">
                  <RevenueSummaryCards
                    isStaff={isStaff}
                    stats={stats}
                    periodCards={
                      <>
                        <StatCard label="Kỳ / nhãn">
                          {monthlyRevenue.data.dateInfo.timeRange ??
                            `${monthlyRevenue.data.dateInfo.month} ${monthlyRevenue.data.dateInfo.year}`}
                        </StatCard>
                        <StatCard label="Khoảng thời gian">
                          {monthlyRevenue.data.dateInfo.dateRange}
                        </StatCard>
                      </>
                    }
                  />

                  <BillsTableSection
                    bills={filteredBills}
                    roomsData={roomsData}
                    isStaff={isStaff}
                    isAdmin={isAdmin}
                    onBillClick={handleBillClick}
                    onPaymentMethodEdit={handlePaymentMethodEdit}
                    onPaymentMethodHistory={handlePaymentMethodHistory}
                  />
                </div>
              );
            })()
          ) : (
            <div className="text-center p-8">
              Dữ liệu sẽ tự động tải theo kỳ tháng đã chọn
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal chi tiết hóa đơn */}
      <Dialog
        open={paymentMethodDialogOpen}
        onOpenChange={setPaymentMethodDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi phương thức thanh toán</DialogTitle>
            <DialogDescription>
              Hóa đơn {paymentMethodBill?.invoiceCode || "N/A"}. Chọn phương
              thức mới rồi tiếp tục xác nhận.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={nextPaymentMethod}
            onValueChange={(value) =>
              setNextPaymentMethod(value as BillPaymentMethod)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn phương thức" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Tiền mặt</SelectItem>
              <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentMethodDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={handleContinuePaymentMethod}>Tiếp tục</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmPaymentMethodDialogOpen}
        onOpenChange={setConfirmPaymentMethodDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đổi phương thức</DialogTitle>
            <DialogDescription>
              Xác nhận đổi hóa đơn {paymentMethodBill?.invoiceCode || "N/A"}{" "}
              sang {nextPaymentMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPaymentMethodDialogOpen(false)}
              disabled={updatePaymentMethodMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmPaymentMethod}
              disabled={updatePaymentMethodMutation.isPending}
            >
              {updatePaymentMethodMutation.isPending
                ? "Đang cập nhật..."
                : "Xác nhận đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lịch sử phương thức thanh toán</DialogTitle>
            <DialogDescription>
              Hóa đơn {historyBill?.invoiceCode || "N/A"} · Chuỗi hash:{" "}
              {paymentMethodHistory?.data.result?.chainValid
                ? "Hợp lệ"
                : "Không hợp lệ"}
            </DialogDescription>
          </DialogHeader>
          {isLoadingPaymentMethodHistory ? (
            <div className="py-6 text-center">
              <Spinner />
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {(paymentMethodHistory?.data.result?.logs || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có lịch sử thay đổi.
                </p>
              ) : (
                (paymentMethodHistory?.data.result?.logs || []).map(
                  (log: IBillPaymentMethodHistoryLog) => (
                    <div
                      key={log._id || log.hash}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>
                          {log.fromPaymentMethod
                            ? formatPaymentMethod(log.fromPaymentMethod)
                            : "Khởi tạo"}{" "}
                          → {formatPaymentMethod(log.toPaymentMethod)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatBillDate(log.changedAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Bởi: {log.changedByName || log.changedBy} (
                        {log.changedByRole})
                      </div>
                      <div className="mt-2 break-all font-mono text-[11px]">
                        hash: {log.hash}
                        <br />
                        previousHash: {log.previousHash || "null"}
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={billDetailOpen} onOpenChange={setBillDetailOpen}>
        <DialogContent className="grid-cols-1 sm:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>Chi tiết hóa đơn</span>
              {billDetail?.data?.result?.invoiceCode && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {billDetail.data.result.invoiceCode}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>Thông tin chi tiết về hóa đơn</DialogDescription>
          </DialogHeader>
          {isLoadingBillDetail ? (
            <div className="py-6 flex justify-center">
              <Spinner />
            </div>
          ) : billDetail && billDetail.data && billDetail.data.result ? (
            <div className="rounded-md border text-sm">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 sm:grid-cols-4">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Phòng
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.roomName || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Loại phòng
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.roomType || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Ngày tạo
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.formattedCreatedAt || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Khách hàng
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.customerName || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Số điện thoại
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.phone ||
                      billDetail.data.result.customerPhone ||
                      "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Bắt đầu
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.formattedStartTime || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Kết thúc
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.formattedEndTime || "—"}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Thời lượng
                  </span>
                  <span className="break-words font-medium">
                    {billDetail.data.result.usageDuration || "0"} giờ
                  </span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[11px] text-muted-foreground">
                    Thanh toán
                  </span>
                  <span className="break-words font-medium">
                    {formatPaymentMethod(
                      billDetail.data.result.paymentMethod || "—",
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t" />

              {/* Danh sách món */}
              <div className="p-3">
                <div className="flex items-center gap-2 border-b pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="min-w-0 flex-1">Tên</span>
                  <span className="w-10 shrink-0 text-right">SL</span>
                  <span className="hidden w-20 shrink-0 text-right sm:block">
                    Đơn giá
                  </span>
                  <span className="w-24 shrink-0 text-right">Thành tiền</span>
                </div>
                {billDetail.data.result.items &&
                billDetail.data.result.items.length > 0 ? (
                  <div className="divide-y">
                    {billDetail.data.result.items.map(
                      (item: BillItem, index: number) => (
                        <div key={index} className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate">{item.description}</p>
                              <p className="text-[11px] text-muted-foreground sm:hidden">
                                {formatCurrency(item.price)}/đv
                              </p>
                            </div>
                            <span className="w-10 shrink-0 text-right">
                              {item.quantity}
                            </span>
                            <span className="hidden w-20 shrink-0 text-right text-muted-foreground sm:block">
                              {formatCurrency(item.price)}
                            </span>
                            <span className="w-24 shrink-0 text-right font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                          {item.discountName && item.discountPercentage ? (
                            <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-emerald-600">
                              <span className="min-w-0 truncate">
                                - {item.discountName} ({item.discountPercentage}
                                %)
                              </span>
                              <span className="shrink-0">
                                -
                                {formatCurrency(
                                  ((item.originalPrice || item.price) *
                                    item.quantity *
                                    (item.discountPercentage || 0)) /
                                    100,
                                )}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Không có chi tiết đơn hàng
                  </p>
                )}
              </div>

              {/* Ưu đãi giờ miễn phí */}
              {billDetail.data.result.freeHourPromotion ? (
                <>
                  <div className="border-t" />
                  <div className="space-y-1 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Ưu đãi giờ miễn phí
                    </p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Phút miễn phí áp dụng
                      </span>
                      <span className="font-medium">
                        {billDetail.data.result.freeHourPromotion
                          .freeMinutesApplied || 0}{" "}
                        phút
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Giá trị miễn phí
                      </span>
                      <span className="font-medium text-emerald-600">
                        -
                        {formatCurrency(
                          billDetail.data.result.freeHourPromotion.freeAmount ||
                            0,
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="border-t" />

              {/* Tổng tiền */}
              <div className="flex items-center justify-between p-3 text-base font-semibold">
                <span>Tổng tiền</span>
                <span>
                  {formatCurrency(billDetail.data.result.totalAmount || 0)} VNĐ
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-red-500">
              Không thể tải thông tin hóa đơn
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueStatisticsPage;
