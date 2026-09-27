import { Role } from "@/constants/enum";
import { redirect } from "@tanstack/react-router";
import type { AppRouterContext } from "../router-context";

export async function requireStaffAccess({
  context,
}: {
  context: AppRouterContext;
}) {
  const user = await context.auth.getCurrentUser(context.queryClient);

  if (!user) {
    throw redirect({ to: "/login" });
  }

  if (!context.auth.hasAnyRole(user, [Role.Admin, Role.Staff])) {
    throw redirect({ to: "/unauthorized" });
  }

  return { user };
}
