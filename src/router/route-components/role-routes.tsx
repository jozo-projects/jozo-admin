import type { ReactNode } from "react";
import { Role } from "@/constants/enum";
import ProtectedRoute from "../guards/protected-route";

type RoleRouteProps = {
  children: ReactNode;
};

export function AdminStaffRoute({ children }: RoleRouteProps) {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin, Role.Staff]}>
      {children}
    </ProtectedRoute>
  );
}

export function AdminRoute({ children }: RoleRouteProps) {
  return <ProtectedRoute allowedRoles={[Role.Admin]}>{children}</ProtectedRoute>;
}

export function StaffRouteGuard({ children }: RoleRouteProps) {
  return <ProtectedRoute allowedRoles={[Role.Staff]}>{children}</ProtectedRoute>;
}
