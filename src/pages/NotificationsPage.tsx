import { INotification } from "@/@types/Notification";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import PATHS from "@/constants/paths";
import {
  useDeleteNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { formatUTCToLocal, timeAgo } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import {
  Bell,
  CalendarCheck,
  CalendarClock,

  CheckCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "@tanstack/react-router";

const ITEMS_PER_PAGE = 20;

function NotificationsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { data: notificationsData, isLoading } = useNotifications({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: markAllAsRead } = useMarkAllAsRead();
  const { mutate: deleteNotification } = useDeleteNotification();

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const totalPages = notificationsData?.totalPages || 1;
  const total = notificationsData?.total || 0;

  const handleNotificationClick = (notification: INotification) => {
    if (!notification.isRead) markAsRead(notification._id);
    if (notification.data?.scheduleId) {
      router.navigate({ to: PATHS.MY_SCHEDULE as never, search: { scheduleId: notification.data.scheduleId } as never });
    }
  };

  const getNotificationIcon = (notification: INotification) => {
    switch (notification.type) {
      case "schedule_assigned":
      case "schedule_registered":
      case "schedule_created_by_employee":
        return <CalendarCheck className="h-5 w-5 text-green-600" />;
      case "schedule_status_updated":
        return <CalendarClock className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleDeleteNotification = (
    event: React.MouseEvent,
    notificationId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    const visiblePages = pages.length <= 5 ? pages : pages.slice(0, 4);

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          {visiblePages.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          {pages.length > 5 && (
            <>
              <PaginationItem><PaginationEllipsis /></PaginationItem>
              <PaginationItem><PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink></PaginationItem>
            </>
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <PageHeader
        title="Tất cả thông báo"
        description={`${total} thông báo${unreadCount > 0 ? ` • ${unreadCount} chưa đọc` : ""}`}
        icon={Bell}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="mb-1 text-lg font-semibold">Không có thông báo</h3>
              <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2">
                  {notifications.map((notification: INotification) => (
                    <div
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "group relative cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md",
                        !notification.isRead
                          ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                          : "border-gray-200 bg-white hover:bg-gray-50",
                      )}
                    >
                      <div className="flex gap-4">
                        <div className="mt-1 shrink-0">{getNotificationIcon(notification)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h4 className={cn("text-base font-medium", !notification.isRead && "font-semibold")}>
                              {notification.title}
                            </h4>
                            <div className="flex shrink-0 items-center gap-2">
                              {!notification.isRead && <Badge variant="default" className="h-2 w-2 rounded-full p-0" />}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(event) => handleDeleteNotification(event, notification._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="mb-3 text-sm text-muted-foreground">{notification.body}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{formatUTCToLocal(notification.createdAt)}</span>
                            <span>{timeAgo(notification.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationsPage;
