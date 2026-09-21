import AuthGuard from "@/components/guards/AuthGuard";
import RoleGuard from "@/components/guards/RoleGuard";
import { Layout } from "@/components/Layout";
import { Role } from "@/constants/enum";
import PATHS from "@/constants/paths";

import { lazy, Suspense } from "react";
import {
  Outlet,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";

const AdminPage = lazy(() => import("@/pages/AdminPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const PromotionPage = lazy(() => import("@/pages/PromotionPage"));
const RevenueStatisticsPage = lazy(
  () => import("@/pages/RevenueStatisticsPage")
);
const RoomsListPage = lazy(
  () => import("@/pages/RoomsManagement/pages/RoomsListPage")
);
const UpsertRoomPage = lazy(
  () => import("@/pages/RoomsManagement/pages/UpsertRoomPage")
);
const StaffPage = lazy(() => import("@/pages/StaffPage"));
const UnauthorizedPage = lazy(() => import("@/pages/UnauthorizedPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const PricePage = lazy(() => import("@/pages/PricePage"));
const CoffeePricingPage = lazy(() => import("@/pages/CoffeePricingPage"));
const RoomTypesListPage = lazy(
  () => import("@/pages/RoomTypes/RoomTypesListPage")
);
const UpsertRoomTypePage = lazy(
  () => import("@/pages/RoomTypes/UpsertRoomTypePage")
);
const CoffeeTablesListPage = lazy(
  () => import("@/pages/CoffeeTables/CoffeeTablesListPage")
);
const UpsertCoffeeTablePage = lazy(
  () => import("@/pages/CoffeeTables/UpsertCoffeeTablePage")
);
// const FnBPage = lazy(() => import("@/pages/FnB"));
const MenuItemsPage = lazy(() => import("@/pages/FnB/MenuItemsPage"));
const CustomizationGroupTemplatesPage = lazy(
  () => import("@/pages/FnB/CustomizationGroupTemplatesPage")
);
const FnbStatsPage = lazy(() => import("@/pages/FnB/FnbStatsPage"));
const GiftAppliedBillsPage = lazy(() => import("@/pages/GiftAppliedBills"));
const FnbShiftCountPage = lazy(() => import("@/pages/FnbShiftCount"));
const RetailSalesPage = lazy(() => import("@/pages/RetailSalesPage"));
const GiftsPage = lazy(() => import("@/pages/Gifts"));
const GamesPage = lazy(() => import("@/pages/Games"));
const MembershipConfigPage = lazy(() => import("@/pages/Membership"));
const StaffManagementPage = lazy(() => import("@/pages/StaffManagement"));
const CreateStaffPage = lazy(
  () => import("@/pages/StaffManagement/pages/CreateUserPage")
);
const EditStaffPage = lazy(
  () => import("@/pages/StaffManagement/pages/EditUserPage")
);
const UsersManagementPage = lazy(() => import("@/pages/UsersManagement"));
const CreateUserPage = lazy(
  () => import("@/pages/UsersManagement/pages/CreateUserPage")
);
const EditUserPage = lazy(
  () => import("@/pages/UsersManagement/pages/EditUserPage")
);
const RecruitmentPage = lazy(() => import("@/pages/RecruitmentPage/index"));
const StaffSchedulePage = lazy(() => import("@/pages/StaffSchedule"));
const StaffSalaryConfigPage = lazy(() => import("@/pages/StaffSalaryConfig"));
const StaffErrorLogsPage = lazy(() => import("@/pages/StaffErrorLogs"));
const MyStaffErrorLogsPage = lazy(() => import("@/pages/MyStaffErrorLogs"));
const StaffEarningsDetailPage = lazy(
  () => import("@/pages/StaffSchedule/StaffEarningsDetailPage")
);
const MySchedulePage = lazy(() => import("@/pages/MyWork"));
const MyEarningsDetailPage = lazy(
  () => import("@/pages/MyWork/MyEarningsDetailPage")
);
const ChangePasswordPage = lazy(() => import("@/pages/ChangePasswordPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SupportHistoryPage = lazy(() => import("@/pages/SupportHistoryPage"));
const SongsCollectionPage = lazy(
  () => import("@/pages/SongsCollectionPage")
);
const MusicCategoriesPage = lazy(() => import("@/pages/MusicCategories"));
const MusicCategoryDetailPage = lazy(
  () => import("@/pages/MusicCategories/MusicCategoryDetailPage")
);
const RoomDeviceConnectionsPage = lazy(
  () => import("@/pages/RoomDeviceConnections")
);

function useRoute() {
  return (
    <Router>
      <NuqsAdapter>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
          <Route path={PATHS.LOGIN} element={<LoginPage />} />
          <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={PATHS.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={PATHS.UNAUTHORIZED} element={<UnauthorizedPage />} />

          <Route element={<AuthGuard />}>
            <Route
              element={
                <Layout>
                  <Outlet />
                </Layout>
              }
            >
              {/* Routes cho Admin và Staff */}
              <Route
                element={<RoleGuard requiredRoles={[Role.Admin, Role.Staff]} />}
              >
                <Route path={PATHS.HOME} element={<AdminPage />} />
                <Route path={PATHS.ROOMS} element={<RoomsListPage />} />
                <Route
                  path={PATHS.ROOM_DEVICE_CONNECTIONS}
                  element={<RoomDeviceConnectionsPage />}
                />
                <Route
                  path={PATHS.TOTAL_REVENUE}
                  element={<RevenueStatisticsPage />}
                />
                <Route path={PATHS.CALENDAR} element={<CalendarPage />} />
                <Route path={PATHS.MY_SCHEDULE} element={<MySchedulePage />} />
                <Route path={PATHS.MY_ERROR_LOGS} element={<MyStaffErrorLogsPage />} />
                <Route
                  path={PATHS.MY_EARNINGS_DETAIL}
                  element={<MyEarningsDetailPage />}
                />
                <Route
                  path={PATHS.NOTIFICATIONS}
                  element={<NotificationsPage />}
                />
                <Route
                  path={PATHS.SUPPORT_HISTORY}
                  element={<SupportHistoryPage />}
                />
                <Route
                  path={PATHS.SONGS_COLLECTION}
                  element={<SongsCollectionPage />}
                />
                <Route
                  path={PATHS.FNB_SHIFT_COUNT}
                  element={<FnbShiftCountPage />}
                />
                <Route path={PATHS.RETAIL_SALES} element={<RetailSalesPage />} />
                <Route
                  path={PATHS.CHANGE_PASSWORD}
                  element={<ChangePasswordPage />}
                />
                <Route path={PATHS.PROFILE} element={<ProfilePage />} />
              </Route>

              {/* Routes chỉ cho Admin */}
              <Route element={<RoleGuard requiredRoles={[Role.Admin]} />}>
                <Route path={PATHS.ROOM_TYPES_LISTS}>
                  <Route index element={<RoomTypesListPage />} />
                  <Route
                    path={PATHS.ROOM_TYPES_NEW}
                    element={<UpsertRoomTypePage />}
                  />
                  <Route
                    path={PATHS.ROOM_TYPES_EDIT}
                    element={<UpsertRoomTypePage />}
                  />
                </Route>

                <Route path={PATHS.PRICE} element={<PricePage />} />
                <Route path={PATHS.NEW_ROOM} element={<UpsertRoomPage />} />
                <Route path={PATHS.EDIT_ROOM} element={<UpsertRoomPage />} />
                <Route path={PATHS.COFFEE_TABLES}>
                  <Route index element={<CoffeeTablesListPage />} />
                  <Route
                    path={PATHS.COFFEE_TABLES_NEW}
                    element={<UpsertCoffeeTablePage />}
                  />
                  <Route
                    path={PATHS.COFFEE_TABLES_EDIT}
                    element={<UpsertCoffeeTablePage />}
                  />
                </Route>
                <Route
                  path={PATHS.COFFEE_PRICING}
                  element={<CoffeePricingPage />}
                />
                {/* <Route path={PATHS.FNB} element={<FnBPage />} /> */}
                <Route path={PATHS.MENU_ITEMS} element={<MenuItemsPage />} />
                <Route
                  path={PATHS.CUSTOMIZATION_GROUP_TEMPLATES}
                  element={<CustomizationGroupTemplatesPage />}
                />
                <Route path={PATHS.FNB_STATS} element={<FnbStatsPage />} />
                <Route path={PATHS.GIFT_APPLIED_BILLS} element={<GiftAppliedBillsPage />} />
                <Route path={PATHS.PROMOTION} element={<PromotionPage />} />
                <Route
                  path={PATHS.MEMBERSHIP_CONFIG}
                  element={<MembershipConfigPage />}
                />
                <Route path={PATHS.RECRUITMENT} element={<RecruitmentPage />} />
                <Route path={PATHS.GIFTS} element={<GiftsPage />} />
                <Route path={PATHS.GAMES} element={<GamesPage />} />
                <Route
                  path={PATHS.MUSIC_CATEGORIES}
                  element={<MusicCategoriesPage />}
                />
                <Route
                  path={PATHS.MUSIC_CATEGORY_DETAIL}
                  element={<MusicCategoryDetailPage />}
                />
                <Route path={PATHS.STAFF_SCHEDULE} element={<StaffSchedulePage />} />
                <Route
                  path={PATHS.STAFF_SALARY_CONFIG}
                  element={<StaffSalaryConfigPage />}
                />
                <Route
                  path={PATHS.STAFF_ERROR_LOGS}
                  element={<StaffErrorLogsPage />}
                />
                <Route
                  path={PATHS.STAFF_EARNINGS_DETAIL}
                  element={<StaffEarningsDetailPage />}
                />

                {/* Users Management Routes */}
                <Route path={PATHS.USERS_MANAGEMENT}>
                  <Route index element={<UsersManagementPage />} />
                  <Route
                    path={PATHS.USERS_MANAGEMENT_NEW}
                    element={<CreateUserPage />}
                  />
                  <Route
                    path={PATHS.USERS_MANAGEMENT_EDIT}
                    element={<EditUserPage />}
                  />
                </Route>

                {/* Staff Management Routes */}
                <Route path={PATHS.STAFF_MANAGEMENT}>
                  <Route index element={<StaffManagementPage />} />
                  <Route
                    path={PATHS.STAFF_MANAGEMENT_NEW}
                    element={<CreateStaffPage />}
                  />
                  <Route
                    path={PATHS.STAFF_MANAGEMENT_EDIT}
                    element={<EditStaffPage />}
                  />
                </Route>
              </Route>

              {/* Routes chỉ cho Staff */}
              <Route element={<RoleGuard requiredRoles={[Role.Staff]} />}>
                <Route path="/staff" element={<StaffPage />} />
              </Route>
            </Route>
          </Route>
          </Routes>
        </Suspense>
      </NuqsAdapter>
    </Router>
  );
}

export default useRoute;
