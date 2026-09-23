import { PageHeader } from "@/components/shared";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Role } from "@/constants/enum";
import { CreateUserRequest } from "@/@types/user";
import { useUsers } from "@/hooks/use-users";
import { useNavigate } from "react-router-dom";
import PATHS from "@/constants/paths";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils";
import { format } from "date-fns";

// Schema cho form tạo user mới
const createUserSchema = z
  .object({
    name: z.string().min(1, "Tên là bắt buộc"),
    username: z.string().min(3, "Username phải có ít nhất 3 ký tự"),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirm_password: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
    date_of_birth: z.coerce.date({
      required_error: "Ngày sinh là bắt buộc",
      invalid_type_error: "Ngày sinh không hợp lệ",
    }),
    role: z.nativeEnum(Role, { required_error: "Vai trò là bắt buộc" }),
    phone_number: z
      .string()
      .regex(/^\d{10,11}$/, "Số điện thoại phải gồm 10-11 chữ số"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Mật khẩu không khớp",
    path: ["confirm_password"],
  });

type CreateUserFormData = z.infer<typeof createUserSchema>;

const CreateUserForm = () => {
  const navigate = useNavigate();
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
      date_of_birth: undefined,
      role: Role.Member, // Mặc định member
      phone_number: "",
    },
  });

  const normalizePhone = (value: string) =>
    value.replace(/\D/g, "").slice(0, 11);

  const onSubmit = (data: CreateUserFormData) => {
    const createData: CreateUserRequest = {
      name: data.name,
      username: data.username,
      email: data.email || undefined,
      password: data.password,
      confirm_password: data.confirm_password,
      date_of_birth: data.date_of_birth,
      role: Role.Member, // Luôn tạo user với role member
      phone_number: data.phone_number,
    };

    createUser(createData, {
      onSuccess: () => {
        navigate(PATHS.USERS_MANAGEMENT);
      },
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Thêm User mới"
        description="Tạo tài khoản người dùng mới"
        icon={UserPlus}
        showBackButton
        backUrl={PATHS.USERS_MANAGEMENT}
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
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={11}
                onChange={(e) => {
                  const normalized = normalizePhone(e.target.value);
                  form.setValue("phone_number", normalized, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                placeholder="Nhập số điện thoại"
              />
              {form.formState.errors.phone_number && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Ngày sinh */}
            <Controller
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Ngày sinh *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, "dd/MM/yyyy")
                          : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        captionLayout="dropdown-buttons"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                        disabled={{ after: new Date() }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {form.formState.errors.date_of_birth && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.date_of_birth.message}
                    </p>
                  )}
                </div>
              )}
            />

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
                onClick={() => navigate(PATHS.USERS_MANAGEMENT)}
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
