import { Role } from "@/constants/enum";
import { lazyRouteComponent } from "@tanstack/react-router";
import ProtectedRoute from "./ProtectedRoute";

const RoomTypesListPage = lazyRouteComponent(
  () => import("@/pages/RoomTypes/RoomTypesListPage"),
);
const UpsertRoomTypePage = lazyRouteComponent(
  () => import("@/pages/RoomTypes/UpsertRoomTypePage"),
);

export function RoomTypesListRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <RoomTypesListPage />
    </ProtectedRoute>
  );
}

export function NewRoomTypeRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertRoomTypePage />
    </ProtectedRoute>
  );
}

export function EditRoomTypeRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertRoomTypePage />
    </ProtectedRoute>
  );
}
