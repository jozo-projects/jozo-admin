import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import fnbMenuApis from "@/apis/fnbMenu.apis";
import {
  FnBMenuCustomizationGroup,
  FnBMenuCustomizationOverride,
  FnBMenuCustomizationTemplateRef,
} from "@/@types/FnBCustomization";
import fnbOrderApis, {
  ICompleteOrderRequestBody,
  ICompleteOrderResult,
} from "@/apis/fnbOrder.apis";
import { FnbRevenueCategory } from "@/@types/Bill";
import { FnBCategory } from "@/constants/enum";

// Interface cho menu item theo cấu trúc cũ (để tương thích)
export interface FnBMenuItem {
  _id?: string;
  name: string;
  category: FnBCategory;
  parentId: string | null;
  hasVariant: boolean;
  price: number;
  image?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  revenueCategory?: FnbRevenueCategory;
  inventoryTracked?: boolean;
  inventory: {
    quantity: number;
    minStock?: number;
    maxStock?: number;
    lastUpdated: Date;
  };
  parent?: FnBMenuItem; // Thông tin parent item
  variants?: FnBMenuItem[]; // Danh sách variants
  customizationGroups?: FnBMenuCustomizationGroup[];
  customizationTemplateRefs?: FnBMenuCustomizationTemplateRef[];
  customizationOverrides?: FnBMenuCustomizationOverride[];
}

// Interface cho menu item theo cấu trúc mới
export interface MenuItemVariant {
  name: string;
  price: number;
  image: string;
  inventory: {
    quantity: number;
    minStock?: number;
    maxStock?: number;
  };
}

export interface MenuItem {
  _id: string;
  name: string;
  parentId: string | null;
  hasVariant: boolean;
  price: number;
  image: string;
  category: string;
  inventory: {
    quantity: number;
    minStock?: number;
    maxStock?: number;
    lastUpdated?: string;
  };
  createdAt: string;
  updatedAt: string;
  existingImage?: string;
  quantity?: string;
  variants?: string; // JSON string của variants
}

interface CreateMenuItemData {
  name: string;
  category: FnBCategory;
  parentId: string | null;
  hasVariant: boolean;
  price: number;
  quantity: number;
  image?: File;
}

interface UpdateMenuItemData extends Partial<CreateMenuItemData> {
  _id: string;
}

