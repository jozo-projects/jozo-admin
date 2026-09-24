import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import authorizationApis from "@/apis/authorization.apis";
import { AUTH_EVENTS } from "@/constants/events";
import PATHS from "@/constants/paths";
import { useToast } from "./use-toast";

export const useLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: authorizationApis.logout,
    onSuccess: () => {
      // Xóa token khỏi localStorage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // Dispatch event logout success
      window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT_SUCCESS));

      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã được đăng xuất khỏi hệ thống",
      });

      // Chuyển hướng về trang login
      navigate({ to: PATHS.LOGIN, replace: true });
    },
    onError: () => {
      // Ngay cả khi API logout thất bại, vẫn xóa token và chuyển hướng
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      // Dispatch event logout success
      window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT_SUCCESS));

      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã được đăng xuất khỏi hệ thống",
      });

      // Chuyển hướng về trang login
      navigate({ to: PATHS.LOGIN, replace: true });
    },
  });

  const logout = () => {
    const refreshToken = localStorage.getItem("refresh_token");

    if (refreshToken) {
      // Gọi API logout với refresh token
      logoutMutation.mutate({ refresh_token: refreshToken });
    } else {
      // Nếu không có refresh token, chỉ xóa token và chuyển hướng
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT_SUCCESS));

      toast({
        title: "Đăng xuất thành công",
        description: "Bạn đã được đăng xuất khỏi hệ thống",
      });

      navigate({ to: PATHS.LOGIN, replace: true });
    }
  };

  return {
    logout,
    isLoading: logoutMutation.isPending,
  };
};
