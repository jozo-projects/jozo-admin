import type { User } from "@/@types/user";
import authorizationApis from "@/apis/authorization.apis";
import type { QueryClient } from "@tanstack/react-query";

const getAccessToken = () => localStorage.getItem("access_token");

const getUserQueryKey = (accessToken: string) => ["user", accessToken] as const;

export interface RouterAuth {
  getCurrentUser(queryClient: QueryClient): Promise<User | null>;
  hasAnyRole(user: User | null, roles: readonly string[]): boolean;
}

export function createRouterAuth(): RouterAuth {
  return {
    async getCurrentUser(queryClient) {
      const accessToken = getAccessToken();

      if (!accessToken) {
        return null;
      }

      try {
        const response = await queryClient.fetchQuery({
          queryKey: getUserQueryKey(accessToken),
          queryFn: authorizationApis.getMe,
          staleTime: 30_000,
        });

        return response.data.result ?? null;
      } catch {
        return null;
      }
    },

    hasAnyRole(user, roles) {
      return Boolean(user?.role && roles.includes(user.role));
    },
  };
}
