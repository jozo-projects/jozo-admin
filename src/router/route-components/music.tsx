import { lazy } from "react";
import { AdminRoute, AdminStaffRoute } from "./role-routes";

const SongsCollectionPage = lazy(
  () => import("@/pages/SongsCollectionPage"),
);
const MusicCategoriesPage = lazy(
  () => import("@/pages/MusicCategories"),
);
const MusicCategoryDetailPage = lazy(
  () => import("@/pages/MusicCategories/MusicCategoryDetailPage"),
);

export const SongsCollectionRoute = () => (
  <AdminStaffRoute>
    <SongsCollectionPage />
  </AdminStaffRoute>
);

export const MusicCategoriesRoute = () => (
  <AdminRoute>
    <MusicCategoriesPage />
  </AdminRoute>
);

export const MusicCategoryDetailRoute = () => (
  <AdminRoute>
    <MusicCategoryDetailPage />
  </AdminRoute>
);
