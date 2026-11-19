import { reconcilePush, suppressPush } from "@/services/shift-push";
// AuthContext.js
import { User } from "@/@types/user";
import authorizationApis from "@/apis/authorization.apis";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useEffect, useState } from "react";
import { AUTH_EVENTS } from "@/constants/events";

type AuthContextValues = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

const initialAuthContextValues: AuthContextValues = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
};

// Tạo AuthContext
export const AuthContext = createContext<AuthContextValues>(
  initialAuthContextValues
);

// Provider component để bọc toàn bộ app
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));

  const {
    data: userData,
    isLoading,
  } = useQuery({
    queryKey: ["user", accessToken],
    queryFn: authorizationApis.getMe,
    enabled: !!accessToken,
  });

  // Thêm effect để lắng nghe sự kiện đăng nhập và đăng xuất
  useEffect(() => {
    const handleLoginSuccess = () => {
      console.log("Login success event received");
      const token = localStorage.getItem("access_token");
      setAccessToken(token);
      // useQuery sẽ tự động refetch khi queryKey thay đổi (accessToken thay đổi)
    };

    const handleLogoutSuccess = () => {
      console.log("Logout success event received");
      // Cập nhật state ngay lập tức
      setAccessToken(null);
      // Invalidate và remove query user cụ thể
      queryClient.removeQueries({ queryKey: ["user"] });
      // Reset query cache khi logout
      queryClient.clear();
    };

    window.addEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
    window.addEventListener(AUTH_EVENTS.LOGOUT_SUCCESS, handleLogoutSuccess);

    return () => {
      window.removeEventListener(AUTH_EVENTS.LOGIN_SUCCESS, handleLoginSuccess);
      window.removeEventListener(
        AUTH_EVENTS.LOGOUT_SUCCESS,
        handleLogoutSuccess
      );
    };
  }, [queryClient]);
  
  useEffect(() => {
    if (!accessToken || userData) void reconcilePush(userData?.data.result?._id || null).catch(() => suppressPush(true).catch(() => undefined));
  }, [accessToken, userData]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== "access_token" && event.key !== null) return;
      void suppressPush(!localStorage.getItem("access_token")).catch(() => undefined);
      setAccessToken(localStorage.getItem("access_token"));
      queryClient.clear();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [queryClient]);

  const value = {
    user: userData?.data.result || null,
    isAuthenticated: !!accessToken && !!userData?.data.result,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
