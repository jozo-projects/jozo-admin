import type { Song } from "@/@types/RoomMusic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminMusicCategories,
  useAssignCategorySongs,
} from "@/hooks/use-music-categories";
import { useEffect, useMemo, useState } from "react";

interface Props {
  open: boolean;
  songs: Song[];
  onClose: () => void;
  onAssigned: () => void;
}

export default function AddSongsToCategoryDialog({
  open,
  songs,
  onClose,
  onAssigned,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  const categoriesQuery = useAdminMusicCategories();
  const assignMutation = useAssignCategorySongs();
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  useEffect(() => {
    if (open) setCategoryId("");
  }, [open]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category._id === categoryId),
    [categories, categoryId],
  );
  const assignableSongs = useMemo(
    () =>
      songs.filter(
        (song) =>
          !song.categories?.some(
            (assignment) => assignment.categoryId === categoryId,
          ),
      ),
    [categoryId, songs],
  );

  const submit = async () => {
    if (!categoryId || !assignableSongs.length) return;
    try {
      await assignMutation.mutateAsync({
        categoryId,
        videoIds: assignableSongs.map((song) => song.video_id),
      });
      onAssigned();
      onClose();
    } catch {
      // Toast lỗi được xử lý trong mutation hook.
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && !assignMutation.isPending && onClose()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm bài hát vào danh mục</DialogTitle>
          <DialogDescription>
            Chọn danh mục có sẵn cho {songs.length} bài hát đã chọn. Bài đã có
            trong danh mục sẽ được tự động bỏ qua.
          </DialogDescription>
        </DialogHeader>

        {categoriesQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Đang tải danh sách danh mục...
          </p>
        ) : categoriesQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            Không thể tải danh sách danh mục.
          </p>
        ) : categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Chưa có danh mục nào. Hãy tạo danh mục trước.
          </p>
        ) : (
          <div className="space-y-3">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger aria-label="Chọn danh mục">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name} ({category.songCount} bài)
                    {!category.isActive ? " · Đang tắt" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategory ? (
              <p className="text-sm text-muted-foreground">
                {assignableSongs.length > 0
                  ? `Sẽ thêm ${assignableSongs.length} bài vào “${selectedCategory.name}”.`
                  : "Các bài hát đã chọn đều đã có trong danh mục này."}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={assignMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={
              !categoryId ||
              !assignableSongs.length ||
              categoriesQuery.isLoading ||
              assignMutation.isPending
            }
          >
            {assignMutation.isPending ? "Đang thêm..." : "Thêm vào danh mục"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
