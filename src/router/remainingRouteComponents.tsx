import { Role } from "@/constants/enum";
import { lazyRouteComponent } from "@tanstack/react-router";
import ProtectedRoute from "./ProtectedRoute";

const CalendarPage = lazyRouteComponent(() => import("@/pages/CalendarPage"));
const PricePage = lazyRouteComponent(() => import("@/pages/PricePage"));
const RevenueStatisticsPage = lazyRouteComponent(
  () => import("@/pages/RevenueStatisticsPage"),
);
const RoomDeviceConnectionsPage = lazyRouteComponent(
  () => import("@/pages/RoomDeviceConnections"),
);
const MySchedulePage = lazyRouteComponent(() => import("@/pages/MyWork"));
const MyEarningsDetailPage = lazyRouteComponent(
  () => import("@/pages/MyWork/MyEarningsDetailPage"),
);
const MyStaffErrorLogsPage = lazyRouteComponent(
  () => import("@/pages/MyStaffErrorLogs"),
);
const NotificationsPage = lazyRouteComponent(
  () => import("@/pages/NotificationsPage"),
);
const SupportHistoryPage = lazyRouteComponent(
  () => import("@/pages/SupportHistoryPage"),
);
const SongsCollectionPage = lazyRouteComponent(
  () => import("@/pages/SongsCollectionPage"),
);
const FnbShiftCountPage = lazyRouteComponent(
  () => import("@/pages/FnbShiftCount"),
);
const RetailSalesPage = lazyRouteComponent(
  () => import("@/pages/RetailSalesPage"),
);
const ChangePasswordPage = lazyRouteComponent(
  () => import("@/pages/ChangePasswordPage"),
);
const ProfilePage = lazyRouteComponent(() => import("@/pages/ProfilePage"));
const GiftAppliedBillsPage = lazyRouteComponent(
  () => import("@/pages/GiftAppliedBills"),
);
const PromotionPage = lazyRouteComponent(() => import("@/pages/PromotionPage"));
const MembershipConfigPage = lazyRouteComponent(
  () => import("@/pages/Membership"),
);
const RecruitmentPage = lazyRouteComponent(
  () => import("@/pages/RecruitmentPage/index"),
);
const GiftsPage = lazyRouteComponent(() => import("@/pages/Gifts"));
const GamesPage = lazyRouteComponent(() => import("@/pages/Games"));
const MusicCategoriesPage = lazyRouteComponent(
  () => import("@/pages/MusicCategories"),
);
const MusicCategoryDetailPage = lazyRouteComponent(
  () => import("@/pages/MusicCategories/MusicCategoryDetailPage"),
);
const StaffSchedulePage = lazyRouteComponent(
  () => import("@/pages/StaffSchedule"),
);
const StaffEarningsDetailPage = lazyRouteComponent(
  () => import("@/pages/StaffSchedule/StaffEarningsDetailPage"),
);
const StaffSalaryConfigPage = lazyRouteComponent(
  () => import("@/pages/StaffSalaryConfig"),
);
const StaffErrorLogsPage = lazyRouteComponent(
  () => import("@/pages/StaffErrorLogs"),
);
const UsersManagementPage = lazyRouteComponent(
  () => import("@/pages/UsersManagement"),
);
const CreateUserPage = lazyRouteComponent(
  () => import("@/pages/UsersManagement/pages/CreateUserPage"),
);
const EditUserPage = lazyRouteComponent(
  () => import("@/pages/UsersManagement/pages/EditUserPage"),
);
const StaffManagementPage = lazyRouteComponent(
  () => import("@/pages/StaffManagement"),
);
const CreateStaffPage = lazyRouteComponent(
  () => import("@/pages/StaffManagement/pages/CreateUserPage"),
);
const EditStaffPage = lazyRouteComponent(
  () => import("@/pages/StaffManagement/pages/EditUserPage"),
);
const StaffPage = lazyRouteComponent(() => import("@/pages/StaffPage"));

const AdminStaff = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={[Role.Admin, Role.Staff]}>
    {children}
  </ProtectedRoute>
);
const AdminOnly = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={[Role.Admin]}>{children}</ProtectedRoute>
);
const StaffOnly = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={[Role.Staff]}>{children}</ProtectedRoute>
);

