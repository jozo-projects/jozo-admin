import type { AdminMusicCategory } from "@/@types/MusicCategory";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit, GripVertical, ListMusic, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Props {
  category: AdminMusicCategory;
  togglePending: boolean;
  reorderPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
}

export default function MusicCategoryRow({
  category,
  togglePending,
  reorderPending,
  onEdit,
  onDelete,
  onToggle,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category._id, disabled: reorderPending });
  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 bg-background shadow" : undefined}
    >
      <TableCell className="w-12">
        <button
          type="button"
          disabled={reorderPending}
          aria-label={`Kéo để sắp xếp ${category.name}`}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground enabled:hover:bg-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          {...attributes}
          {...listeners}
        ><GripVertical className="h-5 w-5" /></button>
      </TableCell>
      <TableCell>
        <img src={category.imageUrl} alt={category.name} className="h-14 w-20 rounded-md border object-cover" />
      </TableCell>
      <TableCell>
        <Link preload="intent" to="/music-categories/$categoryId" params={{ categoryId: category._id }} className="font-medium hover:underline">
          {category.name}
        </Link>
        <div className="text-xs text-muted-foreground">{category.slug}</div>
      </TableCell>
      <TableCell>{category.songCount.toLocaleString("vi-VN")}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={category.isActive}
            disabled={togglePending}
            aria-label={`Trạng thái ${category.name}`}
            onCheckedChange={onToggle}
          />
          <span className="text-sm">{category.isActive ? "Đang bật" : "Đang tắt"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon" title="Quản lý bài hát">
            <Link preload="intent" to="/music-categories/$categoryId" params={{ categoryId: category._id }}><ListMusic className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" title="Sửa" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Xóa" className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}