import { PageHeader } from "@/components/shared";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetAllGifts, useDeleteGift } from "@/hooks/use-gifts";
import { Gift as GiftType } from "@/@types/Gift";
import { GIFT_TYPE_LABELS } from "./constants";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import UpsertGiftModal from "./components/UpsertGiftModal";
import { formatCurrency } from "@/utils/formatters";

const GiftsPage = () => {
  const { data: gifts = [], isLoading, refetch } = useGetAllGifts();
  const { mutate: deleteGift, isPending: isDeleting } = useDeleteGift();

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GiftType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GiftType | null>(null);

  // Derive filtered items from gifts and search term to avoid extra renders
  const filteredItems = useMemo(
    () =>
      gifts.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [gifts, searchTerm]
  );

  const handleEdit = (item: GiftType) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (item: GiftType) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete?._id) {
      deleteGift(itemToDelete._id);
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Quản lý Quà Tặng"
        description="Quản lý các quà tặng và khuyến mãi"
        icon={Gift}
        actions={
          <Button onClick={handleCreate} disabled={isDeleting}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm Quà Tặng
          </Button>
        }
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Tìm kiếm quà tặng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách Quà Tặng</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hình ảnh</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Giá/Giảm giá</TableHead>
                <TableHead>Tổng số lượng</TableHead>
                <TableHead>Số lượng còn lại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No img</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {GIFT_TYPE_LABELS[item.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.type === "snacks_drinks" && item.price
                      ? `${formatCurrency(item.price)} VND`
                      : (item.type === "discount_percentage" ||
                          item.type === "discount") &&
                        item.discountPercentage
                      ? `${item.discountPercentage}%`
                      : (item.type === "discount_amount" ||
                          item.type === "fnb_discount_amount") &&
                        item.discountAmount
                      ? `${formatCurrency(item.discountAmount)} VND`
                      : "-"}
                  </TableCell>
                  <TableCell>{item.totalQuantity}</TableCell>
                  <TableCell>
                    <span
                      className={
                        item.remainingQuantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {item.remainingQuantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Kích hoạt" : "Tắt"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        disabled={isDeleting}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? "Không tìm thấy quà tặng nào"
                : "Chưa có quà tặng nào"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UpsertGiftModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        gift={selectedItem}
        onSuccess={refetch}
      />

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Xóa Quà Tặng"
        description={`Bạn có chắc chắn muốn xóa "${itemToDelete?.name}"? Hành động này không thể hoàn tác.`}
      />
    </div>
  );
};

export default GiftsPage;
