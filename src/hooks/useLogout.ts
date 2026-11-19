import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import authorizationApis from "@/apis/authorization.apis";
import { AUTH_EVENTS } from "@/constants/events";
import PATHS from "@/constants/paths";
import { disablePush, suppressPush } from "@/services/shift-push";
import { useToast } from "./use-toast";

export const useLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const initialToken = localStorage.getItem("access_token");
      await suppressPush(true);
      const pushRevoked = await disablePush(); // DELETE while credentials still exist; local gate already closed.
      if (localStorage.getItem("access_token") !== initialToken) return { switched: true, uncertain: true };
      const refreshToken = localStorage.getItem("refresh_token");
      let uncertain = !pushRevoked;
      if (refreshToken) {
        try { await authorizationApis.logout({ refresh_token: refreshToken }); } catch { uncertain = true; }
      }
      if (localStorage.getItem("access_token") !== initialToken) return { switched: true, uncertain: true };
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT_SUCCESS));
      return { switched: false, uncertain };
    },
    onSuccess: ({ switched, uncertain }) => {
      if (switched) return;
      if (uncertain) toast({ title: "Đã đăng xuất trên thiết bị", description: "Không xác nhận được việc thu hồi trên máy chủ. Thông báo đã gửi trước đó vẫn có thể xuất hiện.", variant: "destructive" });
      else toast({ title: "Đăng xuất thành công" });
      void navigate({ to: PATHS.LOGIN, replace: true });
    },
    onError: () => {
      toast({ title: "Chưa thể đăng xuất an toàn", description: "Không thể tắt thông báo trên thiết bị. Hãy thử lại hoặc xóa dữ liệu trang trong trình duyệt.", variant: "destructive" });
    },
  });
  return { logout: () => mutation.mutate(), isLoading: mutation.isPending };
};
