import { Role } from "@/constants/enum";
import { lazyRouteComponent } from "@tanstack/react-router";
import ProtectedRoute from "./ProtectedRoute";

const CoffeePricingPage = lazyRouteComponent(
  () => import("@/pages/CoffeePricingPage"),
);
const MenuItemsPage = lazyRouteComponent(
  () => import("@/pages/FnB/MenuItemsPage"),
);
const CustomizationGroupTemplatesPage = lazyRouteComponent(
  () => import("@/pages/FnB/CustomizationGroupTemplatesPage"),
);
const FnbStatsPage = lazyRouteComponent(
  () => import("@/pages/FnB/FnbStatsPage"),
);

export function CoffeePricingRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <CoffeePricingPage />
    </ProtectedRoute>
  );
}

export function MenuItemsRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <MenuItemsPage />
    </ProtectedRoute>
  );
}

export function CustomizationGroupTemplatesRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <CustomizationGroupTemplatesPage />
    </ProtectedRoute>
  );
}

export function FnbStatsRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <FnbStatsPage />
    </ProtectedRoute>
  );
}
