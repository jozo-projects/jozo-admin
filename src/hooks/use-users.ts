import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { userApis } from "@/apis/user.apis";
import { UpdateUserRequest, UsersQueryParams } from "@/@types/user";
import { toast } from "@/hooks/use-toast";
import type { AxiosError } from "axios";

export const useUsers = (params: UsersQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { page = 1, limit = 10000, search, role, enabled = true } = params;

  const extractErrorMessage = (error: unknown) => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return (
      axiosError?.response?.data?.message ||
      (error instanceof Error ? error.message : "Có lỗi xảy ra")
    );
  };

  // Query để lấy danh sách tất cả users
  const {
    data: usersResponse,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: ["users", page, limit, search, role],
    queryFn: () =>
      userApis.getAllUsers({
        page,
        limit,
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  // Lấy users từ response
  const users =
    usersResponse?.data?.result?.items ||
    usersResponse?.data?.result?.users ||
    [];
  const pagination = usersResponse?.data?.result?.pagination;

  // Hook để lấy thông tin user theo ID
  const useUserById = (id: string) => {
    return useQuery({
      queryKey: ["user", id],
      queryFn: () => userApis.getUserById(id),
      enabled: !!id,
    });
  };

  // Hook để lấy membership detail của user
  const useUserMembership = (id: string) => {
    return useQuery({
      queryKey: ["user-membership", id],
      queryFn: () => userApis.getUserMembership(id),
      enabled: !!id,
    });
  };

  // Mutation để tạo user mới
  const createUserMutation = useMutation({
    mutationFn: userApis.createUser,
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Tạo user mới thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        extractErrorMessage(error) || "Có lỗi xảy ra khi tạo user";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation để cập nhật user
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      userApis.updateUser(id, data),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Cập nhật user thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        extractErrorMessage(error) || "Có lỗi xảy ra khi cập nhật user";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation để xóa user
  const deleteUserMutation = useMutation({
    mutationFn: userApis.deleteUser,
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Xóa user thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa user";
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoadingUsers,
    isFetchingUsers,
    usersError,
    refetchUsers,
    pagination,
    useUserById,
    useUserMembership,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    isCreatingUser: createUserMutation.isPending,
    isUpdatingUser: updateUserMutation.isPending,
    isDeletingUser: deleteUserMutation.isPending,
  };
};
