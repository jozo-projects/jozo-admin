import { IMessengerMessage } from "@/@types/MessengerMessage";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Role } from "@/constants/enum";
import { useDeleteMessengerMessage, useMessengerMessages } from "@/hooks/use-messenger-messages";
import useAuth from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { formatUTCToLocal } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { MessageCircle, Search, Trash2 } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

const ITEMS_PER_PAGE = 20;

function MessengerMessagesPage() {
  const { user } = useAuth();
  const href = useRouterState({ select: (state) => state.location.href });
  const consumedHref = useRef<string | null>(null);
  const isAdmin = user?.role === Role.Admin;
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [messageToDelete, setMessageToDelete] = useState<IMessengerMessage | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [flashToken, setFlashToken] = useState(0);
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useMessengerMessages({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteMessengerMessage();

  const messages = data?.messages ?? [];
  const totalPages = data?.totalPages ?? 1;
  const highlightedMessageId = useMemo(() => {
    if (!highlightKey || messages.length === 0) return null;
    if (highlightKey === "latest") return messages[0]._id;
    const match = messages.find(
      (message) => message._id === highlightKey || message.messageId === highlightKey,
    );
    return (match ?? messages[0])._id;
  }, [highlightKey, messages]);

  useEffect(() => {
    if (consumedHref.current === href) return;
    const params = new URLSearchParams(window.location.search);
    const messageId = params.get("messageId");
    const highlight = params.get("highlight");
    if (!messageId && highlight !== "latest") return;
    consumedHref.current = href;
    setHighlightKey(messageId || "latest");
    setFlashToken((token) => token + 1);
    const url = new URL(window.location.href);
    url.searchParams.delete("messageId");
    url.searchParams.delete("highlight");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, [href]);

  useEffect(() => {
    if (!highlightedMessageId || isLoading) return;
    document.getElementById(`messenger-message-${highlightedMessageId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [highlightedMessageId, flashToken, isLoading]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleDelete = () => {
    if (!messageToDelete) return;
    deleteMutation.mutate(messageToDelete._id, {
      onSuccess: () => {
        toast({ title: "Đã xoá tin nhắn nội bộ" });
        setMessageToDelete(null);
      },
    });
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <PageHeader
        title="Tin nhắn Facebook"
        description={`${data?.total ?? 0} tin nhắn đã lưu trong Jozo`}
        icon={MessageCircle}
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex max-w-md items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Tìm nội dung hoặc người gửi..."
              aria-label="Tìm tin nhắn Facebook"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Chưa có tin nhắn</h3>
              <p className="text-sm text-muted-foreground">Tin nhắn nhận từ webhook sẽ xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={
                    message._id === highlightedMessageId
                      ? `${message._id}-${flashToken}`
                      : message._id
                  }
                  id={`messenger-message-${message._id}`}
                  className={cn(
                    "rounded-lg border p-4",
                    message._id === highlightedMessageId && "animate-messenger-border-fade",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Messenger</Badge>
                        <span className="text-xs text-muted-foreground">Người gửi: {message.senderId}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatUTCToLocal(message.receivedAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                      {isAdmin && (
                        <p className="mt-2 text-xs text-muted-foreground">Message ID: {message.messageId}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive"
                        aria-label="Xoá tin nhắn nội bộ"
                        onClick={() => setMessageToDelete(message)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Trang trước
              </Button>
              <span className="text-sm text-muted-foreground">Trang {currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Trang sau
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(messageToDelete)} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá tin nhắn nội bộ?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này chỉ xoá bản ghi khỏi Jozo, không xoá tin nhắn trên Facebook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                handleDelete();
              }}
            >
              {deleteMutation.isPending ? "Đang xoá..." : "Xoá nội bộ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MessengerMessagesPage;
