import giftApis from "@/apis/gift.apis";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, GiftBundleItem, GiftType } from "@/@types/Gift";
import { GIFT_TYPES, GIFT_TYPE_LABELS } from "../constants";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { useGetMenuItems } from "@/hooks/use-menu-items";
import { FnBCategory } from "@/constants/enum";

interface UpsertGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  gift?: Gift | null; // null = create, object = edit
  onSuccess?: () => void;
}

// Schema validation
const giftBundleItemSchema = z
  .object({
    itemId: z.string().min(1, "Menu item là bắt buộc"),
    parentItemId: z.string().optional(), // ID của parent item nếu chọn variant
    quantity: z.number().min(1, "Số lượng phải lớn hơn 0"),
    name: z.string().optional(),
    category: z.string().optional(),
    priceSnapshot: z.number().optional(),
    source: z.enum(["fnb_menu", "fnb_menu_item"]).optional(),
  })
  .refine(
    (data) => {
      // Nếu có parentItemId thì itemId phải là variant của parent đó
      if (data.parentItemId) {
        return !!data.itemId; // itemId phải được set (variant đã được chọn)
      }
      return true;
    },
    {
      message: "Vui lòng chọn variant",
      path: ["itemId"],
    }
  );

const formSchema = z
  .object({
    name: z.string().min(1, "Tên quà tặng là bắt buộc"),
    type: z.enum(
      [
        "snacks_drinks",
        "discount_percentage",
        "discount_amount",
        "fnb_discount_amount",
        "discount",
      ],
      {
        required_error: "Loại quà tặng là bắt buộc",
      }
    ),
    image: z.string().optional().nullable(),
    price: z.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 0 : val),
      z.number().min(0, "Giá phải lớn hơn hoặc bằng 0").optional()
    ),
    discountPercentage: z.preprocess(
      (val) =>
        val === null || val === undefined || val === "" ? undefined : val,
      z.number().gt(0, "Phần trăm giảm giá phải lớn hơn 0").optional()
    ),
    discountAmount: z.preprocess(
      (val) =>
        val === null || val === undefined || val === "" ? undefined : val,
      z.number().gt(0, "Số tiền giảm giá phải lớn hơn 0").optional()
    ),
    categories: z.preprocess(
      (val) => (val === null || val === undefined ? [] : val),
      z.array(z.nativeEnum(FnBCategory)).optional()
    ),
    items: z.array(giftBundleItemSchema).optional(),
    totalQuantity: z.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 1 : val),
      z.number().min(1, "Tổng số lượng phải lớn hơn 0")
    ),
    remainingQuantity: z.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 0 : val),
      z.number().min(0, "Số lượng còn lại phải lớn hơn hoặc bằng 0")
    ),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    // Chỉ validate items khi type là "snacks_drinks"
    if (data.type === "snacks_drinks" && data.items && data.items.length > 0) {
      // Validate từng item trong array
      data.items.forEach((item, index) => {
        if (!item.itemId || item.itemId.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Menu item là bắt buộc",
            path: ["items", index, "itemId"],
          });
        }
      });
    }

    // Nếu type là discount_percentage/alias discount, yêu cầu discountPercentage > 0
    if (
      (data.type === "discount_percentage" || data.type === "discount") &&
      (!data.discountPercentage || data.discountPercentage <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phần trăm giảm giá phải lớn hơn 0",
        path: ["discountPercentage"],
      });
    }

    // Nếu type là discount_amount, yêu cầu discountAmount > 0
    if (
      (data.type === "discount_amount" ||
        data.type === "fnb_discount_amount") &&
      (!data.discountAmount || data.discountAmount <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số tiền giảm giá phải lớn hơn 0",
        path: ["discountAmount"],
      });
    }

    // Nếu type là fnb_discount_amount, yêu cầu categories ít nhất 1 giá trị
    if (
      data.type === "fnb_discount_amount" &&
      (!data.categories || data.categories.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chọn ít nhất 1 danh mục FnB",
        path: ["categories"],
      });
    }

    // remainingQuantity không được lớn hơn totalQuantity
    if (data.remainingQuantity > data.totalQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số lượng còn lại không được vượt quá tổng số lượng",
        path: ["remainingQuantity"],
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

// Chuẩn hóa type: alias "discount" map về "discount_percentage"
const normalizeGiftType = (type: GiftType): GiftType =>
  type === GIFT_TYPES.DISCOUNT ? GIFT_TYPES.DISCOUNT_PERCENTAGE : type;

const DEFAULT_GIFT_VALUES: FormData = {
  name: "",
  type: GIFT_TYPES.SNACKS_DRINKS,
  image: "",
  price: undefined,
  discountPercentage: undefined,
  discountAmount: undefined,
  categories: [],
  items: [],
  totalQuantity: 1,
  remainingQuantity: 1,
  isActive: true,
};

const UpsertGiftModal: React.FC<UpsertGiftModalProps> = ({
  isOpen,
  onClose,
  gift,
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: Set<string>;
  }>({});
  const [openItemModalIndex, setOpenItemModalIndex] = useState<number | null>(
    null
  );

  const isEdit = !!gift?._id;

  // Query để lấy chi tiết gift khi edit
  const {
    data: giftDetail,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useQuery({
    queryKey: ["gift", gift?._id],
    queryFn: () => giftApis.getGiftById(gift?._id || ""),
    enabled: isEdit && !!gift?._id && isOpen,
  });

  // Query để lấy menu items cho select dropdown
  const { data: menuItems = [] } = useGetMenuItems();

  // Group menu items: parent items và variants
  type MenuItemType = (typeof menuItems)[0];
  interface MenuItemWithVariants extends Omit<MenuItemType, "variants"> {
    variants: MenuItemType[];
  }
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (item.parentId) {
      // This is a variant
      const parent = acc.find((p) => p._id === item.parentId);
      if (parent && "variants" in parent && Array.isArray(parent.variants)) {
        parent.variants.push(item);
      }
    } else {
      // This is a parent item
      const itemWithVariants: MenuItemWithVariants = { ...item, variants: [] };
      acc.push(itemWithVariants);
    }
    return acc;
  }, [] as MenuItemWithVariants[]);

  // Get all selectable items (parent items without variants + all variants)
  const selectableItems = menuItems.filter(
    (item) => !item.parentId && !item.hasVariant
  );
  const parentItemsWithVariants = groupedMenuItems.filter(
    (item) => item.hasVariant && item.variants && item.variants.length > 0
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_GIFT_VALUES,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const giftType = form.watch("type");
  const totalQuantityValue = form.watch("totalQuantity");
  const selectedCategories = form.watch("categories") || [];
  const categoryError = form.formState.errors.categories;
  const categoryErrorMessage =
    categoryError && !Array.isArray(categoryError)
      ? categoryError.message
      : undefined;
  const fnbCategoryOptions = [
    { value: FnBCategory.DRINK, label: "Đồ uống" },
    { value: FnBCategory.SNACK, label: "Đồ ăn" },
  ];
  const isDiscountPercentage =
    giftType === GIFT_TYPES.DISCOUNT_PERCENTAGE ||
    giftType === GIFT_TYPES.DISCOUNT;
  const isDiscountAmount =
    giftType === GIFT_TYPES.DISCOUNT_AMOUNT ||
    giftType === GIFT_TYPES.FNB_DISCOUNT_AMOUNT;
  const isFnBDiscountAmount = giftType === GIFT_TYPES.FNB_DISCOUNT_AMOUNT;

  // Đảm bảo remainingQuantity không vượt quá totalQuantity khi người dùng chỉnh
  useEffect(() => {
    const remaining = form.getValues("remainingQuantity");
    if (remaining > totalQuantityValue) {
      form.setValue("remainingQuantity", totalQuantityValue);
    }
  }, [totalQuantityValue, form]);

  // Cập nhật form khi có dữ liệu chi tiết hoặc mở modal tạo mới (tránh reset lặp)
  const initializedKeyRef = useRef<string | null>(null);
  const menuItemsLength = menuItems.length;

  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Khi edit
    if (isEdit && giftDetail?.data?.result) {
      const detail = giftDetail.data.result;
      const normalizedType = normalizeGiftType(detail.type as GiftType);
      const key = `edit-${gift?._id || ""}-${menuItemsLength}`;
      if (initializedKeyRef.current === key) return;

      // Xử lý items để set parentItemId nếu là variant
      const processedItems = (detail.items || []).map(
        (item: GiftBundleItem) => {
          const menuItem = menuItems.find((mi) => mi._id === item.itemId);
          if (menuItem && menuItem.parentId) {
            return {
              ...item,
              parentItemId: menuItem.parentId,
            };
          }
          return item;
        }
      );

      initializedKeyRef.current = key;
      form.reset({
        name: detail.name || "",
        type: normalizedType || GIFT_TYPES.SNACKS_DRINKS,
        image: detail.image || "",
        price: detail.price,
        discountPercentage: detail.discountPercentage,
        discountAmount: detail.discountAmount,
        categories: detail.categories || [],
        items: processedItems,
        totalQuantity: detail.totalQuantity || 1,
        remainingQuantity:
          detail.remainingQuantity ?? detail.totalQuantity ?? 0,
        isActive: detail.isActive ?? true,
      });
      setMainImageFile(null);
      return;
    }

    // Khi tạo mới
    if (!isEdit) {
      const key = `create-${menuItemsLength}`;
      if (initializedKeyRef.current === key) return;
      initializedKeyRef.current = key;
      form.reset(DEFAULT_GIFT_VALUES);
      setMainImageFile(null);
    }
  }, [
    isOpen,
    isEdit,
    gift?._id,
    giftDetail?.data?.result,
    menuItemsLength,
    form,
    menuItems,
  ]);

  // Hiển thị lỗi nếu có
  useEffect(() => {
    if (detailError) {
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin chi tiết quà tặng",
        variant: "destructive",
      });
    }
  }, [detailError, toast]);

  // Hàm format currency
  const formatCurrency = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const addItem = () => {
    append({
      itemId: "",
      quantity: 1,
      name: "",
      source: "fnb_menu_item",
    });
  };

  const removeItem = (index: number) => {
    remove(index);
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      form.setValue("image", URL.createObjectURL(file));
    }
  };

  const handleCategoryToggle = (category: FnBCategory, checked: boolean) => {
    const current = form.getValues("categories") || [];
    const next = checked
      ? Array.from(new Set([...current, category]))
      : current.filter((c) => c !== category);
    form.setValue("categories", next);
  };

  // Handle menu item selection (parent item hoặc item không có variant)
  const handleMenuItemChange = (index: number, itemId: string) => {
    const selectedItem = menuItems.find((item) => item._id === itemId);
    if (selectedItem) {
      // Nếu là variant, lưu cả parentId
      if (selectedItem.parentId) {
        form.setValue(`items.${index}.parentItemId`, selectedItem.parentId);
        form.setValue(`items.${index}.itemId`, itemId);
        // Tự động expand parent item
        setExpandedItems((prev) => {
          const newExpanded = { ...prev };
          if (!newExpanded[index]) {
            newExpanded[index] = new Set();
          }
          const indexSet = new Set(newExpanded[index]);
          indexSet.add(selectedItem.parentId!);
          return { ...newExpanded, [index]: indexSet };
        });
      } else {
        // Nếu là parent item hoặc item không có variant
        form.setValue(`items.${index}.parentItemId`, undefined);
        form.setValue(`items.${index}.itemId`, itemId);
      }

      form.setValue(`items.${index}.name`, selectedItem.name);
      form.setValue(`items.${index}.category`, selectedItem.category);
      form.setValue(`items.${index}.priceSnapshot`, selectedItem.price);
      form.setValue(`items.${index}.source`, "fnb_menu_item");
    }
  };

  // Get variants for a specific parent item
  const getVariantsForParent = (parentId: string) => {
    const parent = groupedMenuItems.find((item) => item._id === parentId);
    return parent?.variants || [];
  };

  // Toggle expand/collapse cho parent item trong modal
  const toggleExpandInModal = (parentId: string) => {
    if (openItemModalIndex === null) return;
    setExpandedItems((prev) => {
      const newExpanded = { ...prev };
      if (!newExpanded[openItemModalIndex]) {
        newExpanded[openItemModalIndex] = new Set();
      }
      const indexSet = new Set(newExpanded[openItemModalIndex]);
      if (indexSet.has(parentId)) {
        indexSet.delete(parentId);
      } else {
        indexSet.add(parentId);
      }
      return { ...newExpanded, [openItemModalIndex]: indexSet };
    });
  };

  // Check if parent item is expanded trong modal
  const isExpandedInModal = (parentId: string) => {
    if (openItemModalIndex === null) return false;
    return expandedItems[openItemModalIndex]?.has(parentId) || false;
  };

  // Get selected item name để hiển thị
  const getSelectedItemName = (index: number) => {
    const itemId = form.watch(`items.${index}.itemId`);
    if (!itemId) return "";
    const item = menuItems.find((i) => i._id === itemId);
    return item?.name || "";
  };

  // Handle select item trong modal
  const handleSelectItemInModal = (itemId: string) => {
    if (openItemModalIndex === null) return;
    handleMenuItemChange(openItemModalIndex, itemId);
    setOpenItemModalIndex(null); // Đóng modal sau khi chọn
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      const submitFormData = new FormData();

      // Các trường text bắt buộc
      submitFormData.append("name", data.name);
      const normalizedType = normalizeGiftType(data.type as GiftType);
      submitFormData.append("type", normalizedType);
      submitFormData.append("totalQuantity", data.totalQuantity.toString());
      submitFormData.append(
        "remainingQuantity",
        data.remainingQuantity.toString()
      );
      submitFormData.append("isActive", data.isActive.toString());

      // Các trường optional
      if (data.type === "snacks_drinks" && data.price !== undefined) {
        submitFormData.append("price", data.price.toString());
      }

      if (
        (data.type === "discount_percentage" || data.type === "discount") &&
        data.discountPercentage !== undefined
      ) {
        submitFormData.append(
          "discountPercentage",
          data.discountPercentage.toString()
        );
      }

      if (
        (data.type === "discount_amount" ||
          data.type === "fnb_discount_amount") &&
        data.discountAmount !== undefined
      ) {
        submitFormData.append("discountAmount", data.discountAmount.toString());
      }

      if (
        data.type === "fnb_discount_amount" &&
        data.categories &&
        data.categories.length > 0
      ) {
        data.categories.forEach((category) =>
          submitFormData.append("categories", category)
        );
      }

      // File ảnh chính (optional)
      if (data.image) {
        if (data.image.startsWith("http")) {
          submitFormData.append("existingImage", data.image);
        } else if (mainImageFile) {
          submitFormData.append("file", mainImageFile);
        }
      }

      // Xử lý items nếu có (cho type = snacks_drinks)
      if (
        data.type === "snacks_drinks" &&
        data.items &&
        data.items.length > 0
      ) {
        submitFormData.append("items", JSON.stringify(data.items));
      }

      if (isEdit && gift?._id) {
        await giftApis.updateGift(gift._id, submitFormData);
      } else {
        await giftApis.createGift(submitFormData);
      }

      toast({
        title: "Thành công",
        description: isEdit
          ? "Cập nhật quà tặng thành công"
          : "Tạo quà tặng mới thành công",
      });

      // Invalidate queries để refetch danh sách
      await queryClient.invalidateQueries({ queryKey: ["gifts"] });

      // Nếu đang edit, cũng invalidate query chi tiết
      if (isEdit && gift?._id) {
        await queryClient.invalidateQueries({
          queryKey: ["gift", gift._id],
        });
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error saving gift:", error);
      toast({
        title: "Lỗi",
        description: "Có lỗi xảy ra khi lưu quà tặng",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset(DEFAULT_GIFT_VALUES);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa Quà Tặng" : "Thêm Quà Tặng mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin quà tặng"
              : "Tạo quà tặng mới cho hệ thống"}
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

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Tên quà tặng */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Tên quà tặng *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nhập tên quà tặng"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Loại quà tặng */}
                <div className="space-y-2">
                  <Label htmlFor="type">Loại quà tặng *</Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(value) => {
                      const newType = value as GiftType;
                      form.setValue("type", newType);
                      // Clear items và giá không dùng cho discount
                      if (
                        newType === GIFT_TYPES.DISCOUNT_PERCENTAGE ||
                        newType === GIFT_TYPES.DISCOUNT ||
                        newType === GIFT_TYPES.DISCOUNT_AMOUNT ||
                        newType === GIFT_TYPES.FNB_DISCOUNT_AMOUNT
                      ) {
                        form.setValue("items", []);
                        form.setValue("price", undefined);
                      }
                      if (
                        newType === GIFT_TYPES.DISCOUNT_PERCENTAGE ||
                        newType === GIFT_TYPES.DISCOUNT
                      ) {
                        form.setValue("discountAmount", undefined);
                      }
                      if (
                        newType === GIFT_TYPES.DISCOUNT_AMOUNT ||
                        newType === GIFT_TYPES.FNB_DISCOUNT_AMOUNT
                      ) {
                        form.setValue("discountPercentage", undefined);
                      }
                      if (newType !== GIFT_TYPES.FNB_DISCOUNT_AMOUNT) {
                        form.setValue("categories", []);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GIFT_TYPES.SNACKS_DRINKS}>
                        {GIFT_TYPE_LABELS[GIFT_TYPES.SNACKS_DRINKS]}
                      </SelectItem>
                      <SelectItem value={GIFT_TYPES.DISCOUNT_PERCENTAGE}>
                        {GIFT_TYPE_LABELS[GIFT_TYPES.DISCOUNT_PERCENTAGE]}
                      </SelectItem>
                      <SelectItem value={GIFT_TYPES.DISCOUNT_AMOUNT}>
                        {GIFT_TYPE_LABELS[GIFT_TYPES.DISCOUNT_AMOUNT]}
                      </SelectItem>
                      <SelectItem value={GIFT_TYPES.FNB_DISCOUNT_AMOUNT}>
                        {GIFT_TYPE_LABELS[GIFT_TYPES.FNB_DISCOUNT_AMOUNT]}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.type.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* Tổng số lượng */}
                <div className="space-y-2">
                  <Label htmlFor="totalQuantity">Tổng số lượng *</Label>
                  <Input
                    id="totalQuantity"
                    type="number"
                    min={1}
                    {...form.register("totalQuantity", {
                      valueAsNumber: true,
                    })}
                    placeholder="1"
                  />
                  {form.formState.errors.totalQuantity && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.totalQuantity.message}
                    </p>
                  )}
                </div>

                {/* Số lượng còn lại */}
                <div className="space-y-2">
                  <Label htmlFor="remainingQuantity">Số lượng còn lại *</Label>
                  <Input
                    id="remainingQuantity"
                    type="number"
                    min={0}
                    max={form.watch("totalQuantity")}
                    {...form.register("remainingQuantity", {
                      valueAsNumber: true,
                    })}
                    placeholder="0"
                  />
                  {form.formState.errors.remainingQuantity && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.remainingQuantity.message}
                    </p>
                  )}
                </div>

                {/* Giá - chỉ hiển thị khi type = snacks_drinks */}
                {giftType === GIFT_TYPES.SNACKS_DRINKS && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá (VND)</Label>
                    <Input
                      id="price"
                      value={
                        form.watch("price")
                          ? formatCurrency(form.watch("price") || 0)
                          : ""
                      }
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
                )}

                {/* Phần trăm giảm giá - chỉ hiển thị khi type = discount */}
                {isDiscountPercentage && (
                  <div className="space-y-2">
                    <Label htmlFor="discountPercentage">
                      Phần trăm giảm giá (%)
                    </Label>
                    <Input
                      id="discountPercentage"
                      type="number"
                      min={0.01}
                      max={100}
                      {...form.register("discountPercentage", {
                        valueAsNumber: true,
                      })}
                      placeholder="0"
                    />
                    {form.formState.errors.discountPercentage && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.discountPercentage.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Số tiền giảm giá - chỉ hiển thị khi type = discount_amount */}
                {isDiscountAmount && (
                  <div className="space-y-2">
                    <Label htmlFor="discountAmount">
                      Số tiền giảm giá (VND)
                    </Label>
                    <Input
                      id="discountAmount"
                      value={
                        form.watch("discountAmount")
                          ? formatCurrency(form.watch("discountAmount") || 0)
                          : ""
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\./g, "");
                        const numericValue = Number(rawValue) || 0;
                        form.setValue("discountAmount", numericValue);
                      }}
                      placeholder="0"
                    />
                    {form.formState.errors.discountAmount && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.discountAmount.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Danh mục FnB - chỉ hiển thị khi type = fnb_discount_amount */}
                {isFnBDiscountAmount && (
                  <div className="space-y-2 col-span-3">
                    <Label>Danh mục FnB áp dụng *</Label>
                    <div className="flex gap-4">
                      {fnbCategoryOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={selectedCategories.includes(option.value)}
                            onCheckedChange={(checked) =>
                              handleCategoryToggle(
                                option.value,
                                Boolean(checked)
                              )
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {categoryErrorMessage && (
                      <p className="text-sm text-red-500">
                        {categoryErrorMessage as string}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Kích hoạt */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) =>
                    form.setValue("isActive", checked)
                  }
                />
                <Label htmlFor="isActive">Kích hoạt</Label>
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

            {/* Phần Items - chỉ hiển thị khi type = snacks_drinks */}
            {giftType === GIFT_TYPES.SNACKS_DRINKS && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Thêm Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Menu Item Selection - Button để mở modal */}
                      <div className="space-y-2">
                        <Label>Menu Item *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setOpenItemModalIndex(index)}
                        >
                          {getSelectedItemName(index) || "Chọn menu item"}
                        </Button>
                        {form.formState.errors.items?.[index]?.itemId && (
                          <p className="text-sm text-red-500">
                            {
                              form.formState.errors.items[index]?.itemId
                                ?.message
                            }
                          </p>
                        )}
                      </div>

                      {/* Số lượng */}
                      <div className="space-y-2">
                        <Label>Số lượng *</Label>
                        <Input
                          type="number"
                          min={1}
                          {...form.register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                          placeholder="1"
                        />
                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-sm text-red-500">
                            {
                              form.formState.errors.items[index]?.quantity
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

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

      {/* Modal chọn Menu Item */}
      <Dialog
        open={openItemModalIndex !== null}
        onOpenChange={(open) => !open && setOpenItemModalIndex(null)}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chọn Menu Item</DialogTitle>
            <DialogDescription>
              Chọn menu item hoặc variant để thêm vào quà tặng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {/* Items không có variant */}
            {selectableItems.map((item) => {
              const isSelected =
                openItemModalIndex !== null &&
                form.watch(`items.${openItemModalIndex}.itemId`) === item._id &&
                !form.watch(`items.${openItemModalIndex}.parentItemId`);
              return (
                <div
                  key={item._id}
                  onClick={() => handleSelectItemInModal(item._id!)}
                  className={`p-3 rounded cursor-pointer hover:bg-gray-100 transition-colors border ${
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.name}</span>
                    {isSelected && (
                      <span className="text-xs text-blue-600 font-medium">
                        ✓ Đã chọn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Parent items có variant */}
            {parentItemsWithVariants.map((item) => {
              const isExpandedItem = isExpandedInModal(item._id!);
              const variants = getVariantsForParent(item._id!);

              return (
                <div key={item._id} className="border border-gray-200 rounded">
                  <div
                    onClick={() => toggleExpandInModal(item._id!)}
                    className="p-3 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpandedItem ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-gray-500">
                        ({variants.length} variants)
                      </span>
                    </div>
                  </div>

                  {/* Variants - hiển thị khi expanded */}
                  {isExpandedItem && (
                    <div className="border-t border-gray-200 bg-gray-50">
                      {variants.map((variant) => {
                        const isVariantSelected =
                          openItemModalIndex !== null &&
                          form.watch(`items.${openItemModalIndex}.itemId`) ===
                            variant._id &&
                          form.watch(
                            `items.${openItemModalIndex}.parentItemId`
                          ) === item._id;
                        return (
                          <div
                            key={variant._id}
                            onClick={() =>
                              handleSelectItemInModal(variant._id!)
                            }
                            className={`p-3 ml-6 cursor-pointer hover:bg-gray-100 transition-colors border-l-2 ${
                              isVariantSelected
                                ? "bg-blue-50 border-l-blue-500"
                                : "border-l-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">
                                • {variant.name}
                              </span>
                              {isVariantSelected && (
                                <span className="text-xs text-blue-600 font-medium">
                                  ✓ Đã chọn
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenItemModalIndex(null)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default UpsertGiftModal;
