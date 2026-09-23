import { useState, ChangeEvent, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { userApis } from "@/apis/user.apis";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, X, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useAuth from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone_number: z.string().min(1, "Số điện thoại không được để trống"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar || null
  );
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [isZoomDialogOpen, setIsZoomDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || user?.full_name || "",
      email: user?.email || "",
      phone_number: user?.phone_number || "",
    },
  });

  // Update form khi user data thay đổi
  useEffect(() => {
    if (user) {
      form.reset({
        name: user?.name || user?.full_name || "",
        email: user?.email || "",
        phone_number: user?.phone_number || "",
      });
      setAvatarPreview(user?.avatar || null);
    }
  }, [user, form]);

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user?._id) throw new Error("User ID không tồn tại");
      return userApis.updateUserProfile(user._id, data);
    },
    onSuccess: (response) => {
      toast({
        title: "Thành công",
        description: "Cập nhật thông tin profile thành công",
      });
      
      // Cập nhật cache trực tiếp với dữ liệu mới từ response
      const accessToken = localStorage.getItem("access_token");
      if (accessToken && response?.data?.result) {
        queryClient.setQueryData(
          ["user", accessToken],
          { data: { result: response.data.result } }
        );
      }
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Có lỗi xảy ra",
        variant: "destructive",
      });
    },
  });

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatarFile(null);
    setAvatarPreview(user?.avatar || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleZoomClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomDialogOpen(true);
  };

  const handleChangeImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const onSubmit = async (data: ProfileFormValues) => {
    const formData = new FormData();

    // Thêm các trường text
    formData.append("name", data.name);
    if (data.email) {
      formData.append("email", data.email);
    }
    formData.append("phone_number", data.phone_number);

    // Xử lý avatar - chỉ gửi file mới nếu có
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    updateProfile(formData);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Thông tin cá nhân"
        description="Xem và cập nhật thông tin profile của bạn"
        icon={User}
      />

      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
            <CardDescription>
              Cập nhật thông tin và hình đại diện của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                  <div
                    className="relative group"
                    onMouseEnter={() => setIsHoveringAvatar(true)}
                    onMouseLeave={() => setIsHoveringAvatar(false)}
                  >
                    <Avatar className="h-32 w-32 rounded-lg transition-opacity">
                      <AvatarImage
                        src={avatarPreview || "https://github.com/shadcn.png"}
                        alt={user?.name || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-lg text-2xl">
                        {user?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Overlay với 2 button khi hover */}
                    <div
                      className={`absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center gap-3 transition-opacity duration-200 ${
                        isHoveringAvatar ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {/* Button phóng to */}
                      <button
                        type="button"
                        onClick={handleZoomClick}
                        className="h-10 w-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                        title="Phóng to ảnh"
                      >
                        <Maximize2 className="h-5 w-5 text-gray-800" />
                      </button>

                      {/* Button thay đổi ảnh */}
                      <button
                        type="button"
                        onClick={handleChangeImageClick}
                        className="h-10 w-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                        title="Thay đổi ảnh"
                      >
                        <Camera className="h-5 w-5 text-gray-800" />
                      </button>
                    </div>

                    {/* Nút xóa ảnh (chỉ hiện khi có ảnh và đang hover) */}
                    {avatarPreview && isHoveringAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-2 -right-2 h-8 w-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                        title="Xóa ảnh đại diện"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      onClick={(e) => ((e.target as HTMLInputElement).value = "")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Di chuột vào ảnh để xem các tùy chọn
                  </p>
                </div>

                {/* Dialog phóng to ảnh */}
                <Dialog open={isZoomDialogOpen} onOpenChange={setIsZoomDialogOpen}>
                  <DialogContent className="max-w-4xl w-full p-0">
                    <DialogHeader className="p-6 pb-0">
                      <DialogTitle>Hình đại diện</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 flex items-center justify-center bg-gray-50">
                      <img
                        src={avatarPreview || "https://github.com/shadcn.png"}
                        alt={user?.name || "User"}
                        className="max-w-full max-h-[70vh] object-contain rounded-lg"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Form Fields */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập họ và tên"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Nhập email"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập số điện thoại"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      form.reset();
                      setAvatarFile(null);
                      setAvatarPreview(user?.avatar || null);
                    }}
                    disabled={isPending}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProfilePage;