export const CalendarRoute = () => (
  <AdminStaff>
    <CalendarPage />
  </AdminStaff>
);
export const PriceRoute = () => (
  <AdminOnly>
    <PricePage />
  </AdminOnly>
);
export const RevenueRoute = () => (
  <AdminStaff>
    <RevenueStatisticsPage />
  </AdminStaff>
);
export const RoomDevicesRoute = () => (
  <AdminStaff>
    <RoomDeviceConnectionsPage />
  </AdminStaff>
);
export const MyScheduleRoute = () => (
  <AdminStaff>
    <MySchedulePage />
  </AdminStaff>
);
export const MyEarningsRoute = () => (
  <AdminStaff>
    <MyEarningsDetailPage />
  </AdminStaff>
);
export const MyErrorLogsRoute = () => (
  <AdminStaff>
    <MyStaffErrorLogsPage />
  </AdminStaff>
);
export const NotificationsRoute = () => (
  <AdminStaff>
    <NotificationsPage />
  </AdminStaff>
);
export const SupportHistoryRoute = () => (
  <AdminStaff>
    <SupportHistoryPage />
  </AdminStaff>
);
export const SongsCollectionRoute = () => (
  <AdminStaff>
    <SongsCollectionPage />
  </AdminStaff>
);
export const FnbShiftCountRoute = Object.assign(
  () => (
    <AdminStaff>
      <FnbShiftCountPage />
    </AdminStaff>
  ),
  { preload: FnbShiftCountPage.preload },
);
export const RetailSalesRoute = Object.assign(
  () => (
    <AdminStaff>
      <RetailSalesPage />
    </AdminStaff>
  ),
  { preload: RetailSalesPage.preload },
);
export const ChangePasswordRoute = () => (
  <AdminStaff>
    <ChangePasswordPage />
  </AdminStaff>
);
export const ProfileRoute = () => (
  <AdminStaff>
    <ProfilePage />
  </AdminStaff>
);
export const GiftAppliedBillsRoute = () => (
  <AdminOnly>
    <GiftAppliedBillsPage />
  </AdminOnly>
);
export const PromotionRoute = () => (
  <AdminOnly>
    <PromotionPage />
  </AdminOnly>
);
export const MembershipRoute = () => (
  <AdminOnly>
    <MembershipConfigPage />
  </AdminOnly>
);
export const RecruitmentRoute = () => (
  <AdminOnly>
    <RecruitmentPage />
  </AdminOnly>
);
export const GiftsRoute = () => (
  <AdminOnly>
    <GiftsPage />
  </AdminOnly>
);
export const GamesRoute = () => (
  <AdminOnly>
    <GamesPage />
  </AdminOnly>
);
export const MusicCategoriesRoute = () => (
  <AdminOnly>
    <MusicCategoriesPage />
  </AdminOnly>
);
export const MusicCategoryDetailRoute = () => (
  <AdminOnly>
    <MusicCategoryDetailPage />
  </AdminOnly>
);
export const StaffScheduleRoute = () => (
  <AdminOnly>
    <StaffSchedulePage />
  </AdminOnly>
);
export const StaffEarningsDetailRoute = () => (
  <AdminOnly>
    <StaffEarningsDetailPage />
  </AdminOnly>
);
export const StaffSalaryRoute = () => (
  <AdminOnly>
    <StaffSalaryConfigPage />
  </AdminOnly>
);
export const StaffErrorLogsRoute = () => (
  <AdminOnly>
    <StaffErrorLogsPage />
  </AdminOnly>
);
export const UsersRoute = () => (
  <AdminOnly>
    <UsersManagementPage />
  </AdminOnly>
);
export const NewUserRoute = () => (
  <AdminOnly>
    <CreateUserPage />
  </AdminOnly>
);
export const EditUserRoute = () => (
  <AdminOnly>
    <EditUserPage />
  </AdminOnly>
);
export const StaffManagementRoute = () => (
  <AdminOnly>
    <StaffManagementPage />
  </AdminOnly>
);
export const NewStaffRoute = () => (
  <AdminOnly>
    <CreateStaffPage />
  </AdminOnly>
);
export const EditStaffRoute = () => (
  <AdminOnly>
    <EditStaffPage />
  </AdminOnly>
);
export const StaffRoute = () => (
  <StaffOnly>
    <StaffPage />
  </StaffOnly>
);
