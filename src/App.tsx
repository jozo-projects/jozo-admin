import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./context/Authorization.context";
import { RoomEventsProvider } from "./context/RoomEventsContext";
import { createAppRouter } from "./router/router";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      }))
    )
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const router = createAppRouter(queryClient);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoomEventsProvider>
          <RouterProvider router={router} />
        </RoomEventsProvider>
      </AuthProvider>
      <Toaster />
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
