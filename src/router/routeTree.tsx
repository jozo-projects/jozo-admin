import {
  createRootRouteWithContext,
  createRoute,
  lazyRouteComponent,
} from "@tanstack/react-router";
import type { AppRouterContext } from "./routeContext";

import ProtectedHomeRoute from "./ProtectedHomeRoute";
import {
  EditRoomRoute,
  NewRoomRoute,
  RoomsListRoute,
} from "./roomsRouteComponents";
import {
  EditRoomTypeRoute,
  NewRoomTypeRoute,
  RoomTypesListRoute,
} from "./roomTypesRouteComponents";
import {
  CoffeeTablesListRoute,
  EditCoffeeTableRoute,
  NewCoffeeTableRoute,
} from "./coffeeTablesRouteComponents";
import {
  CoffeePricingRoute,
  CustomizationGroupTemplatesRoute,
  FnbStatsRoute,
  MenuItemsRoute,
} from "./coffeePricingFnbRouteComponents";
import {
  CalendarRoute,
  ChangePasswordRoute,
  EditStaffRoute,
  EditUserRoute,
  FnbShiftCountRoute,
  GiftAppliedBillsRoute,
  GiftsRoute,
  GamesRoute,
  MembershipRoute,
  MusicCategoriesRoute,
  MusicCategoryDetailRoute,
  MyEarningsRoute,
  MyErrorLogsRoute,
  MyScheduleRoute,
  NewStaffRoute,
  NewUserRoute,
  NotificationsRoute,
  PriceRoute,
  ProfileRoute,
  PromotionRoute,
  RecruitmentRoute,
  RetailSalesRoute,
  RevenueRoute,
  RoomDevicesRoute,
  SongsCollectionRoute,
  StaffEarningsDetailRoute,
  StaffErrorLogsRoute,
  StaffManagementRoute,
  StaffRoute,
  StaffSalaryRoute,
  StaffScheduleRoute,
  SupportHistoryRoute,
  UsersRoute,
} from "./remainingRouteComponents";
import {
  RootRouteComponent,
  RouterError,
  RouterLoading,
  RouterNotFound,
} from "./routerComponents";

export const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  component: RootRouteComponent,
  pendingComponent: RouterLoading,
  notFoundComponent: RouterNotFound,
  errorComponent: RouterError,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ProtectedHomeRoute,
});

const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms",
  component: RoomsListRoute,
});

const newRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/new",
  component: NewRoomRoute,
});

const editRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rooms/$id/edit",
  component: EditRoomRoute,
});

const roomTypesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/room-types",
  component: RoomTypesListRoute,
});

const newRoomTypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/room-types/new",
  component: NewRoomTypeRoute,
});

const editRoomTypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/room-types/$id/edit",
  component: EditRoomTypeRoute,
});

const coffeeTablesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/coffee-tables",
  component: CoffeeTablesListRoute,
});

const newCoffeeTableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/coffee-tables/new",
  component: NewCoffeeTableRoute,
});

const editCoffeeTableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/coffee-tables/$id/edit",
  component: EditCoffeeTableRoute,
});

const coffeePricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/coffee-pricing",
  component: CoffeePricingRoute,
});

const menuItemsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/menu-items",
  component: MenuItemsRoute,
});

const customizationGroupTemplatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customization-group-templates",
  component: CustomizationGroupTemplatesRoute,
});

const fnbStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fnb-stats",
  component: FnbStatsRoute,
});

