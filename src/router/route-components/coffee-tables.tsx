import { Role } from "@/constants/enum";
import { lazy } from "react";
import ProtectedRoute from "../guards/protected-route";

const CoffeeTablesListPage = lazy(
  () => import("@/pages/CoffeeTables/CoffeeTablesListPage"),
);
const UpsertCoffeeTablePage = lazy(
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
