import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUsers } from "@/hooks/use-users";
import { User } from "@/@types/user";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useRouter } from "@tanstack/react-router";
import PATHS from "@/constants/paths";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { toast } from "@/hooks/use-toast";
import { Role } from "@/constants/enum";
import PaginationContainer from "@/pages/RecruitmentPage/components/PaginationContainer";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const StaffManagementPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const {
    users,
    isLoadingUsers,
    deleteUser,
    isDeletingUser,
    pagination,
  } =
    useUsers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      role: `${Role.Admin},${Role.Staff}`,
    });

  // Backend đã scope endpoint này chỉ về admin/staff accounts.
  const filteredUsers = users;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalRecords = pagination?.total ?? filteredUsers.length;
  const totalPages =
    pagination?.total_pages ??
    Math.max(1, Math.ceil(totalRecords / (pageSize || 1)));

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId, {
      onSuccess: () => {
        setDeleteUserId(null);
        toast({
          title: "Thành công",
          description: "Xóa admin/staff thành công",
        });
      },
    });
  };

  const getUserName = (user: User) => {
    return user.name || user.full_name || "Không có tên";
  };

  const getRoleBadge = (role: string) => {
    if (role === Role.Admin) return <Badge variant="default">Admin</Badge>;
    if (role === Role.Staff) return <Badge variant="secondary">Staff</Badge>;
    return null;
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Quản lý Admin/Staff"
        description="Quản lý danh sách quản trị viên và nhân viên"
        icon={Users}
        actions={
          <Button onClick={() => router.navigate({ to: PATHS.STAFF_MANAGEMENT_NEW })}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm Admin/Staff
          </Button>
        }
      />

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user: User) => (
          <Card key={user._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {getUserName(user)}
                    </h3>
                    {getRoleBadge(user.role)}
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
                      {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.navigate({ to: "/staff-management/$id/edit", params: { id: user._id } })}
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
              {searchTerm
                ? "Không tìm thấy admin/staff nào phù hợp"
                : "Chưa có admin/staff nào"}
            </p>
          </CardContent>
        </Card>
      )}

      {totalRecords > 0 && (
        <PaginationContainer
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          total={totalRecords}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteUserId}
        onClose={() => setDeleteUserId(null)}
        onConfirm={() => deleteUserId && handleDeleteUser(deleteUserId)}
        title="Xóa Admin/Staff"
        description="Bạn có chắc chắn muốn xóa admin/staff này? Hành động này không thể hoàn tác."
        isLoading={isDeletingUser}
      />
    </div>
  );
};

export default StaffManagementPage;
