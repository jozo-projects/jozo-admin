import type { CategorySong } from "@/@types/MusicCategory";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Music } from "lucide-react";

interface Props {
  song: CategorySong;
  selected: boolean;
  reorderDisabled: boolean;
  onSelectedChange: (selected: boolean) => void;
}

const formatDuration = (seconds?: number) => {
  if (seconds == null) return "-";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.round(seconds % 60).toString().padStart(2, "0")}`;
};

export default function AssignedSongRow({
  song,
  selected,
  reorderDisabled,
  onSelectedChange,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.video_id, disabled: reorderDisabled });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 bg-background shadow" : undefined}
    >
      <TableCell><Checkbox checked={selected} aria-label={`Chọn ${song.title}`} onCheckedChange={(value) => onSelectedChange(value === true)} /></TableCell>
      <TableCell>
        <button
          type="button"
          disabled={reorderDisabled}
          aria-label={`Kéo để sắp xếp ${song.title}`}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground enabled:hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          {...attributes}
          {...listeners}
        ><GripVertical className="h-5 w-5" /></button>
      </TableCell>
      <TableCell>
        {song.thumbnail ? <img src={song.thumbnail} alt="" className="h-12 w-16 rounded object-cover" /> : <div className="flex h-12 w-16 items-center justify-center rounded bg-muted"><Music className="h-5 w-5" /></div>}
      </TableCell>
      <TableCell className="min-w-[260px]"><div className="font-medium line-clamp-2">{song.title}</div><div className="text-xs text-muted-foreground">{song.video_id}</div></TableCell>
      <TableCell>{song.author || "-"}</TableCell>
      <TableCell>{formatDuration(song.duration)}</TableCell>
    </TableRow>
  );
}