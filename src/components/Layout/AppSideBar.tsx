import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuItem } from "@/constants/menuItems";
import PATHS from "@/constants/paths";
import retailSaleApis from "@/apis/retailSale.apis";
import fnbShiftCountApis from "@/apis/fnbShiftCount.apis";
import roomApis from "@/apis/room.apis";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import useAuth from "@/hooks/useAuth";
import { useMenuItems } from "@/hooks/useMenuItems";
import { cn } from "@/lib/utils";
import { ChevronRight, Settings, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { fnbShiftCountQueryKey } from "@/pages/FnbShiftCount/hooks/useFnbShiftCount";
import { getFnbBusinessDate } from "@/pages/FnbShiftCount/utils";
import {
  getDefaultBusinessDate,
} from "@/pages/RoomSchedule/utils/timelineHours";
import { getRoomSchedulesQueryKey } from "@/hooks/room-schedule";
import { JozoLogo } from "../shared/JozoLogo";
import { LogoutButton } from "../shared/LogoutButton";

export function AppSidebar() {
  const { setOpenMobile, state, isMobile } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const menuItems = useMenuItems();
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const closeMobileSidebar = () => {
    setOpenMobile(false);
  };

  const isActive = (url?: string) => {
    if (!url) return false;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const hasActiveChild = (item: MenuItem) => {
    return item.subItems?.some((subItem) => isActive(subItem.url)) ?? false;
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const prefetchRouteData = (url?: string) => {
    if (url === "/") {
      const today = getDefaultBusinessDate();
      const tomorrow = today.add(1, "day");

      void queryClient.prefetchQuery({
        queryKey: ["rooms"],
        queryFn: async () => (await roomApis.getRooms()).data.result ?? [],
      });

      for (const date of [today, tomorrow]) {
        const queryKey = getRoomSchedulesQueryKey(date);
        void queryClient.prefetchQuery({
          queryKey,
          queryFn: async () => {
            const response = await roomsScheduleApis.getRoomSchedules(queryKey[1]);
            return response.data.result ?? [];
          },
        });
      }
    }

    if (url === PATHS.RETAIL_SALES) {
      void queryClient.prefetchQuery({
        queryKey: ["retail-products"],
        queryFn: async () => (await retailSaleApis.getProducts()).data.result || [],
        staleTime: 60_000,
      });
    }

    if (url === PATHS.FNB_SHIFT_COUNT) {
      const date = getFnbBusinessDate();

      void queryClient.prefetchQuery({
        queryKey: fnbShiftCountQueryKey.detail(date),
        queryFn: () => fnbShiftCountApis.getShiftCount({ date }),
        staleTime: Infinity,
      });

      void queryClient.prefetchQuery({
        queryKey: fnbShiftCountQueryKey.template(),
        queryFn: () => fnbShiftCountApis.getItemsTemplate(),
        staleTime: 5 * 60 * 1000,
      });
    }
  };

  const quickAccessItems = menuItems.filter(
    (item) => !item.subItems || item.subItems.length === 0,
  );
  const managementGroups = menuItems.filter(
    (item) => item.subItems && item.subItems.length > 0,
  );

  const menuButtonClassName = cn(
    "relative rounded-lg font-medium",
    isMobile ? "h-11 text-[15px]" : "h-9",
  );

  const activeMenuButtonClassName =
    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-sm data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:h-5 data-[active=true]:before:w-1 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-primary";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="rounded-xl">
              <Link
                to="/"
                preload="intent"
                onMouseEnter={() => prefetchRouteData("/")}
                onFocus={() => prefetchRouteData("/")}
                onClick={closeMobileSidebar}
              >
                <JozoLogo
                  showText={state !== "collapsed" || isMobile}
                  iconClassName="size-8 rounded-lg"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2 py-2">
        {quickAccessItems.length > 0 && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wide">
              Quick access
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {quickAccessItems.map((item: MenuItem) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className={cn(
                        menuButtonClassName,
                        activeMenuButtonClassName,
                      )}
                    >
                      <Link
                        to={item.url || "#"}
                        preload="intent"
                        onMouseEnter={() => prefetchRouteData(item.url)}
                        onFocus={() => prefetchRouteData(item.url)}
                        onClick={closeMobileSidebar}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {quickAccessItems.length > 0 && managementGroups.length > 0 && (
          <SidebarSeparator className="my-2" />
        )}

        {managementGroups.length > 0 && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-wide">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {managementGroups.map((group: MenuItem) => {
                  const isGroupActive =
                    isActive(group.url) || hasActiveChild(group);
                  const isOpen = openGroups[group.title] ?? isGroupActive;

                  return (
                    <SidebarMenuItem key={group.title}>
                      <SidebarMenuButton
                        tooltip={group.title}
                        isActive={isGroupActive}
                        onClick={() => toggleGroup(group.title)}
                        className={cn(
                          menuButtonClassName,
                          activeMenuButtonClassName,
                        )}
                        aria-expanded={isOpen}
                      >
                        <group.icon />
                        <span>{group.title}</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto transition-transform duration-200",
                            isOpen && "rotate-90",
                          )}
                        />
                      </SidebarMenuButton>

                      {isOpen && (
                        <SidebarMenuSub className="mx-4 my-1 gap-1 border-sidebar-border/70 pr-0">
                          {group.subItems?.map((subItem: MenuItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(subItem.url)}
                                className={cn(
                                  "rounded-lg",
                                  isMobile ? "h-10 text-sm" : "h-8",
                                )}
                              >
                                <Link
                                  to={subItem.url || "#"}
                                  preload="intent"
                                  onMouseEnter={() => prefetchRouteData(subItem.url)}
                                  onFocus={() => prefetchRouteData(subItem.url)}
                                  onClick={closeMobileSidebar}
                                >
                                  <subItem.icon />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-xl data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.avatar || "https://github.com/shadcn.png"}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={state === "collapsed" ? "right" : "bottom"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={user?.avatar || "https://github.com/shadcn.png"}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback className="rounded-lg">
                        {user?.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name || "User"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email || "user@example.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    to={PATHS.PROFILE as never}
                    preload="intent"
                    onClick={closeMobileSidebar}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to={PATHS.CHANGE_PASSWORD as never}
                    preload="intent"
                    onClick={closeMobileSidebar}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <div>
                    <LogoutButton
                      variant="ghost"
                      className="h-auto w-full justify-start p-0 font-normal"
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
