import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { Sparkles, Plus, Trash2, Save, RefreshCcw } from "lucide-react";

import {
  IMembershipConfig,
  MembershipConfigPayload,
} from "@/@types/Membership";
import { PageHeader } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useMembershipConfig,
  useUpdateMembershipConfig,
} from "@/hooks/use-membership";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helpers: format currency-like input for display, parse to number for API
const formatCurrencyDisplay = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  const [intPart, decimalPart] = value.toString().split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimalPart ? `${formattedInt},${decimalPart}` : formattedInt;
};

const parseCurrencyInput = (raw: string) => {
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const tierSchema = z.object({
  name: z.string().min(1, "Tên hạng là bắt buộc"),
  threshold: z.coerce.number().min(0, "Ngưỡng điểm phải lớn hơn hoặc bằng 0"),
});

const streakRewardSchema = z.object({
  count: z.coerce.number().int().min(1, "Số lần liên tiếp phải từ 1"),
  bonusPoints: z.coerce.number().min(0, "Điểm thưởng phải lớn hơn hoặc bằng 0"),
  itemCount: z.coerce
    .number()
    .int()
    .min(0, "Số món quà phải lớn hơn hoặc bằng 0"),
});

const tierBenefitItemSchema = z
  .object({
    discountPercentage: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasPercentage =
      data.discountPercentage !== undefined &&
      !Number.isNaN(data.discountPercentage);
    const hasAmount =
      data.discountAmount !== undefined && !Number.isNaN(data.discountAmount);

    if (hasPercentage && hasAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chỉ được chọn giảm theo % hoặc số tiền",
        path: ["discountPercentage"],
      });
    }

    if (!hasPercentage && !hasAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cần nhập giá trị giảm giá",
        path: ["discountPercentage"],
      });
    }
  });

const tierBenefitGroupSchema = z
  .object({
    tier: z.string().min(1, "Tên hạng là bắt buộc"),
    discountType: z.enum(["percentage", "amount"]).optional(),
    benefits: z.array(tierBenefitItemSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.benefits.length) return;

    const types = data.benefits.map((benefit) => {
      if (
        benefit.discountPercentage !== undefined &&
        !Number.isNaN(benefit.discountPercentage)
      ) {
        return "percentage";
      }
      if (
        benefit.discountAmount !== undefined &&
        !Number.isNaN(benefit.discountAmount)
      ) {
        return "amount";
      }
      return null;
    });

    const uniqueTypes = new Set(types.filter(Boolean));
    if (uniqueTypes.size > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trong cùng hạng không được mix giảm theo % và số tiền",
        path: ["benefits"],
      });
    }
  });

