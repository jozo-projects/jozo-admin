import { Role } from "@/constants/enum";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { ReactNode, useEffect } from "react";
import { RouterLoading } from "./routerComponents";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRoles = [Role.Admin, Role.Staff],
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const hasAllowedRole = Boolean(
    user?.role && allowedRoles.includes(user.role as Role),
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (!hasAllowedRole) {
      navigate({ to: "/unauthorized", replace: true });
    }
  }, [hasAllowedRole, isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated || !hasAllowedRole) {
    return <RouterLoading />;
  }

  return <>{children}</>;
}
