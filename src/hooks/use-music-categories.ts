import type {
  AdminMusicCategory,
  CategorySongsQuery,
} from "@/@types/MusicCategory";
import musicCategoryApis from "@/apis/musicCategory.apis";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const musicCategoryKeys = {
  all: ["music-categories"] as const,
  admin: ["music-categories", "admin"] as const,
  detail: (id: string) => ["music-categories", "detail", id] as const,
  songsRoot: (id: string) => ["music-categories", "songs", id] as const,
  songs: (id: string, query: CategorySongsQuery) =>
    ["music-categories", "songs", id, query] as const,
};

const mutationError = (description: string) => ({
  title: "Có lỗi xảy ra",
  description,
  variant: "destructive" as const,
});

export const useAdminMusicCategories = () =>
  useQuery({
    queryKey: musicCategoryKeys.admin,
    queryFn: async () => {
      const response = await musicCategoryApis.getAdminCategories();
      return response.data.result ?? [];
    },
  });

export const useMusicCategory = (id: string) =>
  useQuery({
    queryKey: musicCategoryKeys.detail(id),
    queryFn: () => musicCategoryApis.getCategory(id),
    enabled: Boolean(id),
  });

export const useCreateMusicCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: FormData) => musicCategoryApis.createCategory(data),
    onSuccess: () => {
      toast({ title: "Đã tạo danh mục" });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.all });
    },
    onError: () => toast(mutationError("Không thể tạo danh mục nhạc.")),
  });
};

export const useUpdateMusicCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      musicCategoryApis.updateCategory(id, data),
    onSuccess: (_, { id }) => {
      toast({ title: "Đã cập nhật danh mục" });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.admin });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.detail(id) });
    },
    onError: () => toast(mutationError("Không thể cập nhật danh mục nhạc.")),
  });
};

export const useToggleMusicCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => {
      const data = new FormData();
      data.append("isActive", String(isActive));
      return musicCategoryApis.updateCategory(id, data);
    },
    onMutate: async ({ id, isActive }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: musicCategoryKeys.admin }),
        queryClient.cancelQueries({ queryKey: musicCategoryKeys.detail(id) }),
      ]);
      const previous = queryClient.getQueryData<AdminMusicCategory[]>(
        musicCategoryKeys.admin,
      );
      const previousDetail = queryClient.getQueryData<AdminMusicCategory>(
        musicCategoryKeys.detail(id),
      );
      queryClient.setQueryData<AdminMusicCategory[]>(
        musicCategoryKeys.admin,
        (current = []) =>
          current.map((item) => (item._id === id ? { ...item, isActive } : item)),
      );
      queryClient.setQueryData<AdminMusicCategory | undefined>(
        musicCategoryKeys.detail(id),
        (current) => (current ? { ...current, isActive } : current),
      );
      return { previous, previousDetail };
    },
    onError: (_error, { id }, context) => {
      queryClient.setQueryData(musicCategoryKeys.admin, context?.previous);
      queryClient.setQueryData(
        musicCategoryKeys.detail(id),
        context?.previousDetail,
      );
      toast(mutationError("Không thể đổi trạng thái danh mục."));
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.admin });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.detail(id) });
    },
  });
};

export const useDeleteMusicCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => musicCategoryApis.deleteCategory(id),
    onSuccess: () => {
      toast({ title: "Đã xóa danh mục" });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.all });
    },
    onError: () => toast(mutationError("Không thể xóa danh mục nhạc.")),
  });
};

export const useReorderMusicCategories = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (categories: AdminMusicCategory[]) =>
      musicCategoryApis.reorderCategories(categories.map((item) => item._id)),
    onMutate: async (categories) => {
      await queryClient.cancelQueries({ queryKey: musicCategoryKeys.admin });
      const previous = queryClient.getQueryData<AdminMusicCategory[]>(
        musicCategoryKeys.admin,
      );
      queryClient.setQueryData(
        musicCategoryKeys.admin,
        categories.map((item, position) => ({ ...item, position })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(musicCategoryKeys.admin, context?.previous);
      toast(mutationError("Danh sách đã thay đổi. Vui lòng tải lại và thử lại."));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: musicCategoryKeys.admin }),
  });
};

export const useAdminCategorySongs = (
  categoryId: string,
  query: CategorySongsQuery,
) =>
  useQuery({
    queryKey: musicCategoryKeys.songs(categoryId, query),
    queryFn: async () => {
      const response = await musicCategoryApis.getAdminSongs(categoryId, query);
      return response.data.result;
    },
    enabled: Boolean(categoryId),
  });

const useSongMutation = (
  action: "assign" | "remove" | "reorder",
  successMessage: string,
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation<unknown, Error, { categoryId: string; videoIds: string[] }>({
    mutationFn: async ({ categoryId, videoIds }) => {
      if (action === "assign") await musicCategoryApis.assignSongs(categoryId, videoIds);
      else if (action === "remove") await musicCategoryApis.removeSongs(categoryId, videoIds);
      else await musicCategoryApis.reorderSongs(categoryId, videoIds);
    },
    onSuccess: (_, { categoryId }) => {
      toast({ title: successMessage });
      void queryClient.invalidateQueries({
        queryKey: musicCategoryKeys.songsRoot(categoryId),
      });
      void queryClient.invalidateQueries({ queryKey: musicCategoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
    },
    onError: () =>
      toast(
        mutationError(
          action === "reorder"
            ? "Danh sách đã thay đổi. Vui lòng tải lại rồi sắp xếp lại."
            : "Không thể cập nhật bài hát trong danh mục.",
        ),
      ),
  });
};

export const useAssignCategorySongs = () =>
  useSongMutation("assign", "Đã thêm bài hát");
export const useRemoveCategorySongs = () =>
  useSongMutation("remove", "Đã bỏ bài hát khỏi danh mục");
export const useReorderCategorySongs = () =>
  useSongMutation("reorder", "Đã cập nhật thứ tự bài hát");