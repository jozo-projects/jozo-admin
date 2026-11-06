import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Package, Coffee, Utensils } from "lucide-react";
import fnbOrderApis from "@/apis/fnbOrder.apis";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OrderDetail, OrderDetailItem } from "@/@types/FnbOrder";
import { IRoom } from "@/@types/Room";
import { AxiosResponse } from "axios";

interface MenuItem {
  _id: string;
  name: string;
  parentId: string | null;
  hasVariant: boolean;
  price: number;
  image: string;
  isActive?: boolean;
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
  variants?: MenuItem[] | string;
  customizationGroups?: {
    groupKey: string;
    label: string;
    minSelect: number;
    maxSelect: number;
    options: {
      optionKey: string;
      label: string;
      priceDelta?: number;
    }[];
  }[];
}

interface MenuItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  roomId?: string; // Thêm prop cho room ID
  scheduleId?: string; // Thêm prop cho schedule ID
  createdBy?: string; // Thêm prop cho user ID
}

const isParentMenuItem = (item: MenuItem) => !item.parentId;

const isItemActive = (item?: MenuItem | null) => item?.isActive !== false;

const parseNestedVariants = (parent: MenuItem): MenuItem[] => {
  if (!parent.variants) return [];

  const rawVariants = Array.isArray(parent.variants)
    ? parent.variants
    : (() => {
        try {
          const parsed = JSON.parse(parent.variants);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  return rawVariants.map((variant) => ({
    ...variant,
    parentId: variant.parentId || parent._id,
    category: variant.category || parent.category,
    hasVariant: false,
    inventory: {
      quantity: variant.inventory?.quantity ?? 0,
      minStock: variant.inventory?.minStock,
      maxStock: variant.inventory?.maxStock,
      lastUpdated: variant.inventory?.lastUpdated,
    },
  }));
};

const MenuItemsModal: React.FC<MenuItemsModalProps> = ({
  isOpen,
  onClose,
  menuItems,
  roomId,
  scheduleId,
  createdBy,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const queryClient = useQueryClient();

  const roomsData = queryClient.getQueryData<
    AxiosResponse<HTTPResponse<IRoom[]>>
  >(["rooms"]);
  const room = roomsData?.data.result?.find((room) => room._id === roomId);

  // Query lấy order detail
  const { data: orderDetailData } = useQuery<OrderDetail | undefined>({
    queryKey: ["fnbOrderDetail", scheduleId],
    queryFn: () =>
      scheduleId
        ? fnbOrderApis
            .getFnbOrderDetail(scheduleId)
            .then((res) => res.data.result as OrderDetail)
        : Promise.resolve(undefined),
    enabled: isOpen && !!scheduleId,
    refetchOnWindowFocus: false,
  });

  // Lấy quantities từ query data (orderDetailData)
  const quantities = useMemo(() => {
    const q: Record<string, number> = {};
    orderDetailData?.items?.drinks?.forEach((item: OrderDetailItem) => {
      q[item.itemId] = item.quantity;
    });
    orderDetailData?.items?.snacks?.forEach((item: OrderDetailItem) => {
      q[item.itemId] = item.quantity;
    });
    return q;
  }, [orderDetailData]);

  // Phân loại menu items theo category
  const categorizedItems = React.useMemo(() => {
    const categories: Record<string, MenuItem[]> = {};

    menuItems.forEach((item) => {
      if (!isItemActive(item)) return;

      const parent = item.parentId
        ? menuItems.find((candidate) => candidate._id === item.parentId)
        : null;
      if (parent && !isItemActive(parent)) return;

      const category = item.category || "other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item);
    });

    return categories;
  }, [menuItems]);

  // Group các item con vào parent (hỗ trợ cả flat parentId và nested variants[])
  const groupedItems = React.useMemo(() => {
    const parents: MenuItem[] = [];
    const childrenMap: Record<string, MenuItem[]> = {};
    const itemById: Record<string, MenuItem> = {};

    menuItems.forEach((item) => {
      itemById[item._id] = item;
    });

    const addChild = (parentId: string, child: MenuItem) => {
      const parent = itemById[parentId];
      if (!parent || !isItemActive(parent) || !isItemActive(child)) return;

      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      if (!childrenMap[parentId].some((existing) => existing._id === child._id)) {
        childrenMap[parentId].push(child);
      }
      if (child._id) {
        itemById[child._id] = child;
      }
    };

    menuItems.forEach((item) => {
      if (isParentMenuItem(item)) {
        if (isItemActive(item)) {
          parents.push(item);
          parseNestedVariants(item).forEach((variant) => addChild(item._id, variant));
        }
        return;
      }

      if (item.parentId) {
        addChild(item.parentId, item);
      }
    });

    return {
      parents: parents.filter((parent) => {
        if (!parent.hasVariant) return true;
        return (childrenMap[parent._id] || []).length > 0;
      }),
      childrenMap,
      itemById,
    };
  }, [menuItems]);

  const findMenuItem = (key: string) => groupedItems.itemById[key];

  // Hàm normalize tiếng Việt không dấu và lower case
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d");

  // Lọc items theo search term và category, chỉ lấy parent
  const filteredParentItems = React.useMemo(() => {
    let parents = groupedItems.parents;
    if (searchTerm.trim()) {
      const searchNorm = normalize(searchTerm);
      parents = parents.filter((parent) => {
        // Kiểm tra tên cha
        if (
          normalize(parent.name).includes(searchNorm) ||
          normalize(parent.category).includes(searchNorm)
        ) {
          return true;
        }
        // Kiểm tra tên các con
        const children = groupedItems.childrenMap[parent._id] || [];
        return children.some((child) =>
          normalize(child.name).includes(searchNorm)
        );
      });
    }
    if (selectedCategory !== "all") {
      parents = parents.filter((item) => item.category === selectedCategory);
    }
    return parents;
  }, [groupedItems, searchTerm, selectedCategory]);

  // Lấy tất cả categories
  const categories = React.useMemo(() => {
    const cats = Object.keys(categorizedItems).filter((cat) => cat !== "other");
    return ["all", ...cats];
  }, [categorizedItems]);

  // Icon cho từng category
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "drink":
      case "drinks":
        return <Coffee className="w-4 h-4" />;
      case "snack":
      case "snacks":
        return <Utensils className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // Label cho category
  const getCategoryLabel = (category: string) => {
    switch (category.toLowerCase()) {
      case "drink":
      case "drinks":
        return "Đồ Uống";
      case "snack":
      case "snacks":
        return "Đồ Ăn";
      case "all":
        return "Tất Cả";
      default:
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
  };

  // Hàm optimistic update cho order detail
  const updateOrderDetailOptimistically = (
    key: string,
    quantityChange: number,
    itemCategory: string
  ) => {
    queryClient.setQueryData(
      ["fnbOrderDetail", scheduleId],
      (old: OrderDetail | undefined) => {
        if (!old) return old;

        const isDrinks =
          itemCategory.toLowerCase() === "drink" ||
          itemCategory.toLowerCase() === "drinks";
        const itemsArray = isDrinks ? old.items.drinks : old.items.snacks;
        const existingItem = itemsArray.find((item) => item.itemId === key);

        let updatedItems;
        if (existingItem) {
          // Item đã tồn tại, cập nhật số lượng
          const newQuantity = Math.max(
            0,
            existingItem.quantity + quantityChange
          );
          if (newQuantity === 0) {
            // Nếu số lượng về 0, xóa item khỏi mảng
            updatedItems = itemsArray.filter((item) => item.itemId !== key);
          } else {
            updatedItems = itemsArray.map((item) =>
              item.itemId === key ? { ...item, quantity: newQuantity } : item
            );
          }
        } else if (quantityChange > 0) {
          // Item chưa tồn tại, thêm mới
          updatedItems = [
            ...itemsArray,
            {
              itemId: key,
              quantity: quantityChange,
              name: "",
              price: 0,
            },
          ];
        } else {
          updatedItems = itemsArray;
        }

        if (isDrinks) {
          return {
            ...old,
            items: {
              ...old.items,
              drinks: updatedItems,
            },
          };
        } else {
          return {
            ...old,
            items: {
              ...old.items,
              snacks: updatedItems,
            },
          };
        }
      }
    );
  };

  // Hàm update inventory trong menuItems
  const updateInventoryOptimistically = (key: string, quantityDiff: number) => {
    queryClient.setQueriesData(
      { queryKey: ["menuItems"] },
      (old: { data?: { result?: MenuItem[] } } | undefined) => {
        if (!old?.data?.result) return old;

        const updateItemInventory = (item: MenuItem): MenuItem => {
          if (item._id === key) {
            return {
              ...item,
              inventory: {
                ...item.inventory,
                quantity: Math.max(
                  0,
                  (item.inventory?.quantity || 0) - quantityDiff
                ),
              },
            };
          }

          if (!item.variants) return item;

          const nestedVariants = parseNestedVariants(item);
          if (nestedVariants.length === 0) return item;

          const updatedVariants = nestedVariants.map((variant) =>
            variant._id === key
              ? {
                  ...variant,
                  inventory: {
                    ...variant.inventory,
                    quantity: Math.max(
                      0,
                      (variant.inventory?.quantity || 0) - quantityDiff
                    ),
                  },
                }
              : variant
          );

          return { ...item, variants: updatedVariants };
        };

        return {
          ...old,
          data: {
            ...old.data,
            result: old.data.result.map(updateItemInventory),
          },
        };
      }
    );
  };

  // Mutation cho add item
  const addMutation = useMutation({
    mutationFn: async ({
      key,
      quantity,
      category,
    }: {
      key: string;
      quantity: number;
      category: string;
    }) => {
      if (!scheduleId || !createdBy) return;
      const isDrinks =
        category.toLowerCase() === "drink" ||
        category.toLowerCase() === "drinks";
      const payload = {
        order: {
          ...(isDrinks
            ? { drinks: { [key]: quantity } }
            : { snacks: { [key]: quantity } }),
        },
        createdBy,
      };
      await fnbOrderApis.addItemToOrder(scheduleId, payload);
    },
    onMutate: async ({ key, quantity, category }) => {
      await queryClient.cancelQueries({
        queryKey: ["fnbOrderDetail", scheduleId],
      });

      const previousOrderData = queryClient.getQueryData([
        "fnbOrderDetail",
        scheduleId,
      ]);

      // Optimistic update order detail
      updateOrderDetailOptimistically(key, quantity, category);

      // Optimistic update inventory
      updateInventoryOptimistically(key, quantity);

      return { previousOrderData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrderData) {
        queryClient.setQueryData(
          ["fnbOrderDetail", scheduleId],
          context.previousOrderData
        );
      }
    },
    onSuccess: () => {
      if (scheduleId) {
        queryClient.invalidateQueries({
          queryKey: ["fnbOrderDetail", scheduleId],
        });
        queryClient.invalidateQueries({ queryKey: ["bill", scheduleId] });
      }
    },
  });

  // Mutation cho remove item
  const removeMutation = useMutation({
    mutationFn: async ({
      key,
      quantity,
      category,
    }: {
      key: string;
      quantity: number;
      category: string;
    }) => {
      if (!scheduleId || !createdBy) return;
      const isDrinks =
        category.toLowerCase() === "drink" ||
        category.toLowerCase() === "drinks";
      const payload = {
        order: {
          ...(isDrinks
            ? { drinks: { [key]: quantity } }
            : { snacks: { [key]: quantity } }),
        },
        createdBy,
      };
      await fnbOrderApis.removeItemFromOrder(scheduleId, payload);
    },
    onMutate: async ({ key, quantity, category }) => {
      await queryClient.cancelQueries({
        queryKey: ["fnbOrderDetail", scheduleId],
      });

      const previousOrderData = queryClient.getQueryData([
        "fnbOrderDetail",
        scheduleId,
      ]);

      // Optimistic update order detail
      updateOrderDetailOptimistically(key, -quantity, category);

      // Optimistic update inventory
      updateInventoryOptimistically(key, -quantity);

      return { previousOrderData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousOrderData) {
        queryClient.setQueryData(
          ["fnbOrderDetail", scheduleId],
          context.previousOrderData
        );
      }
    },
    onSuccess: () => {
      if (scheduleId) {
        queryClient.invalidateQueries({
          queryKey: ["fnbOrderDetail", scheduleId],
        });
        queryClient.invalidateQueries({ queryKey: ["bill", scheduleId] });
      }
    },
  });

  // Xử lý khi thay đổi số lượng qua input
  const handleQuantityChange = (key: string, newValue: number) => {
    const item = findMenuItem(key);
    if (!item) return;

    const currentValue = quantities[key] || 0;
    const diff = newValue - currentValue;

    if (diff > 0) {
      // Tăng số lượng
      addMutation.mutate({ key, quantity: diff, category: item.category });
    } else if (diff < 0) {
      // Giảm số lượng
      removeMutation.mutate({
        key,
        quantity: Math.abs(diff),
        category: item.category,
      });
    }
  };

  // Hàm handle cho nút + (thêm 1)
  const handleAddOne = (key: string) => {
    const item = findMenuItem(key);
    if (!item) return;
    addMutation.mutate({ key, quantity: 1, category: item.category });
  };

  // Hàm handle cho nút - (giảm 1)
  const handleRemoveOne = (key: string) => {
    const item = findMenuItem(key);
    if (!item) return;
    removeMutation.mutate({ key, quantity: 1, category: item.category });
  };

  // Render lại card: nếu có con thì hiển thị các con, không thì hiển thị như món đơn giản
  const renderMenuItem = (item: MenuItem) => {
    const hasRequiredCustomization = (item.customizationGroups || []).some(
      (group) => group.minSelect > 0
    );
    const children = groupedItems.childrenMap[item._id] || [];
    if (children.length > 0) {
      // Card group cho parent có children
      return (
        <Card key={item._id} className="mb-4 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Có lựa chọn
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600">
                  {item.price.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-500">
                  Tổng tồn kho: {item.inventory.quantity || 0}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 mb-2">Các lựa chọn:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {children.map((child) => {
                  const key = child._id;
                  return (
                    <div
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={child.image}
                          alt={child.name}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{child.name}</p>
                          <p className="text-xs text-gray-500">
                            Tồn kho: {child.inventory.quantity || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveOne(key)}
                          disabled={
                            hasRequiredCustomization ||
                            Number(quantities[key] || 0) === 0
                          }
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <input
                          type="number"
                          min={0}
                          max={child.inventory.quantity}
                          value={quantities[key] || 0}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            const maxAllowed = child.inventory.quantity || 0;
                            if (newValue <= maxAllowed) {
                              handleQuantityChange(key, newValue);
                            }
                          }}
                          disabled={
                            hasRequiredCustomization ||
                            (child.inventory.quantity || 0) === 0 &&
                            (quantities[key] || 0) === 0
                          }
                          className={`w-16 border rounded px-2 py-1 text-sm text-center ${
                            (child.inventory.quantity || 0) === 0 &&
                            (quantities[key] || 0) === 0
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentValue = quantities[key] || 0;
                            const maxAllowed = child.inventory.quantity || 0;
                            if (currentValue < maxAllowed) {
                              handleAddOne(key);
                            }
                          }}
                          disabled={
                            hasRequiredCustomization ||
                            (child.inventory.quantity || 0) === 0 ||
                            Number(quantities[key] || 0) >=
                              Number(child.inventory.quantity || 0)
                          }
                          className="w-8 h-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    // Nếu không có con, hiển thị như món đơn giản
    const key = item._id;
    return (
      <Card key={item._id} className="mb-4 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {item.price.toLocaleString("vi-VN")} VND
              </p>
              {hasRequiredCustomization && (
                <p className="text-xs text-amber-600 mt-1">
                  Cần chọn tuỳ chọn trước khi thêm món
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="text-sm text-gray-600">
              <p>Tồn kho: {item.inventory?.quantity || 0}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveOne(key)}
                disabled={
                  hasRequiredCustomization || Number(quantities[key] || 0) === 0
                }
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              <input
                type="number"
                min={0}
                max={item.inventory?.quantity || 0}
                value={quantities[key] || 0}
                onChange={(e) => {
                  const newValue = Number(e.target.value);
                  const maxAllowed = item.inventory?.quantity || 0;
                  if (newValue <= maxAllowed) {
                    handleQuantityChange(key, newValue);
                  }
                }}
                disabled={
                  hasRequiredCustomization ||
                  (item.inventory?.quantity || 0) === 0 &&
                  (quantities[key] || 0) === 0
                }
                className={`w-16 border rounded px-2 py-1 text-sm text-center ${
                  (item.inventory?.quantity || 0) === 0 &&
                  (quantities[key] || 0) === 0
                    ? "bg-gray-100 cursor-not-allowed"
                    : ""
                }`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentValue = quantities[key] || 0;
                  const maxAllowed = item.inventory?.quantity || 0;
                  if (currentValue < maxAllowed) {
                    handleAddOne(key);
                  }
                }}
                disabled={
                  hasRequiredCustomization ||
                  (item.inventory?.quantity || 0) === 0 ||
                  Number(quantities[key] || 0) >=
                    Number(item.inventory?.quantity || 0)
                }
                className="w-8 h-8 p-0"
              >
                +
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col gap-4 overflow-hidden p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:w-[95vw] sm:max-w-7xl sm:max-h-[92vh] sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl sm:text-2xl">
            Danh Sách Đồ Ăn & Đồ Uống
          </DialogTitle>
          <DialogDescription>
            Chọn món ăn hoặc đồ uống để thêm vào phòng
            {roomId && scheduleId && (
              <span className="mt-2 block break-all text-sm text-gray-600">
                <span className="block">Room ID: {room?.roomName || "Không có phòng"}</span>
                <span className="block">Schedule ID: {scheduleId}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-row gap-4 flex-1 min-h-0">
            {/* Bên trái: menu */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search và Filter */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm món ăn, đồ uống..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* Category Tabs */}
                <Tabs
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                    {categories.slice(0, 4).map((category) => (
                      <TabsTrigger
                        key={category}
                        value={category}
                        className="flex items-center gap-2"
                      >
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="space-y-4">
                  {filteredParentItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm
                          ? "Không tìm thấy món nào phù hợp"
                          : "Không có món nào trong danh mục này"}
                      </p>
                    </div>
                  ) : (
                    filteredParentItems.map(renderMenuItem)
                  )}
                </div>
              </div>
            </div>
            {/* Bên phải: preview nhỏ gọn */}
            {/* Xoá các đoạn code liên quan đến selectedItems, handleConfirm, completeOrderMutation, và nút xác nhận trong preview */}
          </div>
        </div>

        <DialogFooter className="border-t bg-background pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:pb-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemsModal;
