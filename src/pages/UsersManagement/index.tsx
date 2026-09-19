import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/use-users";
import { useDebounce } from "@/hooks/use-debounce";
import { User } from "@/@types/user";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import PATHS from "@/constants/paths";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/constants/enum";
import { useUsersManagementQueryConfig } from "./hooks/useUsersManagementQueryConfig";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

const PaginationControls = ({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) => {
  const displayStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, total);

  const renderPageButtons = () => {
    const visiblePages = Math.min(5, totalPages);
    const buttons = [];

    for (let i = 0; i < visiblePages; i++) {
      let pageNumber: number;

      if (totalPages <= 5) {
        pageNumber = i + 1;
      } else if (currentPage <= 3) {
        pageNumber = i + 1;
      } else if (currentPage >= totalPages - 2) {
        pageNumber = totalPages - 4 + i;
      } else {
        pageNumber = currentPage - 2 + i;
      }

      buttons.push(
        <Button
          key={pageNumber}
          variant={currentPage === pageNumber ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(pageNumber)}
          className="w-8 h-8"
        >
          {pageNumber}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        Hiển thị {displayStart} - {displayEnd} trong tổng số {total} người dùng
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hiển thị:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">bản ghi</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">{renderPageButtons()}</div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const UsersManagementPage = () => {
  const navigate = useNavigate();
  const { queryConfig, setQueryConfig } = useUsersManagementQueryConfig();
  const pageSize = PAGE_SIZE_OPTIONS.includes(queryConfig.limit)
    ? queryConfig.limit
    : 10;
  const currentPage = queryConfig.page > 0 ? queryConfig.page : 1;
  const [searchTerm, setSearchTerm] = useState(queryConfig.search);
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const {
    users,
    isLoadingUsers,
    isFetchingUsers,
    deleteUser,
    isDeletingUser,
    pagination,
  } = useUsers({
    page: currentPage,
    limit: pageSize,
    search: queryConfig.search.trim() || undefined,
    role: `${Role.Member},${Role.User}`,
  });

  // Backend đã scope endpoint này chỉ về member/user accounts.
  const filteredUsers = users;

  // Đồng bộ input khi URL thay đổi (back/forward)
  useEffect(() => {
    setSearchTerm(queryConfig.search);
  }, [queryConfig.search]);

  // Ghi search đã debounce vào URL và reset về trang 1
  useEffect(() => {
    if (debouncedSearchTerm === queryConfig.search) return;
    void setQueryConfig(
      { search: debouncedSearchTerm, page: 1 },
      { history: "replace" }
    );
  }, [debouncedSearchTerm, queryConfig.search, setQueryConfig]);

  const totalRecords = pagination?.total ?? filteredUsers.length ?? 0;
  const effectivePage = pagination?.page ?? currentPage;
  const effectivePageSize = pagination?.limit ?? pageSize;
  const totalPages =
    pagination?.total_pages ??
    Math.max(1, Math.ceil(totalRecords / (effectivePageSize || 1)));
  const isInitialLoading = isLoadingUsers && filteredUsers.length === 0;

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId, {
      onSuccess: () => {
        setDeleteUserId(null);
        toast({
          title: "Thành công",
          description: "Xóa user thành công",
        });
      },
    });
  };

  const getUserName = (user: User) => {
    return user.name || user.full_name || "Không có tên";
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    void setQueryConfig({ page });
  };

  const handlePageSizeChange = (size: number) => {
    void setQueryConfig({ limit: size, page: 1 });
  };

  return (
    <div>
      <PageHeader
        title="Quản lý Thành viên"
        description="Quản lý danh sách người dùng"
        icon={UserCircle}
        actions={
          <Button onClick={() => navigate(PATHS.USERS_MANAGEMENT_NEW)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Thành viên
          </Button>
        }
        className="mb-6"
      />

      {/* Search Bar — luôn mount để không mất focus khi refetch */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isInitialLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Đang tải...</div>
        </div>
      ) : (
        <>
          {/* Users List */}
          <div className={`grid gap-4 ${isFetchingUsers ? "opacity-60" : ""}`}>
            {filteredUsers.map((user: User) => (
              <Card
                key={user._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {getUserName(user)}
                        </h3>
                        <Badge variant="secondary">User</Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        {user.username && <p>Username: {user.username}</p>}
                        {user.email && <p>Email: {user.email}</p>}
                        <p>Số điện thoại: {user.phone_number}</p>
                        <p>
                          Ngày sinh:{" "}
                          {format(new Date(user.date_of_birth), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </p>
                        <p>
                          Ngày tạo:{" "}
                          {format(
                            new Date(user.created_at),
                            "dd/MM/yyyy HH:mm",
                            {
                              locale: vi,
                            }
                          )}
                        </p>
                        {user.status && <p>Trạng thái: {user.status}</p>}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            PATHS.USERS_MANAGEMENT_EDIT.replace(":id", user._id)
                          )
                        }
                      >
                        Chỉnh sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteUserId(user._id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">
                  {queryConfig.search.trim()
                    ? "Không tìm thấy user nào phù hợp"
                    : "Chưa có user nào"}
                </p>
              </CardContent>
            </Card>
          )}

          {totalRecords > 0 && (
            <PaginationControls
              currentPage={effectivePage}
              totalPages={totalPages}
              pageSize={effectivePageSize}
              total={totalRecords}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={() => deleteUserId && handleDeleteUser(deleteUserId)}
        title="Xóa User"
        description="Bạn có chắc chắn muốn xóa user này? Hành động này không thể hoàn tác."
        isLoading={isDeletingUser}
      />
    </div>
  );
};

export default UsersManagementPage;
