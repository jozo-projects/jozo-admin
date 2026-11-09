import type { IRoom } from "@/@types/Room";
import roomsMusicApis from "@/apis/roomMusic.apis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";

export default function MoveQueueDialog({ open, onOpenChange, rooms, initialSource }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: IRoom[];
  initialSource: string;
}) {
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState("");
  const { toast } = useToast();
  const queue = useQuery({
    queryKey: ["move-queue-preview", source],
    queryFn: async () => {
      const songs = (await roomsMusicApis.getQueue(source)).data.result?.queue;
      if (!Array.isArray(songs)) throw new Error("Không tải được danh sách bài hát");
      return songs;
    },
    enabled: open && !!source,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const move = useMutation({
    mutationFn: () => roomsMusicApis.moveQueue(source, { targetRoomId: target }),
    onSuccess: (response) => {
      const count = response.data.result?.movedCount;
      if (typeof count !== "number") {
        toast({ title: "Chưa xác nhận được kết quả", description: "Hãy kiểm tra danh sách ở cả hai phòng trước khi thử lại.", variant: "destructive" });
        return;
      }
      toast({ title: count ? `Đã chuyển ${count} bài hát` : "Không có bài chờ để chuyển", description: count ? "Các bài được nối vào cuối danh sách phòng đích." : "Danh sách phòng nguồn có thể đã thay đổi." });
      void queue.refetch();
      if (count) { setSource(""); setTarget(""); onOpenChange(false); }
    },
    onError: (error) => {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      toast({ title: "Không thể chuyển danh sách", description: typeof message === "string" ? message : "Vui lòng thử lại.", variant: "destructive" });
    },
  });
  const changeOpen = (next: boolean) => {
    if (move.isPending) return;
    if (!next) { setSource(""); setTarget(""); }
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chuyển danh sách bài hát</DialogTitle>
          <DialogDescription>Chọn hai phòng bất kỳ, kể cả sau khi đã đổi phòng.</DialogDescription>
        </DialogHeader>
        {rooms.length === 0 ? <p className="text-sm text-muted-foreground">Chưa tải được danh sách phòng. Vui lòng đóng và thử lại.</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><label className="text-sm font-medium">Chuyển từ phòng</label>
              <Select value={source} onValueChange={(value) => { setSource(value); if (target === value) setTarget(""); }}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng nguồn" /></SelectTrigger>
                <SelectContent>{rooms.map((room) => <SelectItem key={room.roomId} value={String(room.roomId)}>{room.roomName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Đến phòng</label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Chọn phòng đích" /></SelectTrigger>
                <SelectContent>{rooms.filter((room) => String(room.roomId) !== source).map((room) => <SelectItem key={room.roomId} value={String(room.roomId)}>{room.roomName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}
        {source && <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">Bài đang chờ {queue.data ? `(${queue.data.length})` : ""}</p><Button variant="ghost" size="sm" disabled={queue.isFetching} onClick={() => void queue.refetch()}>Làm mới</Button></div>
          {queue.isLoading || queue.isFetching ? <p className="text-sm text-muted-foreground">Đang tải danh sách...</p> : queue.isError ? <p className="text-sm text-destructive">Không tải được danh sách. Hãy thử lại.</p> : queue.data?.length ? <ol className="max-h-56 space-y-1 overflow-y-auto text-sm">{queue.data.map((song, index) => <li key={`${song.video_id}-${index}`} className="flex gap-2"><span className="text-muted-foreground">{index + 1}.</span><span className="break-words">{song.title || "Bài hát không có tên"}</span></li>)}</ol> : <p className="text-sm text-muted-foreground">Phòng này không có bài đang chờ.</p>}
        </div>}
        <p className="text-xs text-muted-foreground">Chỉ chuyển bài đang chờ, nối vào cuối danh sách phòng đích. Bài đang phát không bị chuyển. Danh sách có thể thay đổi trong lúc thao tác.</p>
        <DialogFooter>
          <Button variant="outline" disabled={move.isPending} onClick={() => changeOpen(false)}>Đóng</Button>
          <Button disabled={!source || !target || queue.isFetching || queue.isError || !queue.data?.length || move.isPending} onClick={() => move.mutate()}>{move.isPending ? "Đang chuyển..." : "Chuyển danh sách"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
