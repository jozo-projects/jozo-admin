import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { FnBMenuItem } from "@/hooks/use-menu-items";
import {
  REVENUE_CATEGORY_LABELS,
  resolveMenuItemRevenueCategory,
} from "@/utils/revenueBreakdown";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";

const isItemActive = (item: FnBMenuItem) => item.isActive ?? true;

const getVariantStatusLabel = (
  parent: FnBMenuItem,
  variant: FnBMenuItem,
) => {
  if (!isItemActive(parent)) {
    return { label: "Bị chặn", badgeVariant: "secondary" as const };
  }
  if (!isItemActive(variant)) {
    return { label: "Tạm tắt", badgeVariant: "secondary" as const };
  }
  return { label: "Đang bán", badgeVariant: "outline" as const };
};

interface VariantActiveControlProps {
  parent: FnBMenuItem;
  variant: FnBMenuItem;
  isUpdatingActive: boolean;
  onActiveChange: (item: FnBMenuItem, isActive: boolean) => void;
}

const VariantActiveControl = memo(function VariantActiveControl({
  parent,
  variant,
  isUpdatingActive,
  onActiveChange,
}: VariantActiveControlProps) {
  const status = getVariantStatusLabel(parent, variant);
  const parentInactive = !isItemActive(parent);

  return (
    <div className="ml-4 flex items-center justify-between gap-3 border-l-2 border-gray-200 pl-3 text-sm text-gray-600">
      <span className="min-w-0 flex-1 truncate">• {variant.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={isItemActive(variant)}
          onCheckedChange={(checked) => onActiveChange(variant, checked)}
          disabled={isUpdatingActive || !variant._id || parentInactive}
          aria-label={`${isItemActive(variant) ? "Tắt" : "Bật"} bán ${variant.name}`}
        />
        <Badge
          variant={status.badgeVariant}
          className="whitespace-nowrap text-xs"
        >
          {status.label}
        </Badge>
      </div>
    </div>
  );
});

export interface MenuItemTableRowProps {
  item: FnBMenuItem;
  isExpanded: boolean;
  isUpdatingActive: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  onToggleVariants: (itemId: string) => void;
  onEdit: (item: FnBMenuItem) => void;
  onDelete: (item: FnBMenuItem) => void;
  onActiveChange: (item: FnBMenuItem, isActive: boolean) => void;
}

const MenuItemTableRow = memo(function MenuItemTableRow({
  item,
  isExpanded,
  isUpdatingActive,
  isUpdating,
  isDeleting,
  onToggleVariants,
  onEdit,
  onDelete,
  onActiveChange,
}: MenuItemTableRowProps) {
  const itemActive = isItemActive(item);
  const variantInventoryTotal =
    item.variants?.reduce(
      (total, variant) => total + variant.inventory.quantity,
      0,
    ) ?? 0;

  return (
    <TableRow>
      <TableCell>
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200">
            <span className="text-xs text-gray-400">No img</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{item.name}</div>
          {item.parent && (
            <div className="text-sm text-gray-500">
              Variant của: {item.parent.name}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {
                REVENUE_CATEGORY_LABELS[
                  resolveMenuItemRevenueCategory(item.revenueCategory)
                ]
              }
            </Badge>
            {item.inventoryTracked ? (
              <Badge variant="secondary" className="text-xs">
                Trừ kho
              </Badge>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={item.hasVariant ? "default" : "secondary"}>
          {item.hasVariant ? "Có variants" : "Đơn lẻ"}
        </Badge>
      </TableCell>
      <TableCell>{item.price.toLocaleString()} VND</TableCell>
      <TableCell>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={itemActive}
              onCheckedChange={(checked) => onActiveChange(item, checked)}
              disabled={isUpdatingActive || !item._id}
              aria-label={`${itemActive ? "Tắt" : "Bật"} bán ${item.name}`}
            />
            <Badge
              variant={itemActive ? "default" : "secondary"}
              className="whitespace-nowrap"
            >
              {itemActive ? "Đang bán" : "Tạm tắt"}
            </Badge>
          </div>
          {item.hasVariant && item.variants?.length ? (
            <div className="space-y-1">
              {item.variants.map((variant) => (
                <VariantActiveControl
                  key={variant._id}
                  parent={item}
                  variant={variant}
                  isUpdatingActive={isUpdatingActive}
                  onActiveChange={onActiveChange}
                />
              ))}
            </div>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        {(item.customizationGroups?.length || 0) > 0 ? (
          <Badge variant="outline">
            {item.customizationGroups?.length || 0} nhóm
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">Không có</span>
        )}
      </TableCell>
      <TableCell>
        {item.hasVariant ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">{variantInventoryTotal}</span>
            <Badge variant="outline" className="text-xs">
              Tổng variants
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className={
                item.inventory.quantity > 0 ? "text-green-600" : "text-red-600"
              }
            >
              {item.inventory.quantity}
            </span>
            {item.inventory.quantity === 0 && (
              <Badge variant="destructive" className="text-xs">
                Hết hàng
              </Badge>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        {item.hasVariant && item.variants ? (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => item._id && onToggleVariants(item._id)}
              className="h-auto p-1 text-xs"
            >
              {isExpanded ? (
                <ChevronDown className="mr-1 h-3 w-3" />
              ) : (
                <ChevronRight className="mr-1 h-3 w-3" />
              )}
              {item.variants.length} variants
            </Button>

            {isExpanded && (
              <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-3">
                {item.variants.map((variant) => (
                  <div
                    key={variant._id}
                    className="flex items-center justify-between gap-3 text-sm text-gray-600"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      • {variant.name}
                    </span>
                    <Badge
                      variant={
                        variant.inventory.quantity > 0
                          ? "outline"
                          : "destructive"
                      }
                      className="text-xs"
                    >
                      {variant.inventory.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-400">Không có</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(item)}
            disabled={isUpdating}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(item)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export default MenuItemTableRow;
