import type { INotification, NotificationType } from "@/@types/Notification";
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
import PATHS from "@/constants/paths";
import {
  NOTIFICATION_QUERY_KEYS,
  useDeleteNotification,
  useMarkAsRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { useSocket } from "@/hooks/useSocket";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CheckCheck, Inbox, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const MESSENGER_NOTIFICATION_TYPE =
  "messenger_message_received" as NotificationType;

const isMessengerNotification = (notification: INotification) =>
  notification.type === MESSENGER_NOTIFICATION_TYPE;

const getMessengerMessageKey = (notification: INotification) => {
  const data = notification.data;
  if (!data) return null;
  const candidates = [data.messageId, data.messengerMessageId, data.facebookMessageId];
  const found = candidates.find((value) => typeof value === "string" && value.length > 0);
  return found ? String(found) : null;
};

const playMessengerChime = () => {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    void context.resume();
    const now = context.currentTime;
    const playTone = (frequency: number, start: number, duration: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    playTone(880, now, 0.16);
    playTone(1175, now + 0.14, 0.2);
    window.setTimeout(() => {
      void context.close();
    }, 600);
  } catch {
    // Trình duyệt có thể chặn âm thanh trước tương tác đầu tiên của người dùng.
  }
};

export const MessengerInbox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    limit: 10,
    type: MESSENGER_NOTIFICATION_TYPE,
  });
  const { mutate: markAsRead } = useMarkAsRead();
  const { mutate: deleteNotification } = useDeleteNotification();
  const { onNewNotification, offNewNotification } = useSocket();

  useEffect(() => {
    const handleNewNotification = (notification: INotification) => {
      if (!isMessengerNotification(notification)) return;

      playMessengerChime();
      toast({
        title: notification.title,
        description: notification.body,
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: NOTIFICATION_QUERY_KEYS.all,
      });
    };

    onNewNotification(handleNewNotification);
    return () => {
      offNewNotification(handleNewNotification);
    };
  }, [onNewNotification, offNewNotification, toast, queryClient]);

  const notifications = (notificationsData?.notifications || []).filter(
    isMessengerNotification,
  );
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  const openFacebookMessages = (notification: INotification) => {
    if (!notification.isRead) markAsRead(notification._id);
    setIsOpen(false);
    const messageKey = getMessengerMessageKey(notification);
    const search = messageKey
      ? `messageId=${encodeURIComponent(messageKey)}`
      : "highlight=latest";
    navigate({ to: `${PATHS.MESSENGER_MESSAGES}?${search}` as never });
  };

  const handleMarkVisibleAsRead = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    notifications
      .filter((notification) => !notification.isRead)
      .forEach((notification) => markAsRead(notification._id));
  };

  const handleDeleteNotification = (event: React.MouseEvent, notificationId: string) => {
    event.preventDefault();
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tin nhắn Messenger"
          title="Tin nhắn Messenger"
          className="relative text-foreground opacity-100 hover:bg-accent hover:text-foreground"
        >
          <Inbox className="h-5 w-5 shrink-0" strokeWidth={2.25} />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center bg-blue-600 p-0 text-xs hover:bg-blue-600">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Messenger</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkVisibleAsRead}
              className="h-7 gap-1 text-xs"
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
            <Inbox className="mb-2 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Không có tin nhắn mới</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-2">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => openFacebookMessages(notification)}
                  className={cn(
                    "group relative cursor-pointer rounded-lg p-3 transition-colors hover:bg-accent",
                    !notification.isRead && "bg-blue-50 hover:bg-blue-100",
                  )}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">
                      <Inbox className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "line-clamp-1 text-sm font-medium",
                            !notification.isRead && "font-semibold",
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(event) =>
                            handleDeleteNotification(event, notification._id)
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
              className="cursor-pointer justify-center"
              onClick={() => {
                setIsOpen(false);
                navigate({ to: PATHS.MESSENGER_MESSAGES as never });
              }}
            >
              <span className="text-sm text-primary">Xem tất cả tin nhắn</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
