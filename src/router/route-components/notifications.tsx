import { lazy } from "react";
import { AdminStaffRoute } from "./role-routes";

const NotificationsPage = lazy(
  () => import("@/pages/NotificationsPage"),
);
const SupportHistoryPage = lazy(
  () => import("@/pages/SupportHistoryPage"),
);

export const NotificationsRoute = () => (
  <AdminStaffRoute>
    <NotificationsPage />
  </AdminStaffRoute>
);

export const SupportHistoryRoute = () => (
  <AdminStaffRoute>
    <SupportHistoryPage />
  </AdminStaffRoute>
);
