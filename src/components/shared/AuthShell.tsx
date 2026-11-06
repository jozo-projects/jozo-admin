import type { ReactNode } from "react";
import { JozoLogo } from "./JozoLogo";

/** Khung dùng chung cho các trang xác thực ngoài layout quản trị. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-sm">
        <JozoLogo className="mb-5" />
        <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
          {children}
        </div>
      </div>
    </main>
  );
}
