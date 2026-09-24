import { PageHeader } from "@/components/shared";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Role } from "@/constants/enum";
import { CreateUserRequest } from "@/@types/user";
import { useUsers } from "@/hooks/use-users";
import { useRouter } from "@tanstack/react-router";
import PATHS from "@/constants/paths";

// Schema cho form tạo user mới
const createUserSchema = z
  .object({
    name: z.string().min(1, "Tên là bắt buộc"),
    username: z.string().min(3, "Username phải có ít nhất 3 ký tự"),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirm_password: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
    date_of_birth: z.string().min(1, "Ngày sinh là bắt buộc"),
    role: z.nativeEnum(Role, { required_error: "Vai trò là bắt buộc" }),
    phone_number: z.string().min(10, "Số điện thoại phải có ít nhất 10 số"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu không khớp",
    path: ["confirm_password"],
  });

type CreateUserFormData = z.infer<typeof createUserSchema>;

const CreateUserForm = () => {
  const router = useRouter();
  const { createUser, isCreatingUser } = useUsers();
  const [hidePassword, setHidePassword] = useState<boolean>(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState<boolean>(true);

  const togglePassword = () => setHidePassword(!hidePassword);
  const toggleConfirmPassword = () =>
    setHideConfirmPassword(!hideConfirmPassword);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      date_of_birth: "",
      role: Role.Staff,
      phone_number: "",
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    const createData: CreateUserRequest = {
      name: data.name,
      username: data.username,
      email: data.email || undefined,
      password: data.password,
      confirm_password: data.confirm_password,
      date_of_birth: new Date(data.date_of_birth),
      role: data.role,
      phone_number: data.phone_number,
    };

    createUser(createData, {
      onSuccess: () => {
        router.navigate({ to: PATHS.STAFF_MANAGEMENT });
      },
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Thêm Admin/Staff mới"
        description="Tạo tài khoản quản trị viên hoặc nhân viên mới"
        icon={UserPlus}
        showBackButton
        backUrl={PATHS.STAFF_MANAGEMENT}
      />
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tên */}
            <div className="space-y-2">
              <Label htmlFor="name">Tên *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nhập tên đầy đủ"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="Nhập username (dùng để đăng nhập)"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Nhập email (tùy chọn)"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Mật khẩu */}
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu *</Label>
              <Input
                id="password"
                type={hidePassword ? "password" : "text"}
                {...form.register("password")}
                placeholder="Nhập mật khẩu"
                suffix={
                  <button
                    className="p-1"
                    type="button"
                    onClick={togglePassword}
                  >
                    {hidePassword ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                }
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Xác nhận mật khẩu *</Label>
              <Input
                id="confirm_password"
                type={hideConfirmPassword ? "password" : "text"}
                {...form.register("confirm_password")}
                placeholder="Nhập lại mật khẩu"
                suffix={
                  <button
                    className="p-1"
                    type="button"
                    onClick={toggleConfirmPassword}
                  >
                    {hideConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                }
              />
              {form.formState.errors.confirm_password && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            {/* Số điện thoại */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Số điện thoại *</Label>
              <Input
                id="phone_number"
                {...form.register("phone_number")}
                placeholder="Nhập số điện thoại"
              />
              {form.formState.errors.phone_number && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Ngày sinh */}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh *</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register("date_of_birth")}
              />
              {form.formState.errors.date_of_birth && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.date_of_birth.message}
                </p>
              )}
            </div>

            {/* Vai trò */}
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò *</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) => form.setValue("role", value as Role)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.Staff}>Staff</SelectItem>
                  <SelectItem value={Role.Admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.role && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isCreatingUser}
                className="flex-1"
              >
                {isCreatingUser ? "Đang xử lý..." : "Tạo mới"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.navigate({ to: PATHS.STAFF_MANAGEMENT })}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUserForm;
