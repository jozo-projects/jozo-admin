import {
  createRootRouteWithContext,
  createRoute,
} from "@tanstack/react-router";
import { lazy } from "react";
import type { AppRouterContext } from "./router-context";
import AuthenticatedLayout from "./layouts/authenticated-layout";
import { requireStaffAccess } from "./guards/require-authentication";

import HomeRoute from "./route-components/home";
import {
  EditRoomRoute,
  NewRoomRoute,
  RoomsListRoute,
} from "./route-components/rooms";
import {
  EditRoomTypeRoute,
  NewRoomTypeRoute,
  RoomTypesListRoute,
} from "./route-components/room-types";
import {
  CoffeeTablesListRoute,
  EditCoffeeTableRoute,
  NewCoffeeTableRoute,
} from "./route-components/coffee-tables";
import {
  CoffeePricingRoute,
  CustomizationGroupTemplatesRoute,
  FnbStatsRoute,
  MenuItemsRoute,
} from "./route-components/coffee-pricing-fnb";
import {
  CalendarRoute,
  FnbShiftCountRoute,
  PriceRoute,
  RetailSalesRoute,
  RevenueRoute,
  RoomDevicesRoute,
} from "./route-components/reports";
import {
  MyEarningsRoute,
  MyErrorLogsRoute,
  MyScheduleRoute,
  StaffEarningsDetailRoute,
  StaffErrorLogsRoute,
  StaffSalaryRoute,
  StaffScheduleRoute,
} from "./route-components/work";
import {
  MessengerMessagesRoute,
  NotificationsRoute,
  SupportHistoryRoute,
} from "./route-components/notifications";
import {
  MusicCategoriesRoute,
  MusicCategoryDetailRoute,
  SongsCollectionRoute,
} from "./route-components/music";
import { ChangePasswordRoute, ProfileRoute } from "./route-components/account";
import {
  GiftAppliedBillsRoute,
  GiftsRoute,
  GamesRoute,
  MembershipRoute,
  PromotionRoute,
  RecruitmentRoute,
} from "./route-components/admin";
import {
  EditStaffRoute,
  EditUserRoute,
  NewStaffRoute,
  NewUserRoute,
  StaffManagementRoute,
  StaffRoute,
  UsersRoute,
} from "./route-components/users";
import {
  RootRouteComponent,
  RouterError,
  RouterNotFound,
} from "./router-boundaries";

export const rootRoute = createRootRouteWithContext<AppRouterContext>()({
  component: RootRouteComponent,
  notFoundComponent: RouterNotFound,
  errorComponent: RouterError,
});

type AuthenticatedRoute = Omit<typeof rootRoute, "id" | "fullPath" | "to"> & {
  id: "/_authenticated";
  fullPath: "/";
  to: "/";
};

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: requireStaffAccess,
  component: AuthenticatedLayout,
}) as unknown as AuthenticatedRoute;

const homeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/",
  component: HomeRoute,
});

const roomsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "rooms",
  component: RoomsListRoute,
});

const newRoomRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "rooms/new",
  component: NewRoomRoute,
});

const editRoomRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "rooms/$id/edit",
  component: EditRoomRoute,
});

const roomTypesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "room-types",
  component: RoomTypesListRoute,
});

const newRoomTypeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "room-types/new",
  component: NewRoomTypeRoute,
});

const editRoomTypeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "room-types/$id/edit",
  component: EditRoomTypeRoute,
});

const coffeeTablesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "coffee-tables",
  component: CoffeeTablesListRoute,
});

const newCoffeeTableRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "coffee-tables/new",
  component: NewCoffeeTableRoute,
});

const editCoffeeTableRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "coffee-tables/$id/edit",
  component: EditCoffeeTableRoute,
});

const coffeePricingRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "coffee-pricing",
  component: CoffeePricingRoute,
});

const menuItemsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "menu-items",
  component: MenuItemsRoute,
});

const customizationGroupTemplatesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "customization-group-templates",
  component: CustomizationGroupTemplatesRoute,
});

const fnbStatsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "fnb-stats",
  component: FnbStatsRoute,
});

const calendarRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "calendar",
  component: CalendarRoute,
});
const priceRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "price",
  component: PriceRoute,
});
const revenueRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "total-revenue",
  component: RevenueRoute,
});
const roomDevicesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "room-device-connections",
  component: RoomDevicesRoute,
});
const myScheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "my-schedule",
  component: MyScheduleRoute,
});
const myEarningsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "my-schedule/earnings",
  component: MyEarningsRoute,
});
const myErrorLogsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "my-error-logs",
  component: MyErrorLogsRoute,
});
const notificationsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "notifications",
  component: NotificationsRoute,
});
const messengerMessagesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "messenger-messages",
  component: MessengerMessagesRoute,
});
const supportHistoryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "support-history",
  component: SupportHistoryRoute,
});
const songsCollectionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "songs-collection",
  component: SongsCollectionRoute,
});
const fnbShiftCountRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "fnb-shift-count",
  component: FnbShiftCountRoute,
});
const retailSalesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "retail-sales",
  component: RetailSalesRoute,
});
const changePasswordRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "change-password",
  component: ChangePasswordRoute,
});
const profileRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "profile",
  component: ProfileRoute,
});
const giftAppliedBillsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "gift-applied-bills",
  component: GiftAppliedBillsRoute,
});
const promotionRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "promotion",
  component: PromotionRoute,
});
const membershipRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "membership-config",
  component: MembershipRoute,
});
const recruitmentRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "recruitment",
  component: RecruitmentRoute,
});
const giftsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "gifts",
  component: GiftsRoute,
});
const gamesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "games",
  component: GamesRoute,
});
const musicCategoriesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "music-categories",
  component: MusicCategoriesRoute,
});
const musicCategoryDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "music-categories/$categoryId",
  component: MusicCategoryDetailRoute,
});
const staffScheduleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-schedule",
  component: StaffScheduleRoute,
});
const staffEarningsDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-schedule/$userId/earnings",
  component: StaffEarningsDetailRoute,
});
const staffSalaryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-salary-config",
  component: StaffSalaryRoute,
});
const staffErrorLogsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-error-logs",
  component: StaffErrorLogsRoute,
});
const usersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "users-management",
  component: UsersRoute,
});
const newUserRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "users-management/new",
  component: NewUserRoute,
});
const editUserRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "users-management/$id/edit",
  component: EditUserRoute,
});
const staffManagementRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-management",
  component: StaffManagementRoute,
});
const newStaffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-management/new",
  component: NewStaffRoute,
});
const editStaffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff-management/$id/edit",
  component: EditStaffRoute,
});
const staffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "staff",
  component: StaffRoute,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: lazy(() => import("@/pages/LoginPage")),
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: lazy(() => import("@/pages/ForgotPasswordPage")),
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
  component: lazy(() => import("@/pages/ResetPasswordPage")),
});

const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unauthorized",
  component: lazy(() => import("@/pages/UnauthorizedPage")),
});

export const routerSmokeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "__router-smoke",
  component: () => (
    <main className="p-6">
      <h1 className="text-xl font-semibold">TanStack Router is ready</h1>
    </main>
  ),
});

export const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
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
    messengerMessagesRoute,
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
    routerSmokeRoute,
  ]),
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  unauthorizedRoute,
]);
