import { lazy } from "react"
import { AdminStaffRoute, AdminRoute } from "./role-routes";


const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const PricePage = lazy(() => import("@/pages/PricePage"));
const RevenueStatisticsPage = lazy(
  () => import("@/pages/RevenueStatisticsPage"),
);
const RoomDeviceConnectionsPage = lazy(
  () => import("@/pages/RoomDeviceConnections"),
);
const FnbShiftCountPage = lazy(
  () => import("@/pages/FnbShiftCount"),
);
const RetailSalesPage = lazy(
  () => import("@/pages/RetailSalesPage"),
);

export const CalendarRoute = () => (
  <AdminStaffRoute>
    <CalendarPage />
  </AdminStaffRoute>
);

export const PriceRoute = () => (
  <AdminRoute>
    <PricePage />
  </AdminRoute>
);

export const RevenueRoute = () => (
  <AdminStaffRoute>
    <RevenueStatisticsPage />
  </AdminStaffRoute>
);

export const RoomDevicesRoute = () => (
  <AdminStaffRoute>
    <RoomDeviceConnectionsPage />
  </AdminStaffRoute>
);

export const FnbShiftCountRoute = () => (
  <AdminStaffRoute>
    <FnbShiftCountPage />
  </AdminStaffRoute>
);

export const RetailSalesRoute = () => (
  <AdminStaffRoute>
    <RetailSalesPage />
  </AdminStaffRoute>
);
