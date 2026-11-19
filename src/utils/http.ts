import { suppressPush } from "@/services/shift-push";
import { AUTH_EVENTS } from "@/constants/events";
import PATHS from "@/constants/paths";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_BASE_URL;

const PUBLIC_AUTH_PATHS = [
  "/users/login",
  "/users/forgot-password",
  "/users/reset-password",
  "/users/logout",
];

let isHandlingUnauthorized = false;

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

async function handleUnauthorized() {
  const initialToken = localStorage.getItem("access_token");
  if (isHandlingUnauthorized || window.location.pathname === PATHS.LOGIN) {
    return;
  }

  isHandlingUnauthorized = true;

  try { await suppressPush(true); } catch {
    isHandlingUnauthorized = false;
    toast({ title: "Không thể tắt thông báo an toàn. Hãy xóa dữ liệu trang trong trình duyệt.", variant: "destructive" });
    return;
  }

  if (localStorage.getItem("access_token") !== initialToken) { isHandlingUnauthorized = false; return; }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT_SUCCESS));

  window.location.replace(PATHS.LOGIN);
}

const http = axios.create({
  baseURL: apiUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
http.interceptors.request.use(
  function (config) {
    // Read latest token from localStorage on each request
    const token = localStorage.getItem("access_token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // FormData: let axios set Content-Type with boundary
    // Otherwise default to application/json if missing
    if (config.data instanceof FormData) {
      // Drop Content-Type so axios sets multipart boundary
      delete config.headers["Content-Type"];
    } else if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }
    
    return config;
  },
  function (error) {
    // Handle request error
    return Promise.reject(error);
  },
);

// Response interceptor
http.interceptors.response.use(
  function (response) {
    // Any 2xx status runs this handler
    return response;
  },
  function (error) {
    const status = error.response?.status;

    if (status === 401 && !isPublicAuthRequest(error.config?.url)) {
      if (error.config?.headers?.Authorization === `Bearer ${localStorage.getItem("access_token")}`) void handleUnauthorized();
      return Promise.reject(error);
    }

    if (!error.config?.skipErrorToast) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
    return Promise.reject(error);
  },
);

export default http;
