import { PageHeader } from "@/components/shared";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Award,
  CalendarIcon,
  Gift,
  Mail,
  Phone,
  UserCog,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpdateUserRequest, User } from "@/@types/user";
import { useUsers } from "@/hooks/use-users";
import { useRouter, useParams } from "@tanstack/react-router";
import PATHS from "@/constants/paths";
import { format } from "date-fns";
import {
  useUpdateMemberPoints,
  useUpdateMemberStreak,
  usePendingGifts,
  useMemberStreakInfo,
} from "@/hooks/use-membership";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const toDateTimeLocalValue = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Schema cho form cập nhật user
const updateUserSchema = z
  .object({
    name: z.string().min(1, "Tên là bắt buộc"),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    date_of_birth: z.coerce.date({
      required_error: "Ngày sinh là bắt buộc",
      invalid_type_error: "Ngày sinh không hợp lệ",
    }),
    phone_number: z
      .string()
      .regex(/^\d{10,11}$/, "Số điện thoại phải gồm 10-11 chữ số"),
    probationStartLocal: z.string().optional(),
    probationEndLocal: z.string().optional(),
    probationHourlyRateStr: z.string().optional(),
    probationHolidayMultiplierStr: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const m = data.probationHolidayMultiplierStr?.trim();
    if (!m) return;
    const n = Number(m.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hệ số ngày lễ (thử việc) phải từ 0 đến 20",
        path: ["probationHolidayMultiplierStr"],
      });
    }
  });

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

const updatePointsSchema = z.object({
  points: z.coerce.number().int().min(0, "Điểm không được âm"),
  reason: z.string().optional(),
});

type UpdatePointsFormData = z.infer<typeof updatePointsSchema>;

const updateStreakSchema = z.object({
  count: z.coerce.number().min(0, "Streak không được âm"),
});

type UpdateStreakFormData = z.infer<typeof updateStreakSchema>;

