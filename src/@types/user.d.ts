import { Role } from "@/constants/enum";

export type User = {
  _id: string;
  name?: string; // Có thể là name hoặc full_name
  full_name?: string;
  username?: string;
  email?: string;
  phone_number: string;
  date_of_birth: string;
  role: string; // "admin", "staff", "member" hoặc "user"
  status?: string;
  created_at: string;
  updated_at: string;
  bio?: string;
  location?: string;
  website?: string;
  cover_photo?: string;
  avatar?: string;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationHourlyRate?: number | null;
  probationHolidayMultiplier?: number | null;
};

export type CreateUserRequest = {
  name: string;
  username: string;
  email?: string;
  password: string;
  confirm_password: string;
  date_of_birth: Date;
  role: Role;
  phone_number: string;
};

export type UpdateUserRequest = {
  name?: string;
  username?: string;
  email?: string;
  date_of_birth?: Date;
  role?: Role;
  phone_number?: string;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  probationHourlyRate?: number | null;
  probationHolidayMultiplier?: number | null;
};

export type UsersResponse = {
  message: string;
  result: {
    items: User[];
    users?: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
};

export type UserResponse = {
  message: string;
  result: User;
};

export type UsersQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  enabled?: boolean;
};

export type ChangePasswordRequestBody = {
  old_password: string;
  password: string;
  confirm_password: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type ForgotPasswordRequestBody = {
  email: string;
};

export type ResetPasswordRequestBody = {
  forgot_password_token: string;
  password: string;
  confirm_password: string;
};
