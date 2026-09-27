import { Role } from "@/constants/enum";
import { lazy } from "react";
import ProtectedRoute from "../guards/protected-route";

const RoomsListPage = lazy(
  () => import("@/pages/RoomsManagement/pages/RoomsListPage"),
);
const UpsertRoomPage = lazy(
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
