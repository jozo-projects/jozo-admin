import { Role } from "@/constants/enum";
import { lazyRouteComponent } from "@tanstack/react-router";
import ProtectedRoute from "./ProtectedRoute";

const RoomsListPage = lazyRouteComponent(
  () => import("@/pages/RoomsManagement/pages/RoomsListPage"),
);
const UpsertRoomPage = lazyRouteComponent(
  () => import("@/pages/RoomsManagement/pages/UpsertRoomPage"),
);

export function RoomsListRoute() {
  return (
    <ProtectedRoute>
      <RoomsListPage />
    </ProtectedRoute>
  );
}

export function NewRoomRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertRoomPage />
    </ProtectedRoute>
  );
}

export function EditRoomRoute() {
  return (
    <ProtectedRoute allowedRoles={[Role.Admin]}>
      <UpsertRoomPage />
    </ProtectedRoute>
  );
}
