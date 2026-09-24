import {
  createRouter,
  type Router,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree";

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    scrollRestoration: true,
  });
}

export type AppRouter = Router<typeof routeTree>;
