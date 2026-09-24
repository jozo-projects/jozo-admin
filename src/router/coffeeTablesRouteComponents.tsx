import { Role } from "@/constants/enum";
import { lazyRouteComponent } from "@tanstack/react-router";
import ProtectedRoute from "./ProtectedRoute";

const CoffeeTablesListPage = lazyRouteComponent(
  () => import("@/pages/CoffeeTables/CoffeeTablesListPage"),
);
const UpsertCoffeeTablePage = lazyRouteComponent(
  () => import("@/pages/CoffeeTables/UpsertCoffeeTablePage"),
);

export function CoffeeTablesListRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <CoffeeTablesListPage />
    </ProtectedRoute>
  );
}

export function NewCoffeeTableRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertCoffeeTablePage />
    </ProtectedRoute>
  );
}

export function EditCoffeeTableRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertCoffeeTablePage />
    </ProtectedRoute>
  );
}
