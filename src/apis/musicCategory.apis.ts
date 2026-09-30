import type {
  AdminMusicCategory,
  CategorySongsQuery,
  CategorySongsResult,
  MusicCategory,
} from "@/@types/MusicCategory";
import http from "@/utils/http";

const CONTROLLER = "/room-music/music-categories";

const musicCategoryApis = {
  getAdminCategories: () =>
    http.get<HTTPResponse<AdminMusicCategory[]>>(`${CONTROLLER}/admin`),
  getCategory: async (categoryId: string) => {
    const response = await http.get<HTTPResponse<AdminMusicCategory[]>>(
      `${CONTROLLER}/admin`,
    );
    return response.data.result?.find((category) => category._id === categoryId);
  },
  createCategory: (data: FormData) =>
    http.post<HTTPResponse<MusicCategory>>(CONTROLLER, data),
  updateCategory: (categoryId: string, data: FormData) =>
    http.patch<HTTPResponse<MusicCategory>>(
      `${CONTROLLER}/${categoryId}`,
      data,
    ),
  deleteCategory: (categoryId: string) =>
    http.delete<HTTPResponse<MusicCategory>>(`${CONTROLLER}/${categoryId}`),
  reorderCategories: (categoryIds: string[]) =>
    http.put<HTTPResponse<AdminMusicCategory[]>>(`${CONTROLLER}/reorder`, {
      categoryIds,
    }),
  getAdminSongs: (categoryId: string, params?: CategorySongsQuery) =>
    http.get<HTTPResponse<CategorySongsResult>>(
      `${CONTROLLER}/${categoryId}/admin/songs`,
      { params },
    ),
  assignSongs: (categoryId: string, videoIds: string[]) =>
    http.post<HTTPResponse<{ assignedCount: number }>>(
      `${CONTROLLER}/${categoryId}/songs`,
      { videoIds },
    ),
  removeSongs: (categoryId: string, videoIds: string[]) =>
    http.delete<HTTPResponse<{ removedCount: number }>>(
      `${CONTROLLER}/${categoryId}/songs`,
      { data: { videoIds } },
    ),
  reorderSongs: (categoryId: string, videoIds: string[]) =>
    http.put<HTTPResponse<{ reorderedCount: number }>>(
      `${CONTROLLER}/${categoryId}/songs/reorder`,
      { videoIds },
    ),
};

export default musicCategoryApis;