import fnbMenuApis from "@/apis/fnbMenu.apis";
import customizationGroupTemplateApis from "@/apis/customizationGroupTemplate.apis";
import {
  FnBMenuCustomizationOverride,
  FnBMenuCustomizationTemplateRef,
  IFnBCustomizationGroupTemplate,
} from "@/@types/FnBCustomization";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImagePicker from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FnbRevenueCategory } from "@/@types/Bill";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FnBCategory } from "@/constants/enum";
import {
  FNB_REVENUE_CATEGORIES,
  FNB_REVENUE_CATEGORY_HINTS,
  REVENUE_CATEGORY_LABELS,
  getRevenueCategoryUpdateFields,
  resolveMenuItemRevenueCategory,
  shouldRequireRevenueCategoryReason,
} from "@/utils/revenueBreakdown";
import { AxiosError } from "axios";
import {
  FnBMenuItem,
  menuItemsQueryKeys,
  normalizeMenuItemApiResponse,
  upsertMenuItemInListCache,
} from "@/hooks/use-menu-items";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

interface UpsertMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: FnBMenuItem | null; // null = create, object = edit
  onSuccess?: () => void;
}

// Schema validation
const variantSchema = z.object({
  _id: z.string().optional(), // ID của variant khi edit
  name: z.string().min(1, "Tên variant là bắt buộc"),
  price: z.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
  image: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  inventory: z
    .object({
      quantity: z
        .number()
        .min(0, "Số lượng phải lớn hơn hoặc bằng 0")
        .optional(),
      minStock: z
        .number()
        .min(0, "Tồn kho tối thiểu phải lớn hơn hoặc bằng 0")
        .optional(),
      maxStock: z
        .number()
        .min(0, "Tồn kho tối đa phải lớn hơn hoặc bằng 0")
        .optional(),
    })
    .optional(),
});

const customizationOptionSchema = z.object({
  optionKey: z.string().min(1, "optionKey là bắt buộc"),
  label: z.string().min(1, "Tên option là bắt buộc"),
  priceDelta: z.number().optional(),
});

const customizationGroupSchema = z
  .object({
    groupKey: z.string().min(1, "groupKey là bắt buộc"),
    label: z.string().min(1, "Tên nhóm là bắt buộc"),
    minSelect: z.number().min(0, "minSelect phải >= 0"),
    maxSelect: z.number().min(0, "maxSelect phải >= 0"),
    options: z
      .array(customizationOptionSchema)
      .min(1, "Nhóm tuỳ chọn cần ít nhất 1 option"),
  })
  .refine((group) => group.maxSelect >= group.minSelect, {
    message: "maxSelect phải lớn hơn hoặc bằng minSelect",
    path: ["maxSelect"],
  });

const customizationTemplateRefSchema = z.object({
  templateKey: z.string().min(1, "templateKey là bắt buộc"),
});

const customizationOverrideSchema = z.object({
  groupKey: z.string().min(1, "groupKey là bắt buộc"),
  optionKey: z.string().min(1, "optionKey là bắt buộc"),
  priceDelta: z.number(),
});

const formSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  category: z.nativeEnum(FnBCategory, {
    required_error: "Danh mục là bắt buộc",
  }),
  parentId: z.string().optional().nullable(),
  hasVariant: z.boolean(),
  isActive: z.boolean().optional(),
  price: z.number().min(0, "Giá phải lớn hơn hoặc bằng 0"),
  image: z.string().optional().nullable(),
  inventory: z
    .object({
      quantity: z
        .number()
        .min(0, "Số lượng phải lớn hơn hoặc bằng 0")
        .optional(),
    })
    .optional(),
  variants: z.array(variantSchema).optional(),
  customizationTemplateRefs: z.array(customizationTemplateRefSchema).optional(),
  customizationOverrides: z.array(customizationOverrideSchema).optional(),
  customizationGroups: z.array(customizationGroupSchema).optional(),
  revenueCategory: z.enum(["FNB_RETAIL", "FNB_PREPARED"]).optional(),
  inventoryTracked: z.boolean().optional(),
  reason: z.string().optional(),
}).superRefine((data, ctx) => {
  const isSelling = data.isActive !== false;
  if (isSelling && !data.revenueCategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revenueCategory"],
      message: "Chọn loại doanh thu khi món đang bán",
    });
  }
});

