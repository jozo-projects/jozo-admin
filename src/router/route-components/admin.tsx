import { lazy } from "react";
import { AdminRoute } from "./role-routes";

const GiftAppliedBillsPage = lazy(
  () => import("@/pages/GiftAppliedBills"),
);
const PromotionPage = lazy(() => import("@/pages/PromotionPage"));
const MembershipConfigPage = lazy(
  () => import("@/pages/Membership"),
);
const RecruitmentPage = lazy(
  () => import("@/pages/RecruitmentPage/index"),
);
const GiftsPage = lazy(() => import("@/pages/Gifts"));
const GamesPage = lazy(() => import("@/pages/Games"));

export const GiftAppliedBillsRoute = () => (
  <AdminRoute>
    <GiftAppliedBillsPage />
  </AdminRoute>
);

export const PromotionRoute = () => (
  <AdminRoute>
    <PromotionPage />
  </AdminRoute>
);

export const MembershipRoute = () => (
  <AdminRoute>
    <MembershipConfigPage />
  </AdminRoute>
);

export const RecruitmentRoute = () => (
  <AdminRoute>
    <RecruitmentPage />
  </AdminRoute>
);

export const GiftsRoute = () => (
  <AdminRoute>
    <GiftsPage />
  </AdminRoute>
);

export const GamesRoute = () => (
  <AdminRoute>
    <GamesPage />
  </AdminRoute>
);
