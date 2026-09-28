import { lazy } from "react";
import { AdminRoute, StaffRouteGuard } from "./role-routes";

const UsersManagementPage = lazy(
  () => import("@/pages/UsersManagement"),
);
const CreateUserPage = lazy(
  () => import("@/pages/UsersManagement/pages/CreateUserPage"),
);
const EditUserPage = lazy(
  () => import("@/pages/UsersManagement/pages/EditUserPage"),
);
const StaffManagementPage = lazy(
  () => import("@/pages/StaffManagement"),
);
const CreateStaffPage = lazy(
  () => import("@/pages/StaffManagement/pages/CreateUserPage"),
);
const EditStaffPage = lazy(
  () => import("@/pages/StaffManagement/pages/EditUserPage"),
);
const StaffPage = lazy(() => import("@/pages/StaffPage"));

export const UsersRoute = () => (
  <AdminRoute>
    <UsersManagementPage />
  </AdminRoute>
);

export const NewUserRoute = () => (
  <AdminRoute>
    <CreateUserPage />
  </AdminRoute>
);

export const EditUserRoute = () => (
  <AdminRoute>
    <EditUserPage />
  </AdminRoute>
);

export const StaffManagementRoute = () => (
  <AdminRoute>
    <StaffManagementPage />
  </AdminRoute>
);

export const NewStaffRoute = () => (
  <AdminRoute>
    <CreateStaffPage />
  </AdminRoute>
);

export const EditStaffRoute = () => (
  <AdminRoute>
    <EditStaffPage />
  </AdminRoute>
);

export const StaffRoute = () => (
  <StaffRouteGuard>
    <StaffPage />
  </StaffRouteGuard>
);