export const parseNestedVariants = (parent: FnBMenuItem): FnBMenuItem[] => {
  if (!parent.variants) return [];

  const rawVariants = Array.isArray(parent.variants)
    ? parent.variants
    : (() => {
        try {
          const parsed = JSON.parse(parent.variants as unknown as string);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  return rawVariants.map((variant) => ({
    ...variant,
    parentId: variant.parentId || parent._id || null,
    category: variant.category || parent.category,
    revenueCategory: variant.revenueCategory || parent.revenueCategory,
    inventoryTracked: variant.inventoryTracked ?? parent.inventoryTracked,
    hasVariant: false,
    inventory: {
      quantity: variant.inventory?.quantity ?? 0,
      minStock: variant.inventory?.minStock,
      maxStock: variant.inventory?.maxStock,
      lastUpdated: variant.inventory?.lastUpdated ?? new Date(),
    },
  }));
};

export const groupMenuItemsByParent = (
  items: FnBMenuItem[],
): FnBMenuItem[] => {
  const parents: FnBMenuItem[] = [];
  const childrenMap: Record<string, FnBMenuItem[]> = {};

  const addChild = (parentId: string, child: FnBMenuItem) => {
    if (!childrenMap[parentId]) childrenMap[parentId] = [];
    if (!childrenMap[parentId].some((existing) => existing._id === child._id)) {
      childrenMap[parentId].push(child);
    }
  };

  items.forEach((item) => {
    if (item.parentId) {
      addChild(item.parentId, item);
      return;
    }

    parents.push(item);
    if (item._id) {
      parseNestedVariants(item).forEach((variant) => addChild(item._id!, variant));
    }
  });

  return parents.map((parent) => ({
    ...parent,
    variants: parent._id ? childrenMap[parent._id] || [] : [],
  }));
};

// Query keys
export const menuItemsQueryKeys = {
  all: ["menuItems"] as const,
  lists: () => [...menuItemsQueryKeys.all, "list"] as const,
  list: (filters: string) =>
    [...menuItemsQueryKeys.lists(), { filters }] as const,
  details: () => [...menuItemsQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...menuItemsQueryKeys.details(), id] as const,
  legacyDetail: (id: string) => ["menuItem", id] as const,
};

const menuItemsKeys = menuItemsQueryKeys;

export const normalizeMenuItemApiResponse = (
  data: unknown,
): FnBMenuItem | null => {
  if (!data || typeof data !== "object") return null;

  if ("result" in data && data.result && typeof data.result === "object") {
    return data.result as FnBMenuItem;
  }

  return data as FnBMenuItem;
};

const isTempMenuItemId = (id?: string) => !!id?.startsWith("temp-id-");

export const patchMenuItemInListCache = (
  queryClient: QueryClient,
  itemId: string,
  patch: Partial<FnBMenuItem>,
) => {
  queryClient.setQueryData(menuItemsKeys.lists(), (old: FnBMenuItem[] = []) =>
    old.map((item) => {
      if (item._id === itemId) {
        return { ...item, ...patch };
      }

      if (!item.variants?.length) {
        return item;
      }

      let hasVariantPatch = false;
      const nextVariants = item.variants.map((variant) => {
        if (variant._id !== itemId) return variant;
        hasVariantPatch = true;
        return { ...variant, ...patch };
      });

      return hasVariantPatch ? { ...item, variants: nextVariants } : item;
    }),
  );
};

export const upsertMenuItemInListCache = (
  queryClient: QueryClient,
  savedItem: FnBMenuItem,
) => {
  if (!savedItem._id) return;

  queryClient.setQueryData(menuItemsKeys.lists(), (old: FnBMenuItem[] = []) => {
    const withoutTemp = old.filter((item) => !isTempMenuItemId(item._id));
    const index = withoutTemp.findIndex((item) => item._id === savedItem._id);

    if (index >= 0) {
      const next = [...withoutTemp];
      next[index] = { ...withoutTemp[index], ...savedItem };
      return next;
    }

    return [...withoutTemp, savedItem];
  });
};

export const removeMenuItemFromListCache = (
  queryClient: QueryClient,
  itemId: string,
) => {
  queryClient.setQueryData(menuItemsKeys.lists(), (old: FnBMenuItem[] = []) =>
    old.filter((item) => item._id !== itemId),
  );
};

export const replaceMenuItemsListCache = (
  queryClient: QueryClient,
  items: FnBMenuItem[],
) => {
  queryClient.setQueryData(menuItemsKeys.lists(), items);
};

const syncMenuItemDetailCaches = (
  queryClient: QueryClient,
  savedItem: FnBMenuItem,
) => {
  if (!savedItem._id) return;

  queryClient.setQueryData(menuItemsKeys.detail(savedItem._id), savedItem);
  queryClient.setQueryData(
    menuItemsKeys.legacyDetail(savedItem._id),
    { data: { result: savedItem } },
  );
};

// API functions using fnbMenuApis
export const fetchMenuItems = async (): Promise<FnBMenuItem[]> => {
  const response = await fnbMenuApis.getAllMenuItems();
  return response.data.result || [];
};

const createMenuItem = async (formData: FormData): Promise<FnBMenuItem> => {
  const response = await fnbMenuApis.createMenuItem(formData);
  const savedItem = normalizeMenuItemApiResponse(response.data);
  if (!savedItem) {
    throw new Error("Failed to create menu item");
  }
  return savedItem;
};

const updateMenuItem = async ({
  _id,
  ...data
}: UpdateMenuItemData): Promise<FnBMenuItem> => {
  const formData = new FormData();

  // Append all fields to FormData
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === "image" && value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  });

  const response = await fnbMenuApis.updateMenuItem(_id, formData);
  const savedItem = normalizeMenuItemApiResponse(response.data);
  if (!savedItem) {
    throw new Error("Failed to update menu item");
  }
  return savedItem;
};

const deleteMenuItem = async (itemId: string): Promise<void> => {
  await fnbMenuApis.deleteMenuItem(itemId);
};

const cleanupMenuItems = async (dryRun: boolean) => {
  const response = await fnbMenuApis.cleanupMenuItems(dryRun);
  return response.data;
};

const updateMenuItemActive = async ({
  _id,
  isActive,
}: {
  _id: string;
  isActive: boolean;
}): Promise<FnBMenuItem | null> => {
  const response = await fnbMenuApis.updateMenuItemActive(_id, isActive);
  return response.data.result ?? null;
};

// Hook cũ (để tương thích)
export const useMenuItems = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query: Fetch all menu items with better caching
  const {
    data: menuItems = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: menuItemsKeys.lists(),
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const groupedItems = useMemo(
    () => groupMenuItemsByParent(menuItems),
    [menuItems],
  );

  const parentItems = useMemo(
    () => menuItems.filter((item) => item.hasVariant && !item.parentId),
    [menuItems],
  );

  // Mutation: Create menu item with optimistic updates
  const createMutation = useMutation({
    mutationFn: createMenuItem,
    onMutate: async (newMenuItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: menuItemsKeys.lists() });

      // Snapshot the previous value
      const previousMenuItems = queryClient.getQueryData(menuItemsKeys.lists());

      // Optimistically update to the new value
      queryClient.setQueryData(
        menuItemsKeys.lists(),
        (old: FnBMenuItem[] = []) => [
          ...old,
          {
            _id: "temp-id-" + Date.now(),
            name: newMenuItem.get("name") as string,
            category:
              (newMenuItem.get("category") as FnBCategory) || FnBCategory.SNACK,
            parentId: (newMenuItem.get("parentId") as string) || null,
            hasVariant: newMenuItem.get("hasVariant") === "true",
            price: Number(newMenuItem.get("price")),
            inventory: {
              quantity: Number(newMenuItem.get("quantity")),
              lastUpdated: new Date(),
            },
          } as FnBMenuItem,
        ]
      );

      // Return a context object with the snapshotted value
      return { previousMenuItems };
    },
    onError: (err, _newMenuItem, context) => {
      if (context?.previousMenuItems) {
        queryClient.setQueryData(
          menuItemsKeys.lists(),
          context.previousMenuItems
        );
      }
      console.error("Error creating menu item:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tạo menu item",
        variant: "destructive",
      });
    },
    onSuccess: (savedItem) => {
      upsertMenuItemInListCache(queryClient, savedItem);
      syncMenuItemDetailCaches(queryClient, savedItem);
      toast({
        title: "Thành công",
        description: "Đã tạo menu item mới",
      });
    },
  });

  // Mutation: Update menu item with optimistic updates
  const updateMutation = useMutation({
    mutationFn: updateMenuItem,
    onMutate: async ({ _id, ...updatedData }) => {
      await queryClient.cancelQueries({ queryKey: menuItemsKeys.lists() });

      const previousMenuItems = queryClient.getQueryData(menuItemsKeys.lists());

      queryClient.setQueryData(
        menuItemsKeys.lists(),
        (old: FnBMenuItem[] = []) =>
          old.map((item) =>
            item._id === _id ? { ...item, ...updatedData } : item
          )
      );

      return { previousMenuItems };
    },
    onError: (err, _variables, context) => {
      if (context?.previousMenuItems) {
        queryClient.setQueryData(
          menuItemsKeys.lists(),
          context.previousMenuItems
        );
      }
      console.error("Error updating menu item:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể cập nhật menu item",
        variant: "destructive",
      });
    },
    onSuccess: (savedItem) => {
      upsertMenuItemInListCache(queryClient, savedItem);
      syncMenuItemDetailCaches(queryClient, savedItem);
      toast({
        title: "Thành công",
        description: "Đã cập nhật menu item",
      });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: cleanupMenuItems,
    onSuccess: async (data, dryRun) => {
      if (!dryRun) {
        toast({
          title: "Thành công",
          description: data.message,
        });
        const items = await fetchMenuItems();
        replaceMenuItemsListCache(queryClient, items);
      }
    },
    onError: (err: Error) => {
      console.error("Error cleaning up menu items:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể dọn dữ liệu menu",
        variant: "destructive",
      });
    },
  });

  const updateActiveMutation = useMutation({
    mutationFn: updateMenuItemActive,
    onMutate: async ({ _id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: menuItemsKeys.lists() });

      const previousMenuItems = queryClient.getQueryData(menuItemsKeys.lists());

      queryClient.setQueryData(
        menuItemsKeys.lists(),
        (old: FnBMenuItem[] = []) =>
          old.map((item) => {
            if (item._id === _id) {
              return { ...item, isActive };
            }

            if (!item.variants?.length) {
              return item;
            }

            let hasVariantPatch = false;
            const nextVariants = item.variants.map((variant) => {
              if (variant._id !== _id) return variant;
              hasVariantPatch = true;
              return { ...variant, isActive };
            });

            return hasVariantPatch ? { ...item, variants: nextVariants } : item;
          }),
      );

      return { previousMenuItems };
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previousMenuItems) {
        queryClient.setQueryData(
          menuItemsKeys.lists(),
          context.previousMenuItems
        );
      }
      console.error("Error updating menu item active status:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể cập nhật trạng thái menu item",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables) => {
      if (data) {
        patchMenuItemInListCache(queryClient, variables._id, data);
        syncMenuItemDetailCaches(queryClient, data);
      }
      toast({
        title: "Thành công",
        description: variables.isActive
          ? "Đã bật bán menu item"
          : "Đã tắt bán menu item",
      });
    },
  });

  // Mutation: Delete menu item with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: deleteMenuItem,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: menuItemsKeys.lists() });

      const previousMenuItems = queryClient.getQueryData(menuItemsKeys.lists());

      queryClient.setQueryData(
        menuItemsKeys.lists(),
        (old: FnBMenuItem[] = []) => old.filter((item) => item._id !== itemId)
      );

      return { previousMenuItems };
    },
    onError: (err, _variables, context) => {
      if (context?.previousMenuItems) {
        queryClient.setQueryData(
          menuItemsKeys.lists(),
          context.previousMenuItems
        );
      }
      console.error("Error deleting menu item:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể xóa menu item",
        variant: "destructive",
      });
    },
    onSuccess: (_data, itemId) => {
      removeMenuItemFromListCache(queryClient, itemId);
      queryClient.removeQueries({ queryKey: menuItemsKeys.detail(itemId) });
      queryClient.removeQueries({
        queryKey: menuItemsKeys.legacyDetail(itemId),
      });
      toast({
        title: "Thành công",
        description: "Đã xóa menu item",
      });
    },
  });

  // Helper functions
  const createMenuItemWithFormData = (data: CreateMenuItemData) => {
    const formData = new FormData();

    // Required fields
    formData.append("name", data.name);
    formData.append("price", data.price.toString());
    formData.append("hasVariant", data.hasVariant.toString());
    formData.append("quantity", data.quantity.toString());

    // Optional fields
    if (data.parentId) {
      formData.append("parentId", data.parentId);
    } else {
      formData.append("parentId", "");
    }

    if (data.image) {
      formData.append("image", data.image);
    }

    return createMutation.mutate(formData);
  };

  const updateMenuItemWithFormData = (data: UpdateMenuItemData) => {
    const formData = new FormData();

    // Append all fields to FormData
    Object.entries(data).forEach(([key, value]) => {
      if (key === "_id") return; // Skip _id field
      if (value !== undefined && value !== null) {
        if (key === "image" && value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return updateMutation.mutate({
      _id: data._id,
      ...Object.fromEntries(formData),
    });
  };

  // Get variants of a specific parent
  const getVariantsByParentId = (parentId: string) => {
    return menuItems.filter((item) => item.parentId === parentId);
  };

  return {
    // Data
    menuItems,
    groupedItems,
    parentItems,

    // Loading states
    isLoading,
    isFetching,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCleaningUp: cleanupMutation.isPending,
    isUpdatingActive: updateActiveMutation.isPending,

    // Error
    error,

    // Actions
    createMenuItem: createMenuItemWithFormData,
    updateMenuItem: updateMenuItemWithFormData,
    updateMenuItemActive: updateActiveMutation.mutate,
    deleteMenuItem: deleteMutation.mutate,
    cleanupMenuItems: cleanupMutation.mutateAsync,
    refetch,

    // Helper functions
    getVariantsByParentId,
  };
};

// Hook mới cho cấu trúc API mới
export const useGetMenuItems = () => {
  return useQuery({
    queryKey: ["menuItems"],
    queryFn: fnbMenuApis.getAllMenuItems,
    select: (data) => data.data.result as unknown as MenuItem[],
  });
};

export const useGetMenuItemsByCategory = (category: string) => {
  return useQuery({
    queryKey: ["menuItems", category],
    queryFn: () => fnbMenuApis.getAllMenuItems(),
    select: (data) => {
      const allItems = data.data.result as unknown as MenuItem[];
      return allItems.filter((item) => item.category === category);
    },
    enabled: !!category,
  });
};

// Hook cho việc complete order với items
export const useCompleteOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: ICompleteOrderRequestBody) => {
      return fnbOrderApis.completeOrder(payload);
    },
    onSuccess: (response) => {
      const responseData = response.data;

      toast({
        title: "Thành công",
        description:
          responseData.message || "Đã thêm items vào order thành công",
      });

      queryClient.invalidateQueries({ queryKey: ["fnbOrders"] });
      queryClient.invalidateQueries({ queryKey: ["roomSchedule"] });

      const result = responseData.result as ICompleteOrderResult;
      if (result?.updatedItems?.length) {
        result.updatedItems.forEach((updatedItem) => {
          if (!updatedItem._id) return;
          const menuItem = updatedItem as unknown as FnBMenuItem;
          patchMenuItemInListCache(queryClient, updatedItem._id, menuItem);
          syncMenuItemDetailCaches(queryClient, menuItem);
        });
      } else {
        queryClient.invalidateQueries({ queryKey: menuItemsKeys.lists() });
      }
    },
    onError: (error: unknown) => {
      console.error("Error completing order:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể thêm items vào order";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};
