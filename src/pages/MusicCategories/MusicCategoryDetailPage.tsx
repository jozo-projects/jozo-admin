import type { CategorySong } from "@/@types/MusicCategory";
import { DeleteModal, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useAdminCategorySongs,
  useMusicCategory,
  useRemoveCategorySongs,
  useReorderCategorySongs,
  useToggleMusicCategory,
} from "@/hooks/use-music-categories";
import type { DragEndEvent } from "@dnd-kit/core";
import { AlertTriangle, ListMusic, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AssignedSongsTable from "./components/AssignedSongsTable";
import SongPickerDialog from "./components/SongPickerDialog";
import { canReorderFullList, reorderById } from "./utils/reorder";

const ADMIN_SONG_LIMIT = 500;

export default function MusicCategoryDetailPage() {
  const { categoryId = "" } = useParams();
  const categoryQuery = useMusicCategory(categoryId);
  const songsQuery = useAdminCategorySongs(categoryId, { page: 1, limit: ADMIN_SONG_LIMIT });
  const removeMutation = useRemoveCategorySongs();
  const reorderMutation = useReorderCategorySongs();
  const toggleMutation = useToggleMusicCategory();
  const [songs, setSongs] = useState<CategorySong[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const category = categoryQuery.data;
  const pagination = songsQuery.data?.pagination;

  useEffect(() => {
    if (songsQuery.data) setSongs(songsQuery.data.songs);
  }, [songsQuery.data]);

  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const visibleSongs = useMemo(
    () => normalizedSearch
      ? songs.filter((song) =>
          [song.title, song.author, song.video_id].some((value) =>
            value?.toLocaleLowerCase("vi").includes(normalizedSearch),
          ),
        )
      : songs,
    [normalizedSearch, songs],
  );
  const fullListLoaded = canReorderFullList(
    songs.length,
    pagination?.total ?? 0,
    ADMIN_SONG_LIMIT,
  );
  const reorderDisabled = !fullListLoaded || Boolean(normalizedSearch) || reorderMutation.isPending;
  const assignedIds = useMemo(() => new Set(songs.map((song) => song.video_id)), [songs]);

  const dragEnd = (event: DragEndEvent) => {
    if (reorderDisabled || !event.over) return;
    const reordered = reorderById(
      songs,
      String(event.active.id),
      String(event.over.id),
      (song) => song.video_id,
    );
    if (reordered === songs) return;
    setSongs(reordered);
    reorderMutation.mutate(
      { categoryId, videoIds: reordered.map((song) => song.video_id) },
      { onError: () => setSongs(songs) },
    );
  };

  const removeSelected = async () => {
    if (!selectedIds.size) return;
    try {
      await removeMutation.mutateAsync({ categoryId, videoIds: [...selectedIds] });
    } catch {
      return;
    }
    setSelectedIds(new Set());
    setRemoveConfirmOpen(false);
  };

  if (categoryQuery.isLoading) {
    return <Card className="mt-6"><CardContent className="py-16 text-center text-muted-foreground">Đang tải danh mục...</CardContent></Card>;
  }
  if (categoryQuery.isError || (!category && categoryQuery.isSuccess)) {
    return <Card className="mt-6"><CardContent className="flex flex-col items-center gap-3 py-16"><p className="text-destructive">Không tìm thấy hoặc không thể tải danh mục.</p><Button variant="outline" onClick={() => void categoryQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Thử lại</Button></CardContent></Card>;
  }
  if (!category) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={category.name}
        description={`${pagination?.total ?? category.songCount} bài hát trong danh mục`}
        icon={ListMusic}
        showBackButton
        backUrl="/music-categories"
        actions={<Button onClick={() => setPickerOpen(true)}><Plus className="mr-2 h-4 w-4" />Thêm bài hát</Button>}
      />
      <Card><CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
        <img src={category.imageUrl} alt={category.name} className="h-24 w-36 rounded-lg border object-cover" />
        <div className="min-w-0 flex-1"><p className="font-semibold">{category.name}</p><p className="text-sm text-muted-foreground">/{category.slug}</p></div>
        <div className="flex items-center gap-2"><Switch checked={category.isActive} disabled={toggleMutation.isPending} onCheckedChange={(isActive) => toggleMutation.mutate({ id: categoryId, isActive })} /><span className="text-sm">{category.isActive ? "Đang bật" : "Đang tắt"}</span></div>
      </CardContent></Card>
      <Card><CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Tìm trong danh mục" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <Button variant="destructive" disabled={!selectedIds.size || removeMutation.isPending} onClick={() => setRemoveConfirmOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Bỏ khỏi danh mục ({selectedIds.size})</Button>
        </div>
        {!fullListLoaded && pagination ? <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>Danh mục có {pagination.total} bài nhưng chỉ tải được {songs.length}. Chức năng kéo thả đã tắt để không làm sai thứ tự toàn bộ danh sách.</span></div> : null}
        {normalizedSearch && songs.length > 1 ? <p className="text-xs text-muted-foreground">Tắt tìm kiếm để kéo thả thứ tự bài hát.</p> : null}
        {songsQuery.isLoading ? <p className="py-12 text-center text-muted-foreground">Đang tải bài hát...</p> : songsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-12"><p className="text-destructive">Không thể tải bài hát trong danh mục.</p><Button variant="outline" onClick={() => void songsQuery.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Thử lại</Button></div>
        ) : songs.length === 0 ? <div className="py-12 text-center text-muted-foreground"><p>Danh mục chưa có bài hát.</p><Button className="mt-3" variant="outline" onClick={() => setPickerOpen(true)}>Thêm bài hát</Button></div>
        : visibleSongs.length === 0 ? <p className="py-12 text-center text-muted-foreground">Không tìm thấy bài hát phù hợp.</p>
        : <div className="overflow-x-auto"><AssignedSongsTable songs={visibleSongs} selectedIds={selectedIds} reorderDisabled={reorderDisabled} onSelectionChange={setSelectedIds} onDragEnd={dragEnd} /></div>}
        {reorderMutation.isPending ? <p className="text-sm text-muted-foreground">Đang lưu thứ tự...</p> : null}
      </CardContent></Card>
      <SongPickerDialog open={pickerOpen} categoryId={categoryId} assignedIds={assignedIds} onClose={() => setPickerOpen(false)} />
      <DeleteModal isOpen={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)} onConfirm={() => void removeSelected()} title="Bỏ bài hát khỏi danh mục" description={`Bỏ ${selectedIds.size} bài hát đã chọn khỏi “${category.name}”? Các bài hát vẫn còn trong Songs Collection.`} isLoading={removeMutation.isPending} />
    </div>
  );
}