type FormData = z.infer<typeof formSchema>;

const UpsertMenuItemModal: React.FC<UpsertMenuItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [variantFiles, setVariantFiles] = useState<{ [key: number]: File }>({});
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);

  const isEdit = !!item?._id;
  const { data: templateResponse } = useQuery({
    queryKey: ["customizationGroupTemplates"],
    queryFn: () => customizationGroupTemplateApis.getTemplates(),
    enabled: isOpen,
  });

  const activeTemplates: IFnBCustomizationGroupTemplate[] =
    templateResponse?.data?.result?.filter((template) => template.isActive) || [];

  // Query để lấy chi tiết item khi edit
  const {
    data: itemDetail,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useQuery({
    queryKey: ["menuItem", item?._id],
    queryFn: () => fnbMenuApis.getMenuItemById(item?._id || ""),
    enabled: isEdit && !!item?._id && isOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: FnBCategory.SNACK,
      parentId: null,
      hasVariant: false,
      isActive: true,
      price: 0,
      image: "",
      inventory: {
        quantity: 0,
      },
      variants: [],
      customizationTemplateRefs: [],
      customizationOverrides: [],
      customizationGroups: [],
      revenueCategory: "FNB_RETAIL",
      inventoryTracked: false,
      reason: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  // Cập nhật form khi có dữ liệu chi tiết
  useEffect(() => {
    if (itemDetail?.data?.result && isEdit) {
      const detail = itemDetail.data.result;
      console.log("Item detail from API:", detail);

      // Xử lý variants để phù hợp với schema
      const processedVariants =
        detail.variants?.map((variant) => ({
          _id: variant._id || "", // Thêm ID của variant
          name: variant.name || "",
          price: variant.price || 0,
          image: variant.image || "",
          isActive: variant.isActive ?? true,
          inventory: {
            quantity: variant.inventory?.quantity || 0,
            minStock: variant.inventory?.minStock || 0,
            maxStock: variant.inventory?.maxStock || 0,
          },
        })) || [];

      const processedCustomizationGroups =
        detail.customizationGroups?.map((group) => ({
          groupKey: group.groupKey || "",
          label: group.label || "",
          minSelect: group.minSelect || 0,
          maxSelect: group.maxSelect || 0,
          options:
            group.options?.map((option) => ({
              optionKey: option.optionKey || "",
              label: option.label || "",
              priceDelta: option.priceDelta || 0,
            })) || [],
        })) || [];
      const processedTemplateRefs: FnBMenuCustomizationTemplateRef[] =
        detail.customizationTemplateRefs?.map((ref) => ({
          templateKey: ref.templateKey || "",
        })) || [];
      const processedOverrides: FnBMenuCustomizationOverride[] =
        detail.customizationOverrides?.map((override) => ({
          groupKey: override.groupKey || "",
          optionKey: override.optionKey || "",
          priceDelta: override.priceDelta || 0,
        })) || [];

      form.reset({
        name: detail.name || "",
        category: detail.category || FnBCategory.SNACK,
        parentId: detail.parentId || null,
        hasVariant: detail.hasVariant || false,
        isActive: detail.isActive ?? true,
        price: detail.price || 0,
        image: detail.image || "",
        inventory: {
          quantity: detail.inventory?.quantity || 0,
        },
        variants: processedVariants,
        customizationTemplateRefs: processedTemplateRefs,
        customizationOverrides: processedOverrides,
        customizationGroups: processedCustomizationGroups,
        revenueCategory: resolveMenuItemRevenueCategory(
          detail.revenueCategory ?? item?.revenueCategory,
        ),
        inventoryTracked: detail.inventoryTracked ?? false,
        reason: "",
      });
    } else if (!item) {
      // Reset form khi tạo mới
      form.reset({
        name: "",
        category: FnBCategory.SNACK,
        parentId: null,
        hasVariant: false,
        isActive: true,
        price: 0,
        image: "",
        inventory: {
          quantity: 0,
        },
        variants: [],
        customizationTemplateRefs: [],
        customizationOverrides: [],
        customizationGroups: [],
        revenueCategory: "FNB_RETAIL",
        inventoryTracked: false,
        reason: "",
      });
    }
    // Reset files
    setMainImageFile(null);
    setVariantFiles({});
  }, [itemDetail, item, isEdit, form]);

  // Hiển thị lỗi nếu có
  useEffect(() => {
    if (detailError) {
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin chi tiết menu item",
        variant: "destructive",
      });
    }
  }, [detailError, toast]);

  // Hàm format currency
  const formatCurrency = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const addVariant = () => {
    append({
      _id: "", // Không có ID khi tạo mới
      name: "",
      price: form.getValues("price") || 0,
      image: "",
      isActive: true,
      inventory: {
        quantity: 0,
        minStock: 0,
        maxStock: 0,
      },
    });
  };

  const removeVariant = (index: number) => {
    remove(index);
    setVariantFiles((prev) => {
      const newFiles = { ...prev };
      delete newFiles[index];
      return newFiles;
    });
  };

  const addCustomizationGroup = () => {
    const currentGroups = form.getValues("customizationGroups") || [];
    form.setValue("customizationGroups", [
      ...currentGroups,
      {
        groupKey: "",
        label: "",
        minSelect: 0,
        maxSelect: 1,
        options: [{ optionKey: "", label: "", priceDelta: 0 }],
      },
    ]);
  };

  const toggleCustomizationTemplate = (templateKey: string, checked: boolean) => {
    const currentRefs = form.getValues("customizationTemplateRefs") || [];
    if (checked) {
      const existed = currentRefs.some((ref) => ref.templateKey === templateKey);
      if (!existed) {
        form.setValue("customizationTemplateRefs", [...currentRefs, { templateKey }]);
      }
      return;
    }

    form.setValue(
      "customizationTemplateRefs",
      currentRefs.filter((ref) => ref.templateKey !== templateKey)
    );
  };

  const addCustomizationOverride = () => {
    const currentOverrides = form.getValues("customizationOverrides") || [];
    form.setValue("customizationOverrides", [
      ...currentOverrides,
      { groupKey: "", optionKey: "", priceDelta: 0 },
    ]);
  };

  const removeCustomizationOverride = (index: number) => {
    const currentOverrides = form.getValues("customizationOverrides") || [];
    form.setValue(
      "customizationOverrides",
      currentOverrides.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const removeCustomizationGroup = (groupIndex: number) => {
    const currentGroups = form.getValues("customizationGroups") || [];
    form.setValue(
      "customizationGroups",
      currentGroups.filter((_, index) => index !== groupIndex)
    );
  };

  const addCustomizationOption = (groupIndex: number) => {
    const currentGroups = form.getValues("customizationGroups") || [];
    const targetGroup = currentGroups[groupIndex];
    if (!targetGroup) return;

    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...targetGroup,
      options: [
        ...(targetGroup.options || []),
        { optionKey: "", label: "", priceDelta: 0 },
      ],
    };
    form.setValue("customizationGroups", updatedGroups);
  };

  const removeCustomizationOption = (groupIndex: number, optionIndex: number) => {
    const currentGroups = form.getValues("customizationGroups") || [];
    const targetGroup = currentGroups[groupIndex];
    if (!targetGroup) return;

    const updatedOptions = (targetGroup.options || []).filter(
      (_, index) => index !== optionIndex
    );
    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...targetGroup,
      options: updatedOptions,
    };
    form.setValue("customizationGroups", updatedGroups);
  };

  const handleVariantImagesChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setVariantFiles((prev) => ({
        ...prev,
        [index]: file,
      }));
      form.setValue(`variants.${index}.image`, URL.createObjectURL(file));
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      form.setValue("image", URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: FormData) => {
    // Kiểm tra variants nếu có
    if (data.hasVariant && (!data.variants || data.variants.length === 0)) {
      toast({
        title: "Lỗi",
        description: "Vui lòng thêm ít nhất một variant",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const selectedTemplateKeys = (data.customizationTemplateRefs || []).map(
        (ref) => ref.templateKey
      );
      if (selectedTemplateKeys.length > 0) {
        const validateResponse =
          await customizationGroupTemplateApis.validateTemplateRefs(
            selectedTemplateKeys
          );
        const invalidTemplateKeys =
          validateResponse.data.result?.invalidTemplateKeys || [];
        if (invalidTemplateKeys.length > 0) {
          toast({
            title: "Template không hợp lệ",
            description: `Các template không hợp lệ: ${invalidTemplateKeys.join(", ")}`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const submitFormData = new FormData();

      // Các trường text bắt buộc
      submitFormData.append("name", data.name);
      submitFormData.append("category", data.category);
      submitFormData.append("price", data.price.toString());
      submitFormData.append(
        "hasVariant",
        data.hasVariant?.toString() || "false"
      );
      submitFormData.append("isActive", (data.isActive ?? true).toString());
      submitFormData.append(
        "quantity",
        data.inventory?.quantity?.toString() || "0"
      );

      // Trường optional
      if (data.parentId) {
        submitFormData.append("parentId", data.parentId);
      } else {
        submitFormData.append("parentId", "");
      }

      // File ảnh chính (optional)
      if (data.image) {
        if (data.image.startsWith("http")) {
          submitFormData.append("existingImage", data.image);
        } else if (mainImageFile) {
          submitFormData.append("file", mainImageFile);
        }
      }

      // Xử lý variants nếu có
      if (data.hasVariant && data.variants) {
        const processedVariants = await Promise.all(
          data.variants.map(async (variant, index) => {
            // Handle variant image
            let variantImage = variant.image || "";
            if (
              variant.image &&
              !variant.image.startsWith("http") &&
              variantFiles[index]
            ) {
              submitFormData.append(
                `variantFile_${index}`,
                variantFiles[index]
              );
              variantImage = `variantFile_${index}`;
            }

            return {
              _id: variant._id || "", // Thêm ID của variant để backend có thể cập nhật
              name: variant.name,
              price: variant.price,
              image: variantImage,
              isActive: variant.isActive ?? true,
              inventory: {
                ...variant.inventory,
              },
            };
          })
        );

        submitFormData.append("variants", JSON.stringify(processedVariants));
      }

      if (data.customizationGroups && data.customizationGroups.length > 0) {
        submitFormData.append(
          "customizationGroups",
          JSON.stringify(data.customizationGroups)
        );
      } else {
        submitFormData.append("customizationGroups", JSON.stringify([]));
      }

      submitFormData.append(
        "customizationTemplateRefs",
        JSON.stringify(data.customizationTemplateRefs || [])
      );
      submitFormData.append(
        "customizationOverrides",
        JSON.stringify(data.customizationOverrides || [])
      );

      const isSelling = data.isActive !== false;
      const originalRevenueCategory =
        itemDetail?.data?.result?.revenueCategory ?? item?.revenueCategory;
      const nextRevenueCategory = data.revenueCategory || "FNB_RETAIL";

      if (!isEdit && (isSelling || data.revenueCategory)) {
        submitFormData.append("revenueCategory", nextRevenueCategory);
      }

      if (isEdit) {
        const revenueCategoryUpdate = getRevenueCategoryUpdateFields(
          originalRevenueCategory,
          nextRevenueCategory,
          data.reason,
        );

        if (revenueCategoryUpdate.kind === "error") {
          form.setError("reason", {
            type: "manual",
            message: revenueCategoryUpdate.message,
          });
          toast({
            title: "Lỗi",
            description: revenueCategoryUpdate.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (revenueCategoryUpdate.kind === "include") {
          submitFormData.append(
            "revenueCategory",
            revenueCategoryUpdate.revenueCategory,
          );
          submitFormData.append("reason", revenueCategoryUpdate.reason);
        }
      }

      if (isSelling || data.inventoryTracked !== undefined) {
        submitFormData.append(
          "inventoryTracked",
          (data.inventoryTracked ?? false).toString(),
        );
      }

      const response =
        isEdit && item?._id
          ? await fnbMenuApis.updateMenuItem(item._id, submitFormData)
          : await fnbMenuApis.createMenuItem(submitFormData);

      const savedItem = normalizeMenuItemApiResponse(response.data);
      if (savedItem) {
        upsertMenuItemInListCache(queryClient, savedItem);
        if (savedItem._id) {
          queryClient.setQueryData(
            menuItemsQueryKeys.detail(savedItem._id),
            savedItem,
          );
          queryClient.setQueryData(
            menuItemsQueryKeys.legacyDetail(savedItem._id),
            { data: { result: savedItem } },
          );
        }
      }

      toast({
        title: "Thành công",
        description: isEdit
          ? "Cập nhật menu item thành công"
          : "Tạo menu item thành công",
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error saving menu item:", error);
      const axiosError = error as AxiosError<{ message?: string }>;
      toast({
        title: "Lỗi",
        description:
          axiosError.response?.data?.message ||
          "Có lỗi xảy ra khi lưu menu item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset({
      name: "",
      category: FnBCategory.SNACK,
      parentId: null,
      hasVariant: false,
      isActive: true,
      price: 0,
      image: "",
      inventory: {
        quantity: 0,
      },
      variants: [],
      customizationTemplateRefs: [],
      customizationOverrides: [],
      customizationGroups: [],
      revenueCategory: "FNB_RETAIL",
      inventoryTracked: false,
      reason: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa Menu Item" : "Thêm Menu Item mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin menu item"
              : "Tạo menu item mới cho hệ thống"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Đang tải thông tin...</p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
              console.log(errors);
            })}
            className="space-y-4"
          >
            {/* Thông tin cơ bản */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Thông tin cơ bản</h3>

              <div className="grid grid-cols-3 gap-4">
                {/* Tên sản phẩm */}
                <div className="space-y-2">
                  <Label htmlFor="name">Tên sản phẩm *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nhập tên sản phẩm"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Danh mục */}
                <div className="space-y-2">
                  <Label htmlFor="category">Danh mục *</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) =>
                      form.setValue("category", value as FnBCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FnBCategory.SNACK}>
                        Đồ ăn nhẹ
                      </SelectItem>
                      <SelectItem value={FnBCategory.DRINK}>Đồ uống</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.category.message}
                    </p>
                  )}
                </div>

                {/* Giá */}
                <div className="space-y-2">
                  <Label htmlFor="price">Giá (VND) *</Label>
                  <Input
                    id="price"
                    value={formatCurrency(form.watch("price") || 0)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\./g, "");
                      const numericValue = Number(rawValue) || 0;
                      form.setValue("price", numericValue);
                    }}
                    placeholder="0"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Số lượng tồn kho - chỉ hiển thị khi không có variants */}
              {!form.watch("hasVariant") && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Số lượng tồn kho *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    {...form.register("inventory.quantity", {
                      valueAsNumber: true,
                    })}
                    placeholder="0"
                  />
                  {form.formState.errors.inventory?.quantity && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.inventory.quantity.message}
                    </p>
                  )}
                </div>
              )}

              {/* Có variant hay không */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasVariant"
                  checked={form.watch("hasVariant")}
                  onCheckedChange={(checked) =>
                    form.setValue("hasVariant", checked)
                  }
                />
                <Label htmlFor="hasVariant">Có variants</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive") ?? true}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", checked)
                  }
                />
                <Label htmlFor="isActive">Đang bán</Label>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="revenueCategory">
                    Loại doanh thu{(form.watch("isActive") ?? true) ? " *" : ""}
                  </Label>
                  <Select
                    value={form.watch("revenueCategory") || "FNB_RETAIL"}
                    onValueChange={(value) =>
                      form.setValue(
                        "revenueCategory",
                        value as FnbRevenueCategory,
                      )
                    }
                  >
                    <SelectTrigger id="revenueCategory">
                      <SelectValue placeholder="Chọn loại doanh thu" />
                    </SelectTrigger>
                    <SelectContent>
                      {FNB_REVENUE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {REVENUE_CATEGORY_LABELS[category]} —{" "}
                          {FNB_REVENUE_CATEGORY_HINTS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Không dùng Phí thu âm (SERVICE_ROOM) trên form món. Variant
                    kế thừa loại của món cha.
                  </p>
                  {form.formState.errors.revenueCategory && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.revenueCategory.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="inventoryTracked"
                    checked={form.watch("inventoryTracked") ?? false}
                    onCheckedChange={(checked) =>
                      form.setValue("inventoryTracked", checked === true)
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="inventoryTracked" className="font-normal">
                      Có trừ kho khi bán
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Bật nếu món này trừ tồn kho khi thanh toán.
                    </p>
                  </div>
                </div>

                {isEdit &&
                  shouldRequireRevenueCategoryReason(
                    itemDetail?.data?.result?.revenueCategory ??
                      item?.revenueCategory,
                    form.watch("revenueCategory"),
                  ) && (
                    <div className="space-y-2">
                      <Label htmlFor="reason">Lý do đổi loại doanh thu *</Label>
                      <Textarea
                        id="reason"
                        {...form.register("reason")}
                        placeholder="Nhập lý do thay đổi (bắt buộc)"
                      />
                      {form.formState.errors.reason && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.reason.message}
                        </p>
                      )}
                    </div>
                  )}
              </div>

              {/* Hình ảnh chính */}
              <div className="space-y-2">
                <Label>Hình ảnh</Label>
                <ImagePicker
                  onChange={handleImagesChange}
                  currentImage={form.watch("image") || ""}
                  onRemove={() => {
                    form.setValue("image", "");
                    setMainImageFile(null);
                  }}
                />
              </div>
            </div>

            {/* Phần Variants */}
            {form.watch("hasVariant") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Variants</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm Variant
                  </Button>
                </div>

                {fields.map((field, index) => {
                  const parentInactive = !(form.watch("isActive") ?? true);
                  const variantActive =
                    form.watch(`variants.${index}.isActive`) ?? true;

                  return (
                  <div
                    key={field.id}
                    className="rounded-lg border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-medium">Variant {index + 1}</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`variant-isActive-${index}`}
                            checked={variantActive}
                            disabled={parentInactive}
                            onCheckedChange={(checked) =>
                              form.setValue(
                                `variants.${index}.isActive`,
                                checked,
                              )
                            }
                          />
                          <Label
                            htmlFor={`variant-isActive-${index}`}
                            className="text-sm font-normal"
                          >
                            {parentInactive
                              ? "Bị chặn"
                              : variantActive
                                ? "Đang bán"
                                : "Tạm tắt"}
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tên Variant *</Label>
                        <Input
                          {...form.register(`variants.${index}.name`)}
                          placeholder="Nhập tên variant"
                        />
                        {form.formState.errors.variants?.[index]?.name && (
                          <p className="text-sm text-red-500">
                            {
                              form.formState.errors.variants[index]?.name
                                ?.message
                            }
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Giá (VND)</Label>
                        <Input
                          value={formatCurrency(
                            form.watch(`variants.${index}.price`) || 0
                          )}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\./g, "");
                            const numericValue = Number(rawValue) || 0;
                            form.setValue(
                              `variants.${index}.price`,
                              numericValue
                            );
                          }}
                          placeholder="0"
                        />
                        {form.formState.errors.variants?.[index]?.price && (
                          <p className="text-sm text-red-500">
                            {
                              form.formState.errors.variants[index]?.price
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Hình ảnh variant */}
                    <div className="space-y-2">
                      <Label>Hình ảnh</Label>
                      <ImagePicker
                        onChange={(e) => handleVariantImagesChange(index, e)}
                        currentImage={
                          form.watch(`variants.${index}.image`) || ""
                        }
                        onRemove={() => {
                          form.setValue(`variants.${index}.image`, "");
                          setVariantFiles((prev) => {
                            const newFiles = { ...prev };
                            delete newFiles[index];
                            return newFiles;
                          });
                        }}
                      />
                    </div>

                    {/* Inventory cho variant */}
                    <div className="space-y-4">
                      <Label>Quản lý tồn kho</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Số lượng</Label>
                          <Input
                            type="number"
                            min={0}
                            {...form.register(
                              `variants.${index}.inventory.quantity`,
                              { valueAsNumber: true }
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tồn kho tối thiểu</Label>
                          <Input
                            type="number"
                            min={0}
                            {...form.register(
                              `variants.${index}.inventory.minStock`,
                              { valueAsNumber: true }
                            )}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tồn kho tối đa</Label>
                          <Input
                            type="number"
                            min={0}
                            {...form.register(
                              `variants.${index}.inventory.maxStock`,
                              { valueAsNumber: true }
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Customization Templates</h3>
                <p className="text-sm text-gray-500">
                  Chọn template dùng chung trước, sau đó cấu hình override giá theo món.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTemplates.length === 0 && (
                    <div className="text-sm text-gray-400">
                      Chưa có template đang hoạt động.
                    </div>
                  )}
                  {activeTemplates.map((template) => {
                    const checked = (
                      form.watch("customizationTemplateRefs") || []
                    ).some((ref) => ref.templateKey === template.templateKey);
                    return (
                      <label
                        key={template.templateKey}
                        className="flex items-start gap-2 rounded-md border p-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            toggleCustomizationTemplate(
                              template.templateKey,
                              event.target.checked
                            )
                          }
                        />
                        <div className="text-sm">
                          <div className="font-medium">{template.label}</div>
                          <div className="text-gray-500">
                            {template.group.label} ({template.group.groupKey})
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Price Overrides</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomizationOverride}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm override
                  </Button>
                </div>
                {(form.watch("customizationOverrides") || []).map(
                  (_, overrideIndex) => (
                    <div
                      key={`override-${overrideIndex}`}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-4 space-y-2">
                        <Label>groupKey *</Label>
                        <Input
                          {...form.register(
                            `customizationOverrides.${overrideIndex}.groupKey`
                          )}
                          placeholder="vd: sugar_level"
                        />
                      </div>
                      <div className="col-span-4 space-y-2">
                        <Label>optionKey *</Label>
                        <Input
                          {...form.register(
                            `customizationOverrides.${overrideIndex}.optionKey`
                          )}
                          placeholder="vd: less_sugar"
                        />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label>priceDelta</Label>
                        <Input
                          type="number"
                          {...form.register(
                            `customizationOverrides.${overrideIndex}.priceDelta`,
                            { valueAsNumber: true }
                          )}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomizationOverride(overrideIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Customization Groups</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomizationGroup}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Thêm nhóm
                </Button>
              </div>

              {(form.watch("customizationGroups") || []).map(
                (group, groupIndex) => (
                  <div
                    key={`customization-group-${groupIndex}`}
                    className="rounded-lg border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Nhóm {groupIndex + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomizationGroup(groupIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>groupKey *</Label>
                        <Input
                          {...form.register(
                            `customizationGroups.${groupIndex}.groupKey`
                          )}
                          placeholder="vd: size, topping"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tên nhóm *</Label>
                        <Input
                          {...form.register(
                            `customizationGroups.${groupIndex}.label`
                          )}
                          placeholder="vd: Size, Topping"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>minSelect</Label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(
                            `customizationGroups.${groupIndex}.minSelect`,
                            { valueAsNumber: true }
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>maxSelect</Label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(
                            `customizationGroups.${groupIndex}.maxSelect`,
                            { valueAsNumber: true }
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addCustomizationOption(groupIndex)}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Thêm option
                        </Button>
                      </div>

                      {(group.options || []).map((_, optionIndex) => (
                        <div
                          key={`customization-option-${groupIndex}-${optionIndex}`}
                          className="grid grid-cols-12 gap-2 items-end"
                        >
                          <div className="col-span-4 space-y-2">
                            <Label>optionKey *</Label>
                            <Input
                              {...form.register(
                                `customizationGroups.${groupIndex}.options.${optionIndex}.optionKey`
                              )}
                              placeholder="vd: m, l, pearl"
                            />
                          </div>
                          <div className="col-span-4 space-y-2">
                            <Label>Tên option *</Label>
                            <Input
                              {...form.register(
                                `customizationGroups.${groupIndex}.options.${optionIndex}.label`
                              )}
                              placeholder="vd: M, L, Trân châu"
                            />
                          </div>
                          <div className="col-span-3 space-y-2">
                            <Label>priceDelta</Label>
                            <Input
                              type="number"
                              {...form.register(
                                `customizationGroups.${groupIndex}.options.${optionIndex}.priceDelta`,
                                { valueAsNumber: true }
                              )}
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeCustomizationOption(
                                  groupIndex,
                                  optionIndex
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpsertMenuItemModal;
