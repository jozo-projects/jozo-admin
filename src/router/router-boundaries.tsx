import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { Link, Outlet } from "@tanstack/react-router";

export function RouterLoading() {
  return <div className="p-4">Loading...</div>;
}

export function RouterNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The requested route does not exist.</p>
      <Link className="text-primary underline" to="/">
        Go home
      </Link>
    </main>
  );
}

export function RouterError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Unknown router error";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">{message}</p>
    </main>
  );
}

export function RootRouteComponent() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}
