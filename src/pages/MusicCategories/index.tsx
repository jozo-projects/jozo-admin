import type { AdminMusicCategory } from "@/@types/MusicCategory";
import { DeleteModal, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useAdminMusicCategories,
  useDeleteMusicCategory,
  useReorderMusicCategories,
  useToggleMusicCategory,
} from "@/hooks/use-music-categories";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ListMusic, Plus, RefreshCcw } from "lucide-react";
import { useRef, useState } from "react";
import MusicCategoryRow from "./components/MusicCategoryRow";
import UpsertMusicCategoryDialog from "./components/UpsertMusicCategoryDialog";
import { reorderById } from "./utils/reorder";

export default function MusicCategoriesPage() {
  const query = useAdminMusicCategories();
  const toggleMutation = useToggleMusicCategory();
  const deleteMutation = useDeleteMusicCategory();
  const reorderMutation = useReorderMusicCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMusicCategory | null>(null);
  const [deleting, setDeleting] = useState<AdminMusicCategory | null>(null);
  const reorderInFlight = useRef(false);
  const categories = query.data ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dragEnd = (event: DragEndEvent) => {
    if (reorderInFlight.current || reorderMutation.isPending || !event.over) return;
    const reordered = reorderById(
      categories,
      String(event.active.id),
      String(event.over.id),
      (item) => item._id,
    );
    if (reordered !== categories) {
      reorderInFlight.current = true;
      reorderMutation.mutate(reordered, {
        onSettled: () => { reorderInFlight.current = false; },
      });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Danh mục nhạc"
        description="Tạo danh mục, đổi thứ tự và quản lý các bài hát hiển thị."
        icon={ListMusic}
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Tạo danh mục</Button>}
      />
      {query.isLoading ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Đang tải danh mục nhạc...</CardContent></Card>
      ) : query.isError ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-destructive">Không thể tải danh mục nhạc.</p>
          <Button variant="outline" onClick={() => void query.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Thử lại</Button>
        </CardContent></Card>
      ) : categories.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <ListMusic className="h-10 w-10" /><p>Chưa có danh mục nhạc nào.</p>
          <Button onClick={() => setDialogOpen(true)}>Tạo danh mục đầu tiên</Button>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="overflow-x-auto pt-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
            <SortableContext items={categories.map((item) => item._id)} strategy={verticalListSortingStrategy}>
              <Table>
                <TableHeader><TableRow><TableHead className="w-12" /><TableHead>Ảnh</TableHead><TableHead>Tên</TableHead><TableHead>Số bài</TableHead><TableHead>Trạng thái</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader>
                <TableBody>{categories.map((category) => (
                  <MusicCategoryRow
                    key={category._id}
                    category={category}
                    togglePending={toggleMutation.isPending && toggleMutation.variables?.id === category._id}
                    reorderPending={reorderMutation.isPending}
                    onToggle={(isActive) => toggleMutation.mutate({ id: category._id, isActive })}
                    onEdit={() => { setEditing(category); setDialogOpen(true); }}
                    onDelete={() => setDeleting(category)}
                  />
                ))}</TableBody>
              </Table>
            </SortableContext>
          </DndContext>
          {reorderMutation.isPending ? <p className="mt-3 text-sm text-muted-foreground">Đang lưu thứ tự...</p> : null}
        </CardContent></Card>
      )}
      <UpsertMusicCategoryDialog open={dialogOpen} category={editing} onClose={() => { setDialogOpen(false); setEditing(null); }} />
      <DeleteModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteMutation.mutateAsync(deleting._id);
          } catch {
            return;
          }
          setDeleting(null);
        }}
        title="Xóa danh mục nhạc"
        description={`Xóa “${deleting?.name ?? ""}”? Các liên kết bài hát sẽ được gỡ, nhưng bài hát vẫn còn trong thư viện.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}