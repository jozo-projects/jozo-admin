import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Khung trang admin: một cột, khoảng cách dọc 20px trên mobile và 24px từ tablet.
 * Dùng cho mọi page mới thay vì tự đặt space-y / margin từng khối.
 */
export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-5 md:gap-6", className)}
      {...props}
    />
  );
}
