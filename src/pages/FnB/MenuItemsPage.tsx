import { PageHeader } from "@/components/shared";
import UpsertMenuItemModal from "@/components/modules/FnB/UpsertMenuItemModal";
import CleanupMenuItemsModal from "@/components/modules/FnB/CleanupMenuItemsModal";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Button } from "@/components/ui/button";
import { Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useMenuItems,
  FnBMenuItem,
  groupMenuItemsByParent,
} from "@/hooks/use-menu-items";
import { useDebounce } from "@/hooks/use-debounce";
import { Plus, Search, Wand2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import MenuItemTableRow from "./components/MenuItemTableRow";

const SEARCH_DEBOUNCE_MS = 300;

const MenuItemsPage = () => {
  const {
    menuItems,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isCleaningUp,
    isUpdatingActive,
    deleteMenuItem,
    updateMenuItemActive,
    cleanupMenuItems,
  } = useMenuItems();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FnBMenuItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FnBMenuItem | null>(null);
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(
    () => new Set(),
  );

  const filteredItems = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) return menuItems;

    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.parent?.name?.toLowerCase().includes(term),
    );
  }, [menuItems, debouncedSearchTerm]);

  const displayItems = useMemo(
    () => groupMenuItemsByParent(filteredItems),
    [filteredItems],
  );

  const handleEdit = useCallback((item: FnBMenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((item: FnBMenuItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedItem(null);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (itemToDelete?._id) {
      deleteMenuItem(itemToDelete._id);
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  }, [deleteMenuItem, itemToDelete]);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleCleanupModalOpen = useCallback(() => {
    setIsCleanupModalOpen(true);
  }, []);

  const handleCleanupModalClose = useCallback(() => {
    setIsCleanupModalOpen(false);
  }, []);

  const toggleVariants = useCallback((itemId: string) => {
    setExpandedVariants((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleActiveChange = useCallback(
    (item: FnBMenuItem, isActive: boolean) => {
      if (!item._id) return;
      updateMenuItemActive({ _id: item._id, isActive });
    },
    [updateMenuItemActive],
  );

  const headerActions = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleCleanupModalOpen}
          disabled={isCleaningUp}
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Dọn dữ liệu
        </Button>
        <Button onClick={handleCreate} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm Menu Item
        </Button>
      </div>
    ),
    [handleCleanupModalOpen, handleCreate, isCleaningUp, isCreating],
  );

  const emptyStateMessage = useMemo(() => {
    if (debouncedSearchTerm.trim()) {
      return "Không tìm thấy menu items nào";
    }
    return "Chưa có menu items nào";
  }, [debouncedSearchTerm]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Quản lý số tồn kho FNB"
        description="Quản lý các món ăn, đồ uống và variants"
        icon={Utensils}
        actions={headerActions}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Tìm kiếm menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hình ảnh</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tuỳ chọn</TableHead>
                <TableHead>Tồn kho</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item) => (
                <MenuItemTableRow
                  key={item._id}
                  item={item}
                  isExpanded={item._id ? expandedVariants.has(item._id) : false}
                  isUpdatingActive={isUpdatingActive}
                  isUpdating={isUpdating}
                  isDeleting={isDeleting}
                  onToggleVariants={toggleVariants}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onActiveChange={handleActiveChange}
                />
              ))}
            </TableBody>
          </Table>

          {displayItems.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              {emptyStateMessage}
            </div>
          )}
        </CardContent>
      </Card>

      <UpsertMenuItemModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={selectedItem}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        title="Xóa Menu Item"
        description={`Bạn có chắc chắn muốn xóa "${itemToDelete?.name}"? Hành động này không thể hoàn tác.`}
      />

      <CleanupMenuItemsModal
        isOpen={isCleanupModalOpen}
        onClose={handleCleanupModalClose}
        onCleanup={cleanupMenuItems}
        isLoading={isCleaningUp}
      />
    </div>
  );
};

export default MenuItemsPage;
