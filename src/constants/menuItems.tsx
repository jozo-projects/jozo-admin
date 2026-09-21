import {
  BarChart3,
  BedDouble,
  BellRing,
  Briefcase,
  Calendar,
  ClipboardList,
  Clock,
  Coffee,
  DollarSign,
  DoorOpenIcon,
  Gamepad2,
  Gift,
  Home,
  MonitorSmartphone,
  Music,
  PercentIcon,
  Settings2,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  Users,
  UserPlus,
} from "lucide-react";
import { Role } from "./enum";
import PATHS from "./paths";

export type MenuItem = {
  title: string;
  url?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  subItems?: MenuItem[];
  roles?: Role[]; // Restrict visibility by role
};

const STAFF_AND_ADMIN = [Role.Admin, Role.Staff];
const ADMIN_ONLY = [Role.Admin];

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Home",
    url: PATHS.HOME,
    icon: Home,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "Lịch sử hỗ trợ",
    url: PATHS.SUPPORT_HISTORY,
    icon: ClipboardList,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "My Schedule",
    url: PATHS.MY_SCHEDULE,
    icon: Briefcase,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "My Error Logs",
    url: PATHS.MY_ERROR_LOGS,
    icon: BellRing,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "Calendar",
    url: PATHS.CALENDAR,
    icon: Calendar,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "Total Revenue",
    url: PATHS.TOTAL_REVENUE,
    icon: BarChart3,
    roles: STAFF_AND_ADMIN,
  },
  {
    title: "Rooms",
    icon: DoorOpenIcon,
    roles: STAFF_AND_ADMIN,
    subItems: [
      {
        title: "Rooms Management",
        url: PATHS.ROOMS,
        icon: DoorOpenIcon,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Device Connections",
        url: PATHS.ROOM_DEVICE_CONNECTIONS,
        icon: MonitorSmartphone,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Room Types",
        url: PATHS.ROOM_TYPES_LISTS,
        icon: BedDouble,
        roles: ADMIN_ONLY,
      },
      {
        title: "Room Pricing",
        url: PATHS.PRICE,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Food & Beverage",
    icon: UtensilsCrossed,
    roles: STAFF_AND_ADMIN,
    subItems: [
      {
        title: "Inventory Count",
        url: PATHS.FNB_SHIFT_COUNT,
        icon: ClipboardList,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Retail Sales",
        url: PATHS.RETAIL_SALES,
        icon: ShoppingCart,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Menu Catalog",
        url: PATHS.MENU_ITEMS,
        icon: UtensilsCrossed,
        roles: ADMIN_ONLY,
      },
      {
        title: "Modifier Templates",
        url: PATHS.CUSTOMIZATION_GROUP_TEMPLATES,
        icon: Settings2,
        roles: ADMIN_ONLY,
      },
      {
        title: "Analytics",
        url: PATHS.FNB_STATS,
        icon: BarChart3,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Coffee Lounge",
    icon: Coffee,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Service Stations",
        url: PATHS.COFFEE_TABLES,
        icon: Coffee,
        roles: ADMIN_ONLY,
      },
      {
        title: "Pricing",
        url: PATHS.COFFEE_PRICING,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "People",
    icon: Users,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Users Management",
        url: PATHS.USERS_MANAGEMENT,
        icon: Users,
        roles: ADMIN_ONLY,
      },
      {
        title: "Staff Management",
        url: PATHS.STAFF_MANAGEMENT,
        icon: Users,
        roles: ADMIN_ONLY,
      },
      {
        title: "Staff Schedule",
        url: PATHS.STAFF_SCHEDULE,
        icon: Clock,
        roles: ADMIN_ONLY,
      },
      {
        title: "Salary Configuration",
        url: PATHS.STAFF_SALARY_CONFIG,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
      {
        title: "Staff Error Logs",
        url: PATHS.STAFF_ERROR_LOGS,
        icon: BellRing,
        roles: ADMIN_ONLY,
      },
      {
        title: "Recruitment",
        url: PATHS.RECRUITMENT,
        icon: UserPlus,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Growth & Content",
    icon: Sparkles,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Promotion",
        url: PATHS.PROMOTION,
        icon: PercentIcon,
        roles: ADMIN_ONLY,
      },
      {
        title: "Membership",
        url: PATHS.MEMBERSHIP_CONFIG,
        icon: Sparkles,
        roles: ADMIN_ONLY,
      },
      {
        title: "Gifts",
        url: PATHS.GIFTS,
        icon: Gift,
        roles: ADMIN_ONLY,
      },
      {
        title: "Games",
        url: PATHS.GAMES,
        icon: Gamepad2,
        roles: ADMIN_ONLY,
      },
      {
        title: "Songs Collection",
        url: PATHS.SONGS_COLLECTION,
        icon: Music,
        roles: ADMIN_ONLY,
      },
      {
        title: "Danh mục nhạc",
        url: PATHS.MUSIC_CATEGORIES,
        icon: Music,
        roles: ADMIN_ONLY,
      },
    ],
  },
];

export { MENU_ITEMS };
