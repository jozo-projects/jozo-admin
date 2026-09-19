import http from "@/utils/http";
import {
  CreateUserRequest,
  UpdateUserRequest,
  UsersResponse,
  UserResponse,
  ChangePasswordRequestBody,
  ChangePasswordResponse,
  UsersQueryParams,
} from "@/@types/user";
import {
  GrantUserPointsPayload,
  UserMembershipDetailResponse,
} from "@/@types/Membership";

export const userApis = {
  // Lấy danh sách tất cả users
  getAllUsers: (params?: UsersQueryParams) => {
    const { page = 1, limit = 1000, search, role } = params || {};

    const isStaffScope = role?.split(",").some((value) => value === "admin" || value === "staff");
    const endpoint = isStaffScope ? "/users" : "/membership/members";

    return http.get<UsersResponse>(endpoint, {
      params: {
        page,
        limit,
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
      },
    });
  },

  // Lấy thông tin user theo ID
  getUserById: (id: string) => {
    return http.get<UserResponse>(`/users/${id}`);
  },

  // Tạo user mới
  createUser: (data: CreateUserRequest) => {
    return http.post<UserResponse>("/users/register", data);
  },

  // Cập nhật user
  updateUser: (id: string, data: UpdateUserRequest) => {
    return http.put<UserResponse>(`/users/${id}`, data);
  },

  // Xóa user
  deleteUser: (id: string) => {
    return http.delete(`/users/${id}`);
  },

  // Đổi mật khẩu
  changePassword: (data: ChangePasswordRequestBody) => {
    return http.post<ChangePasswordResponse>("/users/change-password", data);
  },

  // Cập nhật profile với avatar (FormData)
  updateUserProfile: (id: string, data: FormData) => {
    // Không cần set Content-Type, axios sẽ tự động set với boundary khi data là FormData
    return http.put<UserResponse>(`/users/${id}`, data);
  },

  // Lấy thông tin membership của user (điểm, streak, tier)
  getUserMembership: (id: string) =>
    http.get<UserMembershipDetailResponse>(`/users/${id}/membership`),

  // Cộng điểm cho user (admin)
  grantUserPoints: (id: string, payload: GrantUserPointsPayload) =>
    http.post(`/users/${id}/points`, payload),
};
