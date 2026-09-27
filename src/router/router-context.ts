import type { QueryClient } from "@tanstack/react-query";
import type { RouterAuth } from "./router-auth";

export interface AppRouterContext {
  auth: RouterAuth;
  queryClient: QueryClient;
}
