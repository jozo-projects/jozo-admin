const PATHS = {
  HOME: "/",
  // rooms management
  ROOMS: "/rooms",
  NEW_ROOM: "/rooms/new",
  EDIT_ROOM: "/rooms/:id/edit",
  ROOM_DEVICE_CONNECTIONS: "/room-device-connections",

  // user managemen
  SETTINGS: "/settings",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  CHANGE_PASSWORD: "/change-password",
  PROFILE: "/profile",
  STAFF: "/staff",
  ADMIN: "/admin",
  UNAUTHORIZED: "/unauthorized",
  NOT_FOUND: "/not-found",
  PRICE: "/price",
  CALENDAR: "/calendar",

  // users management
  USERS_MANAGEMENT: "/users-management",
  USERS_MANAGEMENT_NEW: "/users-management/new",
  USERS_MANAGEMENT_EDIT: "/users-management/:id/edit",

  // staff management
  STAFF_MANAGEMENT: "/staff-management",
  STAFF_MANAGEMENT_NEW: "/staff-management/new",
  STAFF_MANAGEMENT_EDIT: "/staff-management/:id/edit",

  // room types management
  ROOM_TYPES_LISTS: "/room-types",
  ROOM_TYPES_NEW: "/room-types/new",
  ROOM_TYPES_EDIT: "/room-types/:id/edit",
  COFFEE_TABLES: "/coffee-tables",
  COFFEE_TABLES_NEW: "/coffee-tables/new",
  COFFEE_TABLES_EDIT: "/coffee-tables/:id/edit",
  COFFEE_PRICING: "/coffee-pricing",

  // fnb management
  FNB: "/fnb",
  FNB_NEW: "/fnb/new",
  FNB_EDIT: "/fnb/:id/edit",
  MENU_ITEMS: "/menu-items",
  MENU_ITEMS_NEW: "/menu-items/new",
  MENU_ITEMS_EDIT: "/menu-items/:id/edit",
  CUSTOMIZATION_GROUP_TEMPLATES: "/customization-group-templates",
  FNB_STATS: "/fnb-stats",
  GIFT_APPLIED_BILLS: "/gift-applied-bills",
  FNB_SHIFT_COUNT: "/fnb-shift-count",
  RETAIL_SALES: "/retail-sales",

  // promotion management
  PROMOTION: "/promotion",
  PROMOTION_NEW: "/promotion/new",
  PROMOTION_EDIT: "/promotion/:id/edit",

  // recruitment management
  RECRUITMENT: "/recruitment",

  // gifts management
  GIFTS: "/gifts",

  // games management
  GAMES: "/games",

  // membership config
  MEMBERSHIP_CONFIG: "/membership-config",

  // staff schedule management
  STAFF_SCHEDULE: "/staff-schedule",
  STAFF_EARNINGS_DETAIL: "/staff-schedule/:userId/earnings",
  STAFF_SALARY_CONFIG: "/staff-salary-config",
  STAFF_ERROR_LOGS: "/staff-error-logs",

  // my schedule - employee view their own schedules
  MY_SCHEDULE: "/my-schedule",
  MY_EARNINGS_DETAIL: "/my-schedule/earnings",
  MY_ERROR_LOGS: "/my-error-logs",

  // notifications
  NOTIFICATIONS: "/notifications",
  SUPPORT_HISTORY: "/support-history",

  // total revenue
  TOTAL_REVENUE: "/total-revenue",

  // room music
  SONGS_COLLECTION: "/songs-collection",
  MUSIC_CATEGORIES: "/music-categories",
  MUSIC_CATEGORY_DETAIL: "/music-categories/:categoryId",
} as const;

export default PATHS;
