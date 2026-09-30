import { lazy } from "react"
import { AdminStaffRoute, AdminRoute } from "./role-routes";

const MySchedulePage = lazy(() => import("@/pages/MyWork"));
const MyEarningsDetailPage = lazy(
  () => import("@/pages/MyWork/MyEarningsDetailPage"),
);
const MyStaffErrorLogsPage = lazy(
  () => import("@/pages/MyStaffErrorLogs"),
);
const StaffSchedulePage = lazy(
  () => import("@/pages/StaffSchedule"),
);
const StaffEarningsDetailPage = lazy(
  () => import("@/pages/StaffSchedule/StaffEarningsDetailPage"),
);
const StaffSalaryConfigPage = lazy(
  () => import("@/pages/StaffSalaryConfig"),
);
const StaffErrorLogsPage = lazy(
  () => import("@/pages/StaffErrorLogs"),
);

export const MyScheduleRoute = () => (
  <AdminStaffRoute>
    <MySchedulePage />
  </AdminStaffRoute>
);

export const MyEarningsRoute = () => (
  <AdminStaffRoute>
    <MyEarningsDetailPage />
  </AdminStaffRoute>
);

export const MyErrorLogsRoute = () => (
  <AdminStaffRoute>
    <MyStaffErrorLogsPage />
  </AdminStaffRoute>
);

export const StaffScheduleRoute = () => (
  <AdminRoute>
    <StaffSchedulePage />
  </AdminRoute>
);

export const StaffEarningsDetailRoute = () => (
  <AdminRoute>
    <StaffEarningsDetailPage />
  </AdminRoute>
);

export const StaffSalaryRoute = () => (
  <AdminRoute>
    <StaffSalaryConfigPage />
  </AdminRoute>
);

export const StaffErrorLogsRoute = () => (
  <AdminRoute>
    <StaffErrorLogsPage />
  </AdminRoute>
);