const formSchema = z.object({
  currencyUnit: z.coerce.number().positive("Đơn vị tiền phải lớn hơn 0"),
  pointPerCurrency: z.coerce
    .number()
    .positive("Điểm trên mỗi đơn vị phải lớn hơn 0"),
  tierThresholds: z.array(tierSchema).min(1, "Cần ít nhất 1 hạng thành viên"),
  bonusRules: z.object({
    bookingEarlyBonus: z.coerce.number().min(0).default(0),
    offPeakBonus: z.coerce.number().min(0).default(0),
    groupSizeBonus: z
      .object({
        sizeGte: z.coerce
          .number()
          .int()
          .min(1, "Số khách phải lớn hơn hoặc bằng 1"),
        points: z.coerce
          .number()
          .min(0, "Điểm thưởng phải lớn hơn hoặc bằng 0"),
      })
      .optional(),
    birthdayMultiplier: z.coerce.number().min(0).default(1),
  }),
  streak: z.object({
    windowDays: z.coerce.number().int().min(1, "Số ngày cửa sổ phải từ 1"),
    rewards: z.array(streakRewardSchema),
  }),
  tierBenefits: z.array(tierBenefitGroupSchema).default([]),
  dailySelfClaimLimitPerPhone: z.coerce.number().int().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  currencyUnit: 0,
  pointPerCurrency: 1,
  tierThresholds: [{ name: "silver", threshold: 0 }],
  bonusRules: {
    bookingEarlyBonus: 0,
    offPeakBonus: 0,
    groupSizeBonus: { sizeGte: 1, points: 0 },
    birthdayMultiplier: 1,
  },
  streak: {
    windowDays: 7,
    rewards: [],
  },
  tierBenefits: [],
  dailySelfClaimLimitPerPhone: 0,
};

const mapConfigToFormValues = (config?: IMembershipConfig): FormValues => {
  const tierThresholdEntries = config?.tierThresholds
    ? Object.entries(config.tierThresholds).map(([name, threshold]) => ({
        name,
        threshold,
      }))
    : [];

  return {
    currencyUnit: config?.currencyUnit ?? defaultValues.currencyUnit,
    pointPerCurrency:
      config?.pointPerCurrency ?? defaultValues.pointPerCurrency,
    tierThresholds:
      tierThresholdEntries.length > 0
        ? tierThresholdEntries
        : defaultValues.tierThresholds,
    bonusRules: {
      bookingEarlyBonus:
        config?.bonusRules?.bookingEarlyBonus ??
        defaultValues.bonusRules.bookingEarlyBonus,
      offPeakBonus:
        config?.bonusRules?.offPeakBonus ??
        defaultValues.bonusRules.offPeakBonus,
      groupSizeBonus:
        config?.bonusRules?.groupSizeBonus ??
        defaultValues.bonusRules.groupSizeBonus,
      birthdayMultiplier:
        config?.bonusRules?.birthdayMultiplier ??
        defaultValues.bonusRules.birthdayMultiplier,
    },
    streak: {
      windowDays: config?.streak?.windowDays ?? defaultValues.streak.windowDays,
      rewards:
        config?.streak?.rewards && config.streak.rewards.length > 0
          ? config.streak.rewards.map((reward) => ({
              count: reward.count,
              bonusPoints: reward.bonusPoints,
              itemCount: reward.itemCount ?? 0,
            }))
          : defaultValues.streak.rewards,
    },
    tierBenefits: config?.tierBenefits
      ? Object.entries(config.tierBenefits).map(([tier, benefits]) => {
          const firstBenefit = benefits?.[0];
          const discountType =
            firstBenefit?.discountPercentage !== undefined
              ? ("percentage" as const)
              : firstBenefit?.discountAmount !== undefined
                ? ("amount" as const)
                : ("percentage" as const);

          return {
            tier,
            discountType,
            benefits: (benefits || []).map((benefit) => ({
              discountPercentage: benefit.discountPercentage,
              discountAmount: benefit.discountAmount,
              note: benefit.note ?? "",
            })),
          };
        })
      : defaultValues.tierBenefits,
    dailySelfClaimLimitPerPhone:
      config?.dailySelfClaimLimitPerPhone ??
      defaultValues.dailySelfClaimLimitPerPhone,
  };
};

const buildPayload = (
  values: FormValues,
  id?: string
): MembershipConfigPayload => {
  const tierThresholds = values.tierThresholds.reduce<Record<string, number>>(
    (acc, item) => {
      const name = item.name.trim();
      if (name) {
        acc[name] = item.threshold;
      }
      return acc;
    },
    {}
  );

  return {
    _id: id,
    currencyUnit: values.currencyUnit,
    pointPerCurrency: values.pointPerCurrency,
    tierThresholds,
    bonusRules: {
      bookingEarlyBonus: values.bonusRules.bookingEarlyBonus,
      offPeakBonus: values.bonusRules.offPeakBonus,
      groupSizeBonus: values.bonusRules.groupSizeBonus,
      birthdayMultiplier: values.bonusRules.birthdayMultiplier,
    },
    streak: {
      windowDays: values.streak.windowDays,
      rewards: values.streak.rewards.map((reward) => ({
        count: reward.count,
        bonusPoints: reward.bonusPoints,
        itemCount: reward.itemCount,
      })),
    },
    tierBenefits: (values.tierBenefits || []).reduce<
      Record<
        string,
        {
          discountPercentage?: number;
          discountAmount?: number;
          note?: string;
        }[]
      >
    >((acc, entry) => {
      const tier = entry.tier?.trim();
      if (tier && entry.benefits?.length) {
        acc[tier] = entry.benefits.map((item) => {
          const benefit: {
            discountPercentage?: number;
            discountAmount?: number;
            note?: string;
          } = {};

          if (
            item.discountPercentage !== undefined &&
            !Number.isNaN(item.discountPercentage)
          ) {
            benefit.discountPercentage = item.discountPercentage;
          }

          if (
            item.discountAmount !== undefined &&
            !Number.isNaN(item.discountAmount)
          ) {
            benefit.discountAmount = item.discountAmount;
          }

          if (item.note?.trim()) {
            benefit.note = item.note.trim();
          }

          return benefit;
        });
      }
      return acc;
    }, {}),
    dailySelfClaimLimitPerPhone: values.dailySelfClaimLimitPerPhone,
  };
};

const MembershipConfigPage = () => {
  const {
    data: membershipConfig,
    isLoading,
    isFetching,
  } = useMembershipConfig();
  const { mutate: updateConfig, isPending } = useUpdateMembershipConfig();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const tierFieldArray = useFieldArray({
    control: form.control,
    name: "tierThresholds",
  });

  const streakRewardsFieldArray = useFieldArray({
    control: form.control,
    name: "streak.rewards",
  });

  useEffect(() => {
    if (membershipConfig) {
      form.reset(mapConfigToFormValues(membershipConfig));
    }
  }, [membershipConfig, form]);

  // Đồng bộ danh sách tierBenefits theo tên hạng (tierThresholds)
  const tierThresholdNames = (form.watch("tierThresholds") || [])
    .map((t) => t.name?.trim())
    .filter((name) => !!name);

  useEffect(() => {
    const current = form.getValues("tierBenefits") || [];
    const filtered = current.filter((entry) =>
      tierThresholdNames.includes(entry.tier)
    );

    const missing = tierThresholdNames.filter(
      (name) => !filtered.find((entry) => entry.tier === name)
    );

    const next = [
      ...filtered,
      ...missing.map((tier) => ({
        tier,
        discountType: "percentage" as const,
        benefits: [] as FormValues["tierBenefits"][number]["benefits"],
      })),
    ];

    const changed =
      next.length !== current.length ||
      next.some(
        (entry, idx) =>
          entry.tier !== current[idx]?.tier ||
          entry.benefits?.length !== current[idx]?.benefits?.length
      );

    if (changed) {
      form.setValue("tierBenefits", next, { shouldDirty: true });
    }
  }, [tierThresholdNames.join("|"), form]);

  const tierBenefits = form.watch("tierBenefits") || [];

  const addTierBenefit = (tier: string) => {
    const current = form.getValues("tierBenefits") || [];
    const idx = current.findIndex((entry) => entry.tier === tier);
    if (idx === -1) return;
    const updated = [...current];
    const tierEntry = updated[idx];
    const discountType = tierEntry.discountType ?? "percentage";
    const benefits = tierEntry.benefits ? [...tierEntry.benefits] : [];
    benefits.push(
      discountType === "percentage"
        ? { discountPercentage: undefined, note: "" }
        : { discountAmount: undefined, note: "" }
    );
    updated[idx] = { ...tierEntry, discountType, benefits };
    form.setValue("tierBenefits", updated, { shouldDirty: true });
  };

  const removeTierBenefit = (tier: string, benefitIndex: number) => {
    const current = form.getValues("tierBenefits") || [];
    const idx = current.findIndex((entry) => entry.tier === tier);
    if (idx === -1) return;
    const benefits = current[idx].benefits ? [...current[idx].benefits] : [];
    benefits.splice(benefitIndex, 1);
    const updated = [...current];
    updated[idx] = { ...updated[idx], benefits };
    form.setValue("tierBenefits", updated, { shouldDirty: true });
  };

  const handleTierDiscountTypeChange = (
    tierIndex: number,
    discountType: "percentage" | "amount"
  ) => {
    const current = form.getValues("tierBenefits") || [];
    const tierEntry = current[tierIndex];
    if (!tierEntry) return;

    const updated = [...current];
    updated[tierIndex] = {
      ...tierEntry,
      discountType,
      benefits: [],
    };
    form.setValue("tierBenefits", updated, { shouldDirty: true });
  };

  const handleSubmit = (values: FormValues) => {
    const payload = buildPayload(values, membershipConfig?._id);
    updateConfig(payload);
  };

  const handleReset = () => {
    form.reset(mapConfigToFormValues(membershipConfig));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Đang tải cấu hình membership...
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Membership"
        description="Quản lý cấu hình tích điểm, hạng thành viên và thưởng duy trì."
        icon={Sparkles}
        actions={
          <Button
            type="submit"
            form="membership-config-form"
            disabled={isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        }
      />

      <Form {...form}>
        <form
          id="membership-config-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Thiết lập chung</CardTitle>
              <CardDescription>
                Quy định cách quy đổi tiền &rarr; điểm và số lượt tự nhận điểm.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="currencyUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị tiền (VNĐ)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        placeholder="Ví dụ: 10.000"
                        value={formatCurrencyDisplay(field.value)}
                        onChange={(e) => {
                          const parsed = parseCurrencyInput(e.target.value);
                          field.onChange(parsed);
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pointPerCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Điểm trên mỗi đơn vị tiền</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        placeholder="Ví dụ: 1.000"
                        value={formatCurrencyDisplay(field.value)}
                        onChange={(e) => {
                          const parsed = parseCurrencyInput(e.target.value);
                          field.onChange(parsed);
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dailySelfClaimLimitPerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Giới hạn tự nhận điểm / ngày / số điện thoại
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Ví dụ: 1"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hạng thành viên</CardTitle>
              <CardDescription>
                Định nghĩa tên hạng và ngưỡng điểm tương ứng.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierFieldArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-start gap-3 md:grid-cols-[1fr_180px_40px]"
                >
                  <FormField
                    control={form.control}
                    name={`tierThresholds.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{index === 0 ? "Tên hạng" : ""}</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: Silver" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`tierThresholds.${index}.threshold`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {index === 0 ? "Ngưỡng điểm" : ""}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex h-full items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => tierFieldArray.remove(index)}
                      disabled={tierFieldArray.fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    tierFieldArray.append({ name: "", threshold: 0 })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm hạng
                </Button>
              </div>
            </CardContent>
            <CardContent className="space-y-4 pt-0">
              <div className="border-t pt-4 space-y-3">
                <CardTitle className="text-base">Giảm giá theo hạng</CardTitle>
                <CardDescription>
                  Cấu hình ưu đãi giảm giá cho từng hạng. Mỗi hạng chỉ dùng một
                  loại: giảm theo % hoặc giảm theo số tiền.
                </CardDescription>
              </div>

              {tierThresholdNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có hạng. Hãy thêm hạng ở phần trên để cấu hình giảm giá.
                </p>
              ) : (
                tierThresholdNames.map((tierName) => {
                  const tierIndex = tierBenefits.findIndex(
                    (entry) => entry.tier === tierName
                  );
                  if (tierIndex === -1) return null;
                  const tierEntry = tierBenefits[tierIndex];
                  const tierBenefitItems = tierEntry?.benefits || [];
                  const discountType = tierEntry?.discountType ?? "percentage";
                  const hasBenefits = tierBenefitItems.length > 0;

                  return (
                    <div
                      key={tierName}
                      className="rounded-lg border p-4 space-y-3 bg-muted/30"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="font-semibold">Hạng {tierName}</div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select
                            value={discountType}
                            onValueChange={(value) =>
                              handleTierDiscountTypeChange(
                                tierIndex,
                                value as "percentage" | "amount"
                              )
                            }
                            disabled={hasBenefits}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Loại giảm giá" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">
                                Giảm theo %
                              </SelectItem>
                              <SelectItem value="amount">
                                Giảm theo số tiền
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTierBenefit(tierName)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm ưu đãi
                          </Button>
                        </div>
                      </div>

                      {hasBenefits ? null : (
                        <p className="text-sm text-muted-foreground">
                          Chọn loại giảm giá rồi thêm ưu đãi cho hạng này.
                        </p>
                      )}

                      {tierBenefitItems.map((_, benefitIndex) => (
                        <div
                          key={`${tierName}-${benefitIndex}`}
                          className="grid items-start gap-3 md:grid-cols-[1fr_1fr_40px]"
                        >
                          {discountType === "percentage" ? (
                            <FormField
                              control={form.control}
                              name={`tierBenefits.${tierIndex}.benefits.${benefitIndex}.discountPercentage`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {benefitIndex === 0 ? "Giảm (%)" : ""}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step="0.1"
                                      placeholder="Ví dụ: 10"
                                      value={field.value ?? ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                          value === ""
                                            ? undefined
                                            : Number(value)
                                        );
                                      }}
                                      onBlur={field.onBlur}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`tierBenefits.${tierIndex}.benefits.${benefitIndex}.discountAmount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {benefitIndex === 0
                                      ? "Giảm (VNĐ)"
                                      : ""}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      pattern="[0-9.,]*"
                                      placeholder="Ví dụ: 50.000"
                                      value={formatCurrencyDisplay(field.value)}
                                      onChange={(e) => {
                                        const parsed = parseCurrencyInput(
                                          e.target.value
                                        );
                                        field.onChange(parsed);
                                      }}
                                      onBlur={field.onBlur}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name={`tierBenefits.${tierIndex}.benefits.${benefitIndex}.note`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {benefitIndex === 0
                                    ? "Ghi chú (tùy chọn)"
                                    : ""}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ví dụ: Áp dụng cho bill phòng"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex h-full items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                removeTierBenefit(tierName, benefitIndex)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {hasBenefits ? (
                        <FormField
                          control={form.control}
                          name={`tierBenefits.${tierIndex}.benefits`}
                          render={() => (
                            <FormItem>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Điểm thưởng</CardTitle>
              <CardDescription>
                Thiết lập điểm thưởng bổ sung cho các trường hợp đặc biệt.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bonusRules.bookingEarlyBonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thưởng đặt sớm</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Số điểm thưởng"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusRules.offPeakBonus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thưởng khung giờ thấp điểm</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Số điểm thưởng"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusRules.groupSizeBonus.sizeGte"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thưởng nhóm từ (số người)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        placeholder="Ví dụ: 4"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusRules.groupSizeBonus.points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Điểm thưởng cho nhóm</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Ví dụ: 50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bonusRules.birthdayMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hệ số nhân điểm ngày sinh nhật</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="Ví dụ: 2"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streak thưởng</CardTitle>
              <CardDescription>
                Cấu hình thưởng duy trì liên tiếp theo cửa sổ ngày.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="streak.windowDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cửa sổ tính streak (ngày)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        placeholder="Ví dụ: 30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <div className="font-medium">Mốc thưởng streak</div>
                {streakRewardsFieldArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid items-start gap-3 md:grid-cols-[1fr_1fr_1fr_40px]"
                  >
                    <FormField
                      control={form.control}
                      name={`streak.rewards.${index}.count`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {index === 0 ? "Số lần tích liên tiếp" : ""}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              step="1"
                              placeholder="Ví dụ: 5"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`streak.rewards.${index}.bonusPoints`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {index === 0 ? "Điểm thưởng" : ""}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              placeholder="Ví dụ: 30"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`streak.rewards.${index}.itemCount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {index === 0 ? "Số món staff chọn" : ""}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              placeholder="Ví dụ: 1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex h-full items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => streakRewardsFieldArray.remove(index)}
                        disabled={streakRewardsFieldArray.fields.length === 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    streakRewardsFieldArray.append({
                      count: 1,
                      bonusPoints: 0,
                      itemCount: 1,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm mốc thưởng
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isPending || isFetching}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Hoàn tác thay đổi
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MembershipConfigPage;
