import { INotification } from "@/@types/Notification";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
  NOTIFICATION_QUERY_KEYS,
} from "@/hooks/use-notifications";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { useQueryClient } from "@tanstack/react-query";

import { timeAgo } from "@/lib/dayjs";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  Loader2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDeleteNotification } from "@/hooks/use-notifications";
import { useNavigate } from "@tanstack/react-router";
import PATHS from "@/constants/paths";

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch notifications (unread count tính từ danh sách đã fetch)
  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    limit: 10,
  });

  // Mutations
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead } = useMarkAllAsRead();
  const { mutate: deleteNotification } = useDeleteNotification();


  // Socket
  const { onNewNotification, offNewNotification } = useSocket();

  // Listen for new notifications via socket
  useEffect(() => {
    const handleNewNotification = (notification: INotification) => {
      console.log("Nhận notification mới:", notification);

      // Show toast
      toast({
        title: notification.title,
        description: notification.body,
        duration: 5000,
      });

      // Invalidate queries để refetch
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_QUERY_KEYS.all,
      });
    };

    onNewNotification(handleNewNotification);

    return () => {
      offNewNotification(handleNewNotification);
    };
  }, [onNewNotification, offNewNotification, toast, queryClient]);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: INotification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate to my-schedule page with scheduleId if available
    if (notification.data?.scheduleId) {
      setIsOpen(false); // Close dropdown
      navigate({
        to: `${PATHS.MY_SCHEDULE}?scheduleId=${notification.data.scheduleId}` as never,
      });
    }
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllAsRead();
  };

  const handleDeleteNotification = (
    e: React.MouseEvent,
    notificationId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const getNotificationIcon = (notification: INotification) => {
    switch (notification.type) {
      case "schedule_approved":
        return <CalendarCheck className="h-4 w-4 text-green-600" />;
      case "schedule_rejected":
        return <CalendarX className="h-4 w-4 text-red-600" />;
      case "schedule_assigned":
      case "schedule_registered":
      case "schedule_created_by_employee":
      case "schedule_status_updated":
        return <CalendarClock className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Thông báo"
          title="Thông báo"
          className="relative text-foreground opacity-100 hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Thông báo</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-7 gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Không có thông báo mới
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-2">
              {notifications.map((notification: INotification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "relative rounded-lg p-3 cursor-pointer transition-colors hover:bg-accent group",
                    !notification.isRead && "bg-blue-50 hover:bg-blue-100",
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium line-clamp-1",
                            !notification.isRead && "font-semibold",
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.body}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) =>
                            handleDeleteNotification(e, notification._id)
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <Separator />
            <DropdownMenuItem
              className="justify-center cursor-pointer"
              onClick={() => {
                setIsOpen(false);
                navigate({ to: PATHS.NOTIFICATIONS as never });
              }}
            >
              <span className="text-sm text-primary">Xem tất cả</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