const EditUserForm = () => {
  const router = useRouter();
  const userParams = useParams({ from: "/users-management/$id/edit" });
  const id = userParams.id;
  const [activeSection, setActiveSection] = useState("overview");
  const { updateUser, useUserById, useUserMembership, isUpdatingUser } =
    useUsers();
  const { mutate: updateMemberPoints, isPending: isUpdatingMemberPoints } =
    useUpdateMemberPoints(id);
  const { mutate: updateMemberStreak, isPending: isUpdatingMemberStreak } =
    useUpdateMemberStreak(id);

  const { data: userData, isLoading: isLoadingUser } = useUserById(id || "");
  const { data: membershipData, isLoading: isLoadingMembership } =
    useUserMembership(id || "");

  const user = userData?.data?.result as User | undefined;
  const membershipDetail = membershipData?.data?.result;

  // Lấy thông tin quà của user
  const { data: pendingGiftsData, isLoading: isLoadingGifts } = usePendingGifts(
    user?.phone_number,
  );

  // Lấy thông tin streak và quà đã claim
  const { data: streakInfoData, isLoading: isLoadingStreakInfo } =
    useMemberStreakInfo(id);

  const formatNumber = (value?: number) =>
    typeof value === "number" ? value.toLocaleString("vi-VN") : "—";

  const membershipPoints =
    membershipDetail?.user?.availablePoint ??
    membershipDetail?.user?.points ??
    membershipDetail?.user?.loyalty_points ??
    membershipDetail?.user?.loyalty;

  const membershipStreak =
    membershipDetail?.user?.streak ?? membershipDetail?.user?.current_streak;

  const membershipTier =
    (typeof membershipDetail?.progress?.currentTier === "string"
      ? membershipDetail.progress.currentTier
      : membershipDetail?.progress?.currentTier?.tier) ??
    membershipDetail?.user?.tier ??
    "Chưa có";

  const nextTier = membershipDetail?.progress?.nextTier;
  const nextTierLabel = nextTier
    ? `${nextTier.tier}${
        typeof nextTier.required === "number"
          ? ` (cần thêm ${formatNumber(nextTier.required)} điểm)`
          : ""
      }`
    : "Đã ở hạng cao nhất";

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",

      email: "",
      date_of_birth: undefined,
      phone_number: "",
      probationStartLocal: "",
      probationEndLocal: "",
      probationHourlyRateStr: "",
      probationHolidayMultiplierStr: "",
    },
  });

  const normalizePhone = (value: string) =>
    value.replace(/\D/g, "").slice(0, 11);

  const pointsForm = useForm<UpdatePointsFormData>({
    resolver: zodResolver(updatePointsSchema),
    defaultValues: { points: 0, reason: "" },
  });

  const streakForm = useForm<UpdateStreakFormData>({
    resolver: zodResolver(updateStreakSchema),
    defaultValues: { count: 0 },
  });

  // Cập nhật form khi có dữ liệu user
  useEffect(() => {
    if (user && user._id) {
      form.reset({
        name: user.name || user.full_name || "",

        email: user.email || "",
        date_of_birth: new Date(user.date_of_birth),
        phone_number: user.phone_number,
        probationStartLocal: toDateTimeLocalValue(user.probationStartDate),
        probationEndLocal: toDateTimeLocalValue(user.probationEndDate),
        probationHourlyRateStr:
          user.probationHourlyRate != null &&
          !Number.isNaN(user.probationHourlyRate)
            ? String(user.probationHourlyRate)
            : "",
        probationHolidayMultiplierStr:
          user.probationHolidayMultiplier != null &&
          !Number.isNaN(user.probationHolidayMultiplier)
            ? String(user.probationHolidayMultiplier)
            : "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    const currentPoints = membershipDetail?.user?.availablePoint;
    if (typeof currentPoints === "number") {
      pointsForm.reset({ points: currentPoints, reason: "" });
    }
  }, [membershipDetail?.user?.availablePoint, pointsForm]);

  // Cập nhật streak form khi có dữ liệu membership
  useEffect(() => {
    if (membershipStreak !== undefined) {
      streakForm.reset({ count: membershipStreak });
    }
  }, [membershipStreak, streakForm]);

  const onSubmit = (data: UpdateUserFormData) => {
    if (!id) return;

    const parseRate = (raw?: string): number | null => {
      const t = raw?.trim();
      if (!t) return null;
      const n = Number(t.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ""));
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    };

    const parseMultiplier = (raw?: string): number | null => {
      const t = raw?.trim();
      if (!t) return null;
      const n = Number(t.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 20) return null;
      return n;
    };

    const updateData: UpdateUserRequest = {
      name: data.name,

      email: data.email || undefined,
      date_of_birth: data.date_of_birth,
      phone_number: data.phone_number,
      probationStartDate: data.probationStartLocal?.trim()
        ? new Date(data.probationStartLocal).toISOString()
        : null,
      probationEndDate: data.probationEndLocal?.trim()
        ? new Date(data.probationEndLocal).toISOString()
        : null,
      probationHourlyRate: parseRate(data.probationHourlyRateStr),
      probationHolidayMultiplier: parseMultiplier(
        data.probationHolidayMultiplierStr,
      ),
    };

    updateUser(
      { id, data: updateData },
      {
        onSuccess: () => {
          router.navigate({ to: PATHS.USERS_MANAGEMENT });
        },
      },
    );
  };

  const onSubmitPoints = (data: UpdatePointsFormData) => {
    if (!id) return;
    updateMemberPoints(data, {
      onSuccess: () => pointsForm.reset({ points: 0, reason: "" }),
    });
  };

  const onSubmitStreak = (data: UpdateStreakFormData) => {
    if (!id) return;
    updateMemberStreak(data);
  };

  const onResetStreak = () => {
    if (!id) return;
    if (window.confirm("Bạn có chắc chắn muốn reset streak về 0?")) {
      updateMemberStreak({ reset: true });
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Chỉnh sửa User"
        description="Ưu tiên kiểm tra trạng thái member trước, sau đó mới cập nhật hồ sơ"
        icon={UserCog}
        showBackButton
        backUrl={PATHS.USERS_MANAGEMENT}
      />
      <Tabs
        value={activeSection}
        onValueChange={setActiveSection}
        className="mx-auto w-full max-w-5xl"
      >
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="overview" className="py-2.5">
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="membership" className="py-2.5">
            Membership & quà
          </TabsTrigger>
          <TabsTrigger value="profile" className="py-2.5">
            Hồ sơ & thử việc
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Member</p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {user?.name || user?.full_name || "Đang tải thông tin..."}
                  </h2>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {user?.phone_number || "Chưa có số điện thoại"}
                    </span>
                    {user?.email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection("membership")}
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Xem membership
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">Điểm hiện có</div>
                <div className="mt-1 text-2xl font-semibold">
                  {formatNumber(membershipPoints)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">Hạng hiện tại</div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                  <Award className="h-5 w-5 text-primary" />
                  {membershipTier}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-sm text-muted-foreground">Streak hiện tại</div>
                <div className="mt-1 text-2xl font-semibold">
                  {streakInfoData?.streak?.count ?? membershipStreak ?? "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {streakInfoData?.streak?.isActive
                    ? "Đang hoạt động"
                    : "Kiểm tra trạng thái streak"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Cần chú ý</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Xem nhanh mốc quà đã nhận và quà đang chờ phát trong tab Membership & quà.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setActiveSection("membership")}
                >
                  Mở chi tiết
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership" className="space-y-6">
          <Card>
        <CardContent className="pt-6">
          {isLoadingMembership ? (
            <div className="text-muted-foreground">
              Đang tải thông tin membership...
            </div>
          ) : membershipDetail ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Điểm</div>
                <div className="text-2xl font-semibold">
                  {formatNumber(membershipPoints)}
                </div>
              </div>
              <div className="space-y-1 rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">
                  Loyalty / Hạng hiện tại
                </div>
                <div className="text-2xl font-semibold">{membershipTier}</div>
              </div>
              <div className="space-y-1 rounded-lg border p-4 sm:col-span-2">
                <div className="text-sm text-muted-foreground">
                  Hạng kế tiếp
                </div>
                <div className="text-lg font-medium leading-tight">
                  {nextTierLabel}
                </div>
              </div>
              <div className="sm:col-span-2 border-t pt-4 space-y-4">
                <div>
                  <div className="text-base font-semibold">Cập nhật Streak</div>
                  <p className="text-sm text-muted-foreground">
                    Thiết lập số lượng streak hiện tại cho thành viên này.
                  </p>
                </div>
                <form
                  onSubmit={streakForm.handleSubmit(onSubmitStreak)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="streak-count">Streak *</Label>
                    <Input
                      id="streak-count"
                      type="number"
                      step="1"
                      min="0"
                      {...streakForm.register("count")}
                      placeholder="Nhập số streak"
                    />
                    {streakForm.formState.errors.count && (
                      <p className="text-sm text-red-500">
                        {streakForm.formState.errors.count.message}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isUpdatingMemberStreak}
                    >
                      {isUpdatingMemberStreak
                        ? "Đang cập nhật..."
                        : "Cập nhật Streak"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={onResetStreak}
                      disabled={isUpdatingMemberStreak}
                    >
                      Reset Streak
                    </Button>
                  </div>
                </form>
              </div>
              <div className="sm:col-span-2 border-t pt-4 space-y-4">
                <div>
                  <div className="text-base font-semibold">
                    Cập nhật điểm thành viên
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nhập tổng điểm mới của thành viên. Nhập 0 nếu muốn đưa điểm về 0.
                  </p>
                </div>
                <form
                  onSubmit={pointsForm.handleSubmit(onSubmitPoints)}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-2">
                    <Label htmlFor="points">Điểm *</Label>
                    <Input
                      id="points"
                      type="number"
                      step="1"
                      {...pointsForm.register("points")}
                      placeholder="Nhập tổng điểm mới"
                    />
                    {pointsForm.formState.errors.points && (
                      <p className="text-sm text-red-500">
                        {pointsForm.formState.errors.points.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="reason">Lý do</Label>
                    <Input
                      id="reason"
                      {...pointsForm.register("reason")}
                      placeholder="Nhập lý do (tùy chọn)"
                    />
                    {pointsForm.formState.errors.reason && (
                      <p className="text-sm text-red-500">
                        {pointsForm.formState.errors.reason.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="sm:col-span-2"
                    disabled={isUpdatingMemberPoints}
                  >
                    {isUpdatingMemberPoints
                      ? "Đang cập nhật..."
                      : "Cập nhật điểm"}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Không có thông tin membership.
            </div>
          )}
        </CardContent>
      </Card>
      {/* Card hiển thị quà của user */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Quà tặng của User</h3>
            </div>
            {isLoadingGifts || isLoadingStreakInfo ? (
              <div className="text-muted-foreground">Đang tải...</div>
            ) : (
              <div className="space-y-6">
                {/* Quà đã claim */}
                {streakInfoData?.claimedRewards &&
                  streakInfoData.claimedRewards.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-base font-medium text-blue-600">
                        Quà đã nhận ({streakInfoData.claimedRewards.length})
                      </div>
                      <div className="grid gap-3">
                        {streakInfoData.claimedRewards.map((reward, index) => (
                          <div
                            key={`${reward.streakCount}-${index}`}
                            className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {reward.items && reward.items.length > 0 ? (
                                  <span>
                                    🎁{" "}
                                    {reward.items
                                      .map(
                                        (item) =>
                                          `${item.name} ×${item.quantity}`,
                                      )
                                      .join(", ")}
                                  </span>
                                ) : reward.gift?.giftName ? (
                                  <span>🎁 {reward.gift.giftName}</span>
                                ) : (
                                  <span>
                                    💰{" "}
                                    {reward.bonusPoints ?? reward.points ?? 0}{" "}
                                    điểm
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Streak: {reward.streakCount}
                                {reward.itemCount
                                  ? ` • ${reward.itemCount} món`
                                  : ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Nhận lúc:{" "}
                                {new Date(reward.claimedAt).toLocaleString(
                                  "vi-VN",
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Quà sẵn sàng phát */}
                {pendingGiftsData?.availableGifts &&
                  pendingGiftsData.availableGifts.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-base font-medium text-orange-600">
                        Quà sẵn sàng phát (
                        {pendingGiftsData.availableGifts.length})
                      </div>
                      <div className="grid gap-3">
                        {pendingGiftsData.availableGifts.map((gift) => (
                          <div
                            key={gift.streakCount}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                Mốc streak {gift.streakCount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Chọn {gift.itemCount} món
                                {gift.bonusPoints
                                  ? ` • +${gift.bonusPoints} điểm`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Tiến độ mốc streak */}
                {pendingGiftsData?.streakRewards &&
                  pendingGiftsData.streakRewards.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-base font-medium text-green-600">
                        Tiến độ streak (
                        {pendingGiftsData.streakRewards.length})
                      </div>
                      <div className="grid gap-3">
                        {pendingGiftsData.streakRewards.map((reward) => (
                          <div
                            key={reward.streakCount}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-green-50"
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                Streak {reward.streakCount}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reward.itemCount
                                  ? `${reward.itemCount} món`
                                  : "Không có món"}
                                {reward.bonusPoints
                                  ? ` • +${reward.bonusPoints} điểm`
                                  : ""}
                                {reward.claimed
                                  ? " • Đã nhận"
                                  : reward.isReached
                                    ? " • Đã đạt"
                                    : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Thông tin streak */}
                {streakInfoData?.streak && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-2">
                      Thông tin Streak
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Streak hiện tại:{" "}
                        <span className="font-medium text-foreground">
                          {streakInfoData.streak.count}
                        </span>
                      </div>
                      <div>
                        Trạng thái:{" "}
                        <span
                          className={`font-medium ${
                            streakInfoData.streak.isActive
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {streakInfoData.streak.isActive
                            ? "Đang hoạt động"
                            : "Không hoạt động"}
                        </span>
                      </div>
                      <div>
                        Lần ghé thăm cuối:{" "}
                        <span className="font-medium text-foreground">
                          {new Date(
                            streakInfoData.streak.lastVisitAt,
                          ).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div>
                        Hết hạn lúc:{" "}
                        <span className="font-medium text-foreground">
                          {new Date(
                            streakInfoData.streak.expiredAt,
                          ).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thông tin user từ pending gifts response */}
                {pendingGiftsData?.user && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        Hạng:{" "}
                        <span className="font-medium text-foreground">
                          {pendingGiftsData.user.tier}
                        </span>
                      </div>
                      <div>
                        Điểm hiện có:{" "}
                        <span className="font-medium text-foreground">
                          {pendingGiftsData.user.availablePoint.toLocaleString(
                            "vi-VN",
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Không có quà */}
                {(!streakInfoData?.claimedRewards ||
                  streakInfoData.claimedRewards.length === 0) &&
                  (!pendingGiftsData?.availableGifts ||
                    pendingGiftsData.availableGifts.length === 0) &&
                  (!pendingGiftsData?.streakRewards ||
                    pendingGiftsData.streakRewards.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      User hiện không có quà nào
                    </div>
                  )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tên */}
            <div className="space-y-2">
              <Label htmlFor="name">Tên *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nhập tên đầy đủ"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>


            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Nhập email (tùy chọn)"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Số điện thoại *</Label>
              <Input
                id="phone_number"
                {...form.register("phone_number")}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                onChange={(e) => {
                  const normalized = normalizePhone(e.target.value);
                  form.setValue("phone_number", normalized, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                placeholder="Nhập số điện thoại"
              />
              {form.formState.errors.phone_number && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Ngày sinh */}
            <Controller
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Ngày sinh *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, "dd/MM/yyyy")
                          : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        captionLayout="dropdown-buttons"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                        disabled={{ after: new Date() }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.date_of_birth && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.date_of_birth.message}
                    </p>
                  )}
                </div>
              )}
            />

            <div className="border-t pt-6 space-y-4">
              <div>
                <div className="text-base font-semibold">Thử việc &amp; lương</div>
                <p className="text-sm text-muted-foreground">
                  Để trống và lưu để xóa cấu hình. Ngày/giờ lưu dạng ISO trên server.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="probationStartLocal">
                    Bắt đầu thử việc
                  </Label>
                  <Input
                    id="probationStartLocal"
                    type="datetime-local"
                    {...form.register("probationStartLocal")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probationEndLocal">Kết thúc thử việc</Label>
                  <Input
                    id="probationEndLocal"
                    type="datetime-local"
                    {...form.register("probationEndLocal")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probationHourlyRateStr">
                    Lương giờ (thử việc)
                  </Label>
                  <Input
                    id="probationHourlyRateStr"
                    inputMode="numeric"
                    {...form.register("probationHourlyRateStr")}
                    placeholder="VNĐ/giờ, để trống để xóa"
                  />
                  {form.formState.errors.probationHourlyRateStr && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.probationHourlyRateStr.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probationHolidayMultiplierStr">
                    Hệ số ngày lễ (0–20)
                  </Label>
                  <Input
                    id="probationHolidayMultiplierStr"
                    inputMode="decimal"
                    {...form.register("probationHolidayMultiplierStr")}
                    placeholder="Để trống để xóa"
                  />
                  {form.formState.errors.probationHolidayMultiplierStr && (
                    <p className="text-sm text-red-500">
                      {
                        form.formState.errors.probationHolidayMultiplierStr
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isUpdatingUser}
                className="flex-1"
              >
                {isUpdatingUser ? "Đang xử lý..." : "Cập nhật"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.navigate({ to: PATHS.USERS_MANAGEMENT })}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </form>
        </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default EditUserForm;
