import PATHS from "@/constants/paths";
import { Role } from "@/constants/enum";

import useAuth from "@/hooks/useAuth";
import { lazyRouteComponent, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { RouterLoading } from "./routerComponents";

const AdminPage = lazyRouteComponent(() => import("@/pages/AdminPage"));

function ProtectedHomeRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: PATHS.LOGIN, replace: true });
      return;
    }

    if (
      !isLoading &&
      isAuthenticated &&
      user?.role !== Role.Admin &&
      user?.role !== Role.Staff
    ) {
      navigate({ to: PATHS.UNAUTHORIZED, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user?.role]);

  if (isLoading || !isAuthenticated) {
    return <RouterLoading />;
  }

  if (user?.role !== Role.Admin && user?.role !== Role.Staff) {
    return <RouterLoading />;
  }

  return <AdminPage />;
}

const ProtectedHomeRouteWithPreload = Object.assign(ProtectedHomeRoute, {
  preload: AdminPage.preload,
});

export default ProtectedHomeRouteWithPreload;
