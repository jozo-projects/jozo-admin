import { Role } from "@/constants/enum";
import { lazy } from "react";
import ProtectedRoute from "../guards/protected-route";

const RoomTypesListPage = lazy(
  () => import("@/pages/RoomTypes/RoomTypesListPage"),
);
const UpsertRoomTypePage = lazy(
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
