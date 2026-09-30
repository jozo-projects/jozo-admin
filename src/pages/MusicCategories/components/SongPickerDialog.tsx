import type { Song } from "@/@types/RoomMusic";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssignCategorySongs } from "@/hooks/use-music-categories";
import { useSongsCollection } from "@/hooks/use-room-music";
import PaginationContainer from "@/pages/RecruitmentPage/components/PaginationContainer";
import { RefreshCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { isSongAssignedToCategory } from "../utils/songAssignment";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

interface Props {
  open: boolean;
  categoryId: string;
  assignedIds: Set<string>;
  onClose: () => void;
}

export default function SongPickerDialog({
  open,
  categoryId,
  assignedIds,
  onClose,
}: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [keyword]);
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setKeyword("");
      setDebouncedKeyword("");
      setPage(1);
      setPageSize(DEFAULT_PAGE_SIZE);
    }
  }, [open]);
  const query = useSongsCollection({
    page,
    limit: pageSize,
    keyword: debouncedKeyword || undefined,
  });
  const mutation = useAssignCategorySongs();
  const songs: Song[] = query.data?.result?.songs ?? [];
  const pagination = query.data?.result?.pagination;

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const submit = async () => {
    const assignedSongIds = new Set(
      songs
        .filter((song) =>
          isSongAssignedToCategory(song, categoryId, assignedIds),
        )
        .map((song) => song.video_id),
    );
    const videoIds = [...selectedIds].filter((id) => !assignedSongIds.has(id));
    if (!videoIds.length) return;
    try {
      await mutation.mutateAsync({ categoryId, videoIds });
    } catch {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !mutation.isPending && onClose()}
    >
      <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Thêm bài hát</DialogTitle>
          <DialogDescription>
            Tìm trong Songs Collection và chọn bài hát. Lựa chọn được giữ khi
            chuyển trang.
          </DialogDescription>
        </DialogHeader>
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm tên bài hát, tác giả hoặc video ID"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {query.isLoading ? (
            <p className="p-10 text-center text-muted-foreground">
              Đang tải thư viện...
            </p>
          ) : query.isError ? (
            <div className="flex flex-col items-center gap-3 p-10">
              <p className="text-destructive">
                Không thể tải thư viện bài hát.
              </p>
              <Button variant="outline" onClick={() => void query.refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : songs.length === 0 ? (
            <p className="p-10 text-center text-muted-foreground">
              Không tìm thấy bài hát phù hợp.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Ảnh</TableHead>
                  <TableHead>Bài hát</TableHead>
                  <TableHead>Tác giả</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {songs.map((song) => {
                  const assigned = isSongAssignedToCategory(
                    song,
                    categoryId,
                    assignedIds,
                  );
                  return (
                    <TableRow
                      key={song.video_id}
                      className={assigned ? "opacity-60" : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          disabled={assigned}
                          checked={assigned || selectedIds.has(song.video_id)}
                          aria-label={`Chọn ${song.title}`}
                          onCheckedChange={(checked) =>
                            toggle(song.video_id, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {song.thumbnail ? (
                          <img
                            src={song.thumbnail}
                            alt=""
                            className="h-10 w-14 rounded object-cover"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="min-w-[240px]">
                        <div className="font-medium line-clamp-2">
                          {song.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {song.video_id}
                        </div>
                      </TableCell>
                      <TableCell>{song.author || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {assigned
                          ? "Đã có trong danh mục"
                          : selectedIds.has(song.video_id)
                            ? "Đã chọn"
                            : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        {pagination && pagination.total > 0 ? (
          <div className="shrink-0 overflow-x-auto">
            <PaginationContainer
              currentPage={page}
              totalPages={pagination.totalPages}
              pageSize={pageSize}
              total={pagination.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
            />
          </div>
        ) : null}
        <DialogFooter className="shrink-0">
          <div className="mr-auto text-sm text-muted-foreground">
            Đã chọn {selectedIds.size} bài
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Hủy
          </Button>
          <Button
            disabled={!selectedIds.size || mutation.isPending}
            onClick={() => void submit()}
          >
            {mutation.isPending ? "Đang thêm..." : "Thêm bài hát"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