const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarRoute,
});
const priceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/price",
  component: PriceRoute,
});
const revenueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/total-revenue",
  component: RevenueRoute,
});
const roomDevicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/room-device-connections",
  component: RoomDevicesRoute,
});
const myScheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-schedule",
  component: MyScheduleRoute,
});
const myEarningsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-schedule/earnings",
  component: MyEarningsRoute,
});
const myErrorLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/my-error-logs",
  component: MyErrorLogsRoute,
});
const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationsRoute,
});
const supportHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/support-history",
  component: SupportHistoryRoute,
});
const songsCollectionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/songs-collection",
  component: SongsCollectionRoute,
});
const fnbShiftCountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/fnb-shift-count",
  component: FnbShiftCountRoute,
});
const retailSalesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/retail-sales",
  component: RetailSalesRoute,
});
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/change-password",
  component: ChangePasswordRoute,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileRoute,
});
const giftAppliedBillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gift-applied-bills",
  component: GiftAppliedBillsRoute,
});
const promotionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/promotion",
  component: PromotionRoute,
});
const membershipRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/membership-config",
  component: MembershipRoute,
});
const recruitmentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recruitment",
  component: RecruitmentRoute,
});
const giftsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/gifts",
  component: GiftsRoute,
});
const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games",
  component: GamesRoute,
});
const musicCategoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/music-categories",
  component: MusicCategoriesRoute,
});
const musicCategoryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/music-categories/$categoryId",
  component: MusicCategoryDetailRoute,
});
const staffScheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-schedule",
  component: StaffScheduleRoute,
});
const staffEarningsDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-schedule/$userId/earnings",
  component: StaffEarningsDetailRoute,
});
const staffSalaryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-salary-config",
  component: StaffSalaryRoute,
});
const staffErrorLogsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-error-logs",
  component: StaffErrorLogsRoute,
});
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users-management",
  component: UsersRoute,
});
const newUserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users-management/new",
  component: NewUserRoute,
});
const editUserRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users-management/$id/edit",
  component: EditUserRoute,
});
const staffManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-management",
  component: StaffManagementRoute,
});
const newStaffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-management/new",
  component: NewStaffRoute,
});
const editStaffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff-management/$id/edit",
  component: EditStaffRoute,
});
const staffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/staff",
  component: StaffRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: lazyRouteComponent(() => import("@/pages/LoginPage")),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: lazyRouteComponent(() => import("@/pages/ForgotPasswordPage")),
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: (search: Record<string, unknown>) => ({
    forgot_password_token:
      typeof search.forgot_password_token === "string"
        ? search.forgot_password_token
        : undefined,
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: lazyRouteComponent(() => import("@/pages/ResetPasswordPage")),
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unauthorized",
  component: lazyRouteComponent(() => import("@/pages/UnauthorizedPage")),
});

export const routerSmokeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/__router-smoke",
  component: () => (
    <main className="p-6">
      <h1 className="text-xl font-semibold">TanStack Router is ready</h1>
    </main>
  ),
});

export const routeTree = rootRoute.addChildren([
  homeRoute,
  roomsRoute,
  newRoomRoute,
  editRoomRoute,
  roomTypesRoute,
  newRoomTypeRoute,
  editRoomTypeRoute,
  coffeeTablesRoute,
  newCoffeeTableRoute,
  editCoffeeTableRoute,
  coffeePricingRoute,
  menuItemsRoute,
  customizationGroupTemplatesRoute,
  fnbStatsRoute,
  calendarRoute,
  priceRoute,
  revenueRoute,
  roomDevicesRoute,
  myScheduleRoute,
  myEarningsRoute,
  myErrorLogsRoute,
  notificationsRoute,
  supportHistoryRoute,
  songsCollectionRoute,
  fnbShiftCountRoute,
  retailSalesRoute,
  changePasswordRoute,
  profileRoute,
  giftAppliedBillsRoute,
  promotionRoute,
  membershipRoute,
  recruitmentRoute,
  giftsRoute,
  gamesRoute,
  musicCategoriesRoute,
  musicCategoryDetailRoute,
  staffScheduleRoute,
  staffEarningsDetailRoute,
  staffSalaryRoute,
  staffErrorLogsRoute,
  usersRoute,
  newUserRoute,
  editUserRoute,
  staffManagementRoute,
  newStaffRoute,
  editStaffRoute,
  staffRoute,
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  unauthorizedRoute,
  routerSmokeRoute,
]);
