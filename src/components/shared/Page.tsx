import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Khung trang admin: một cột, khoảng cách dọc cố định 24px.
 * Dùng cho mọi page mới thay vì tự đặt space-y / margin từng khối.
 */
export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    />
  );
}
