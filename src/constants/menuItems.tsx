import {
  BarChart3,
  BedDouble,
  BellRing,
  Briefcase,
  ClipboardList,
  Clock,
  Coffee,
  DollarSign,
  DoorOpenIcon,
  Gamepad2,
  Gift,
  Home,
  MessageCircle,
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
  section?: "quick-access" | "personal" | "settings";
};

const STAFF_AND_ADMIN = [Role.Admin, Role.Staff];
const ADMIN_ONLY = [Role.Admin];

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Trang chủ",
    url: PATHS.HOME,
    icon: Home,
    roles: STAFF_AND_ADMIN,
    section: "quick-access",
  },
  {
    title: "Tin nhắn Facebook",
    url: PATHS.MESSENGER_MESSAGES,
    icon: MessageCircle,
    roles: STAFF_AND_ADMIN,
    section: "quick-access",
  },
  {
    title: "Tổng doanh thu",
    url: PATHS.TOTAL_REVENUE,
    icon: BarChart3,
    roles: STAFF_AND_ADMIN,
    section: "quick-access",
  },
  {
    title: "Lịch làm việc",
    url: PATHS.MY_SCHEDULE,
    icon: Briefcase,
    roles: STAFF_AND_ADMIN,
    section: "personal",
  },
  {
    title: "Thống kê công việc",
    url: PATHS.MY_EARNINGS_DETAIL,
    icon: BarChart3,
    roles: STAFF_AND_ADMIN,
    section: "personal",
  },
  {
    title: "Lỗi của tôi",
    url: PATHS.MY_ERROR_LOGS,
    icon: BellRing,
    roles: STAFF_AND_ADMIN,
    section: "personal",
  },
  {
    title: "Cài đặt chung",
    url: PATHS.CALENDAR,
    icon: Settings2,
    roles: ADMIN_ONLY,
    section: "settings",
  },
  {
    title: "Lịch sử hỗ trợ",
    url: PATHS.SUPPORT_HISTORY,
    icon: ClipboardList,
    roles: STAFF_AND_ADMIN,
    section: "quick-access",
  },
  {
    title: "Phòng",
    icon: DoorOpenIcon,
    roles: STAFF_AND_ADMIN,
    subItems: [
      {
        title: "Quản lý phòng",
        url: PATHS.ROOMS,
        icon: DoorOpenIcon,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Kết nối thiết bị",
        url: PATHS.ROOM_DEVICE_CONNECTIONS,
        icon: MonitorSmartphone,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Loại phòng",
        url: PATHS.ROOM_TYPES_LISTS,
        icon: BedDouble,
        roles: ADMIN_ONLY,
      },
      {
        title: "Giá phòng",
        url: PATHS.PRICE,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Đồ ăn & thức uống",
    icon: UtensilsCrossed,
    roles: STAFF_AND_ADMIN,
    subItems: [
      {
        title: "Bán lẻ",
        url: PATHS.RETAIL_SALES,
        icon: ShoppingCart,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Kiểm kho",
        url: PATHS.FNB_SHIFT_COUNT,
        icon: ClipboardList,
        roles: STAFF_AND_ADMIN,
      },
      {
        title: "Thực đơn",
        url: PATHS.MENU_ITEMS,
        icon: UtensilsCrossed,
        roles: ADMIN_ONLY,
      },
      {
        title: "Thống kê F&B",
        url: PATHS.FNB_STATS,
        icon: BarChart3,
        roles: ADMIN_ONLY,
      },
      {
        title: "Mẫu tùy chọn",
        url: PATHS.CUSTOMIZATION_GROUP_TEMPLATES,
        icon: Settings2,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Khu cà phê",
    icon: Coffee,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Bàn cà phê",
        url: PATHS.COFFEE_TABLES,
        icon: Coffee,
        roles: ADMIN_ONLY,
      },
      {
        title: "Giá cà phê",
        url: PATHS.COFFEE_PRICING,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Nhân sự & tài khoản",
    icon: Users,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Lịch nhân viên",
        url: PATHS.STAFF_SCHEDULE,
        icon: Clock,
        roles: ADMIN_ONLY,
      },
      {
        title: "Nhân viên",
        url: PATHS.STAFF_MANAGEMENT,
        icon: Users,
        roles: ADMIN_ONLY,
      },
      {
        title: "Tài khoản",
        url: PATHS.USERS_MANAGEMENT,
        icon: Users,
        roles: ADMIN_ONLY,
      },
      {
        title: "Lỗi nhân viên",
        url: PATHS.STAFF_ERROR_LOGS,
        icon: BellRing,
        roles: ADMIN_ONLY,
      },
      {
        title: "Cấu hình lương",
        url: PATHS.STAFF_SALARY_CONFIG,
        icon: DollarSign,
        roles: ADMIN_ONLY,
      },
      {
        title: "Tuyển dụng",
        url: PATHS.RECRUITMENT,
        icon: UserPlus,
        roles: ADMIN_ONLY,
      },
    ],
  },
  {
    title: "Khách hàng & nội dung",
    icon: Sparkles,
    roles: ADMIN_ONLY,
    subItems: [
      {
        title: "Khuyến mãi",
        url: PATHS.PROMOTION,
        icon: PercentIcon,
        roles: ADMIN_ONLY,
      },
      {
        title: "Thành viên",
        url: PATHS.MEMBERSHIP_CONFIG,
        icon: Sparkles,
        roles: ADMIN_ONLY,
      },
      {
        title: "Quà tặng",
        url: PATHS.GIFTS,
        icon: Gift,
        roles: ADMIN_ONLY,
      },
      {
        title: "Trò chơi",
        url: PATHS.GAMES,
        icon: Gamepad2,
        roles: ADMIN_ONLY,
      },
      {
        title: "Bộ sưu tập nhạc",
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
