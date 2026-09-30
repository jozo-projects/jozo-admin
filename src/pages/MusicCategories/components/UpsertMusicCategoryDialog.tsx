import type { AdminMusicCategory } from "@/@types/MusicCategory";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImagePicker from "@/components/ui/image-picker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useCreateMusicCategory,
  useUpdateMusicCategory,
} from "@/hooks/use-music-categories";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên danh mục").max(100),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  category?: AdminMusicCategory | null;
  onClose: () => void;
}

export default function UpsertMusicCategoryDialog({
  open,
  category,
  onClose,
}: Props) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageError, setImageError] = useState("");
  const objectUrlRef = useRef<string | null>(null);
  const createMutation = useCreateMusicCategory();
  const updateMutation = useUpdateMusicCategory();
  const isEdit = Boolean(category);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", isActive: true },
  });

  const revokeObjectUrl = useCallback(() => {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      revokeObjectUrl();
      return;
    }
    revokeObjectUrl();
    form.reset({ name: category?.name ?? "", isActive: category?.isActive ?? true });
    setImage(null);
    setPreview(category?.imageUrl ?? "");
    setImageError("");
  }, [category, form, open, revokeObjectUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const submit = async (values: Values) => {
    if (!isEdit && !image) {
      setImageError("Vui lòng chọn ảnh danh mục");
      return;
    }
    const data = new FormData();
    data.append("name", values.name.trim());
    data.append("isActive", String(values.isActive));
    if (image) data.append("image", image);
    try {
      if (category) await updateMutation.mutateAsync({ id: category._id, data });
      else await createMutation.mutateAsync(data);
    } catch {
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa danh mục nhạc" : "Tạo danh mục nhạc"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Cập nhật tên, ảnh hoặc trạng thái." : "Tạo danh mục để sắp xếp bài hát."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <div className="space-y-2">
              <FormLabel>Ảnh danh mục</FormLabel>
              <ImagePicker
                currentImage={preview}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  revokeObjectUrl();
                  const objectUrl = URL.createObjectURL(file);
                  objectUrlRef.current = objectUrl;
                  setImage(file);
                  setPreview(objectUrl);
                  setImageError("");
                }}
                onRemove={() => {
                  revokeObjectUrl();
                  setImage(null);
                  setPreview(category?.imageUrl ?? "");
                }}
              />
              {imageError ? <p className="text-sm font-medium text-destructive">{imageError}</p> : null}
              {isEdit ? <p className="text-xs text-muted-foreground">Để trống để giữ ảnh hiện tại.</p> : null}
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên danh mục</FormLabel>
                  <FormControl><Input placeholder="Ví dụ: Nhạc trẻ" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <FormLabel className="mb-0">Hiển thị trên màn hình chọn nhạc</FormLabel>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Hủy</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}