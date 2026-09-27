import { lazy } from "react";
import { AdminStaffRoute } from "./role-routes";

const ChangePasswordPage = lazy(
  () => import("@/pages/ChangePasswordPage"),
);
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

export const ChangePasswordRoute = () => (
  <AdminStaffRoute>
    <ChangePasswordPage />
  </AdminStaffRoute>
);

export const ProfileRoute = () => (
  <AdminStaffRoute>
    <ProfilePage />
  </AdminStaffRoute>
);
