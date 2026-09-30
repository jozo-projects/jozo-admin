import { Role } from "@/constants/enum";
import { lazy } from "react"
import ProtectedRoute from "../guards/protected-route";


const CoffeePricingPage = lazy(
  () => import("@/pages/CoffeePricingPage"),
);
const MenuItemsPage = lazy(
  () => import("@/pages/FnB/MenuItemsPage"),
);
const CustomizationGroupTemplatesPage = lazy(
  () => import("@/pages/FnB/CustomizationGroupTemplatesPage"),
);
const FnbStatsPage = lazy(
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
