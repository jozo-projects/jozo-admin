import type { CategorySong } from "@/@types/MusicCategory";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import AssignedSongRow from "./AssignedSongRow";

interface Props {
  songs: CategorySong[];
  selectedIds: Set<string>;
  reorderDisabled: boolean;
  onSelectionChange: (ids: Set<string>) => void;
  onDragEnd: (event: DragEndEvent) => void;
}

export default function AssignedSongsTable({
  songs,
  selectedIds,
  reorderDisabled,
  onSelectionChange,
  onDragEnd,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const allSelected = songs.length > 0 && songs.every((song) => selectedIds.has(song.video_id));
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={songs.map((song) => song.video_id)} strategy={verticalListSortingStrategy}>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10"><Checkbox checked={allSelected} aria-label="Chọn tất cả bài đang hiển thị" onCheckedChange={(checked) => {
              const next = new Set(selectedIds);
              songs.forEach((song) => checked === true ? next.add(song.video_id) : next.delete(song.video_id));
              onSelectionChange(next);
            }} /></TableHead>
            <TableHead className="w-10" /><TableHead>Ảnh</TableHead><TableHead>Bài hát</TableHead><TableHead>Tác giả</TableHead><TableHead>Thời lượng</TableHead>
          </TableRow></TableHeader>
          <TableBody>{songs.map((song) => (
            <AssignedSongRow
              key={song.video_id}
              song={song}
              selected={selectedIds.has(song.video_id)}
              reorderDisabled={reorderDisabled}
              onSelectedChange={(selected) => {
                const next = new Set(selectedIds);
                if (selected) next.add(song.video_id); else next.delete(song.video_id);
                onSelectionChange(next);
              }}
            />
          ))}</TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  );
}