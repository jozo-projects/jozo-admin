import type { AppRouter } from "./app-router";

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
