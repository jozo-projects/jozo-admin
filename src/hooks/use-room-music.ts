import roomsMusicApis, {
  type PruneUnavailableYoutubeParams,
  type SongPruneJob,
} from "@/apis/roomMusic.apis";
import mediaWorkerApis from "@/apis/mediaWorker.apis";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export const useSongsCollection = (params?: {
  page?: number;
  limit?: number;
  keyword?: string;
}) =>
  useQuery({
    queryKey: [
      "songs-collection",
      params?.page,
      params?.limit,
      params?.keyword,
    ],
    queryFn: async () => {
      const response = await roomsMusicApis.getSongsCollection(params);
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useNormalizeSongs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => roomsMusicApis.normalizeSongs(),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã chuẩn hóa dữ liệu bài hát",
      });
      queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể chuẩn hóa dữ liệu bài hát",
        variant: "destructive",
      });
    },
  });
};

export const usePruneUnavailableYoutube = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params?: PruneUnavailableYoutubeParams) =>
      roomsMusicApis.pruneUnavailableYoutube(params),
    onSuccess: (_response, variables) => {
      if (!variables?.dryRun) {
        queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
      }
    },
  });
};

export const parseSongPruneJob = (
  payload: unknown,
): SongPruneJob | null => {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if ("job" in obj && obj.job && typeof obj.job === "object") {
    return obj.job as unknown as SongPruneJob;
  }
  if ("result" in obj && obj.result && typeof obj.result === "object") {
    return obj.result as unknown as SongPruneJob;
  }
  if ("job_id" in obj && typeof obj.job_id === "string") {
    return obj as unknown as SongPruneJob;
  }
  return null;
};

export const useStartSongPruneAsync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: PruneUnavailableYoutubeParams) => {
      const response =
        await roomsMusicApis.startPruneUnavailableYoutubeAsync(params);
      const job = parseSongPruneJob(response.data);
      if (!job) {
        throw new Error("API không trả job.");
      }
      return job;
    },
    onSuccess: (job) => {
      if (job.status === "completed" && !job.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
      }
    },
  });
};

export const fetchSongPruneStatus = async (): Promise<SongPruneJob | null> => {
  const response = await roomsMusicApis.getPruneUnavailableYoutubeStatus();
  return parseSongPruneJob(response.data);
};

export const useCancelSongPrune = () =>
  useMutation({
    mutationFn: async () => {
      const response = await roomsMusicApis.cancelPruneUnavailableYoutube();
      const job = parseSongPruneJob(response.data);
      if (!job) {
        throw new Error("API không trả job.");
      }
      return {
        message: response.data?.message ?? "Đã gửi yêu cầu hủy.",
        job,
      };
    },
  });

export const useDeleteSong = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (videoId: string) => roomsMusicApis.deleteSong(videoId),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã xóa bài hát khỏi collection",
      });
      queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa bài hát",
        variant: "destructive",
      });
    },
  });
};

export const useCreateSongHls = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: { videoId: string; title?: string }) =>
      mediaWorkerApis.createHls(payload),
    onError: (error) => {
      const description = axios.isAxiosError(error) && error.code === "ERR_NETWORK"
        ? "Chưa kết nối được jozo-local-worker ở localhost:4001. Hãy chạy worker trước."
        : error instanceof Error
          ? error.message
          : "Không kết nối được local worker";
      toast({
        title: "Không thể tạo HLS",
        description,
        variant: "destructive",
      });
    },
  });
};

export default useSongsCollection;
