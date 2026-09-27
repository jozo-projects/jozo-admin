import {
  createRouter,
  type Router,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./route-tree";
import type { RouterAuth } from "./router-auth";

export function createAppRouter(queryClient: QueryClient, auth: RouterAuth) {
  return createRouter({
    routeTree,
    context: { queryClient, auth },
    scrollRestoration: true,
  });
}

export type AppRouter = Router<typeof routeTree>;
