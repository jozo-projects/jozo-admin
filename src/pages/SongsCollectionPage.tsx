import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SongPruneJob } from "@/apis/roomMusic.apis";
import mediaWorkerApis, { type MediaJob } from "@/apis/mediaWorker.apis";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  fetchSongPruneStatus,
  useCancelSongPrune,
  useCreateSongHls,
  useDeleteSong,
  useNormalizeSongs,
  useSongsCollection,
  useStartSongPruneAsync,
} from "@/hooks/use-room-music";
import {
  getMediaStatusLabel,
  useMediaDownload,
} from "@/hooks/use-media-download";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import { formatDate } from "@/utils/formatters";
import {
  Download,
  Film,
  Loader2,
  Music,
  RefreshCcw,
  Search,
  StopCircle,
  Trash2,
  Wand2,
  Youtube,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import PaginationContainer from "@/pages/RecruitmentPage/components/PaginationContainer";
import AddSongsToCategoryDialog from "./SongsCollectionPage/components/AddSongsToCategoryDialog";

const PRUNE_STATUS_POLL_MS = 3000;

const isSongPruneRunning = (job: SongPruneJob | null) =>
  job?.status === "running";

const isSongPruneTerminal = (job: SongPruneJob | null) =>
  job?.status === "completed" ||
  job?.status === "failed" ||
  job?.status === "cancelled";

const formatElapsed = (seconds?: number) => {
  if (seconds == null || Number.isNaN(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} phút ${s}s` : `${s}s`;
};

type ConfirmDialogState =
  | { type: "normalize" }
  | { type: "startPrune" }
  | { type: "cancelPrune" }
  | { type: "convertHls"; videoId: string; title: string }
  | { type: "deleteSong"; videoId: string; title: string };

const getConfirmDialogContent = (state: ConfirmDialogState | null) => {
  switch (state?.type) {
    case "normalize":
      return {
        title: "Chuẩn hóa dữ liệu?",
        description:
          "Thao tác sẽ cập nhật title_normalized và author_normalized cho dữ liệu cũ trong collection.",
        confirmLabel: "Tiếp tục",
        destructive: false,
      };
    case "startPrune":
      return {
        title: "Bắt đầu quét thư viện?",
        description:
          "Quét toàn bộ bài YouTube không khả dụng. Job chạy nền; bạn có thể theo dõi tiến độ trên trang này.",
        confirmLabel: "Bắt đầu quét",
        destructive: false,
      };
    case "cancelPrune":
      return {
        title: "Hủy job đang chạy?",
        description:
          "Tiến trình dừng sau khi xong bài đang probe (có thể vài giây). Cron hoặc job API đều hủy được.",
        confirmLabel: "Hủy job",
        destructive: true,
      };
    case "convertHls":
      return {
        title: "Tạo HLS cho bài hát?",
        description:
          `Worker local sẽ tải "${state.title}" từ YouTube, encode 1080p/720p và upload lên R2.`,
        confirmLabel: "Bắt đầu tạo HLS",
        destructive: false,
      };
    case "deleteSong":
      return {
        title: "Xóa bài hát?",
        description: `Bạn có chắc muốn xóa "${state.title}" khỏi collection? Hành động không hoàn tác.`,
        confirmLabel: "Xóa",
        destructive: true,
      };
    default:
      return {
        title: "",
        description: "",
        confirmLabel: "Xác nhận",
        destructive: false,
      };
  }
};

const SongsCollectionPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shouldKeepFocusRef = useRef(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        shouldKeepFocusRef.current = true;
      }
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset về trang đầu tiên khi search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useSongsCollection({
    page: currentPage,
    limit: pageSize,
    keyword: debouncedSearchTerm || undefined,
  });

  // Keep focus on input after search completes
  useEffect(() => {
    if (shouldKeepFocusRef.current && !isFetching && searchInputRef.current) {
      // Use setTimeout to ensure focus happens after render
      setTimeout(() => {
        searchInputRef.current?.focus();
        shouldKeepFocusRef.current = false;
      }, 0);
    }
  }, [isFetching]);

  const {
    mutate: normalizeSongs,
    isPending: isNormalizing,
  } = useNormalizeSongs();

  const {
    mutate: deleteSong,
    isPending: isDeleting,
  } = useDeleteSong();
  const {
    mutateAsync: createSongHls,
    isPending: isCreatingSongHls,
  } = useCreateSongHls();
  const [hlsJobs, setHlsJobs] = useState<Record<string, MediaJob>>({});
  const hlsEventSourcesRef = useRef<Record<string, EventSource>>({});
  const hlsFallbackTimersRef = useRef<Record<string, number>>({});
  const hlsFallbackDelayRef = useRef<Record<string, number>>({});
  const hlsSseDisabledRef = useRef<Set<string>>(new Set());

  // The worker is the durable source of truth for media jobs. Rehydrate
  // active jobs after a page reload before opening their SSE streams.
  useEffect(() => {
    let cancelled = false;

    void mediaWorkerApis
      .listMedia()
      .then((jobs) => {
        if (cancelled) return;
        const activeJobs = jobs.filter(
          (job) =>
            Boolean(job.videoId) &&
            job.status !== "ready" &&
            job.status !== "failed",
        );
        if (activeJobs.length === 0) return;

        setHlsJobs((current) => {
          const next = { ...current };
          activeJobs.forEach((job) => {
            next[job.videoId!] = job;
          });
          return next;
        });
      })
      .catch(() => {
        // The existing create-job error toast remains the actionable path;
        // a reload must not make the whole Songs page fail if worker is down.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const activeJobs = Object.entries(hlsJobs).filter(
      ([, job]) => job.status !== "ready" && job.status !== "failed",
    );
    const activeIds = new Set(activeJobs.map(([videoId]) => videoId));

    const applyJobUpdate = (videoId: string, job: MediaJob) => {
      setHlsJobs((current) => ({ ...current, [videoId]: job }));
      if (job.status === "ready" || job.status === "failed") {
        hlsEventSourcesRef.current[videoId]?.close();
        delete hlsEventSourcesRef.current[videoId];
        const timer = hlsFallbackTimersRef.current[videoId];
        if (timer) window.clearTimeout(timer);
        delete hlsFallbackTimersRef.current[videoId];
        delete hlsFallbackDelayRef.current[videoId];
      }
    };

    const scheduleFallback = (videoId: string, job: MediaJob) => {
      if (activeIds.has(videoId) === false || hlsFallbackTimersRef.current[videoId]) return;
      const delay = hlsFallbackDelayRef.current[videoId] ?? 5_000;
      hlsFallbackTimersRef.current[videoId] = window.setTimeout(async () => {
        delete hlsFallbackTimersRef.current[videoId];
        try {
          const updated = await mediaWorkerApis.getMedia(job.id);
          applyJobUpdate(videoId, updated);
          if (updated.status !== "ready" && updated.status !== "failed") {
            hlsFallbackDelayRef.current[videoId] = Math.min(delay * 2, 30_000);
            scheduleFallback(videoId, updated);
          }
        } catch {
          hlsFallbackDelayRef.current[videoId] = Math.min(delay * 2, 30_000);
          scheduleFallback(videoId, job);
        }
      }, delay);
    };

    activeJobs.forEach(([videoId, job]) => {
      if (hlsEventSourcesRef.current[videoId] || hlsFallbackTimersRef.current[videoId]) return;

      if (hlsSseDisabledRef.current.has(videoId)) {
        scheduleFallback(videoId, job);
        return;
      }

      const source = new EventSource(mediaWorkerApis.getMediaEventsUrl(job.id));
      hlsEventSourcesRef.current[videoId] = source;
      const handleUpdate = (event: Event) => {
        try {
          const updated = JSON.parse((event as MessageEvent).data) as MediaJob;
          applyJobUpdate(videoId, updated);
        } catch {
          // Ignore malformed events; the fallback GET remains authoritative.
        }
      };
      source.addEventListener("media.updated", handleUpdate);
      source.onerror = () => {
        source.close();
        delete hlsEventSourcesRef.current[videoId];
        hlsSseDisabledRef.current.add(videoId);
        scheduleFallback(videoId, job);
      };
    });

    Object.keys(hlsEventSourcesRef.current).forEach((videoId) => {
      if (!activeIds.has(videoId)) {
        hlsEventSourcesRef.current[videoId].close();
        delete hlsEventSourcesRef.current[videoId];
      }
    });
    Object.keys(hlsFallbackTimersRef.current).forEach((videoId) => {
      if (!activeIds.has(videoId)) {
        window.clearTimeout(hlsFallbackTimersRef.current[videoId]);
        delete hlsFallbackTimersRef.current[videoId];
      }
    });
  }, [hlsJobs]);

  useEffect(() => () => {
    Object.values(hlsEventSourcesRef.current).forEach((source) => source.close());
    Object.values(hlsFallbackTimersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const {
    mutateAsync: startSongPruneAsync,
    isPending: isStartingSongPrune,
  } = useStartSongPruneAsync();
  const {
    mutateAsync: cancelSongPrune,
    isPending: isCancellingSongPrune,
  } = useCancelSongPrune();
  const { toast } = useToast();
  const {
    startDownload,
    isBusy: isMediaDownloadBusy,
    isStarting: isMediaDownloadStarting,
    getDownload: getMediaDownload,
  } = useMediaDownload();
  const queryClient = useQueryClient();
  const {
    onSongPruneStarted,
    offSongPruneStarted,
    onSongPruneProgress,
    offSongPruneProgress,
    onSongPruneFinished,
    offSongPruneFinished,
  } = useSocket();

  const [youtubePruneOpen, setYoutubePruneOpen] = useState(false);
  const [youtubePruneDryRun, setYoutubePruneDryRun] = useState(false);
  const [youtubePruneJob, setYoutubePruneJob] = useState<SongPruneJob | null>(
    null,
  );
  const [youtubePruneStatusLoading, setYoutubePruneStatusLoading] =
    useState(false);
  const [youtubePruneCancelRequested, setYoutubePruneCancelRequested] =
    useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogState, setConfirmDialogState] =
    useState<ConfirmDialogState | null>(null);
  const [confirmDialogLoading, setConfirmDialogLoading] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const lastPruneNotifiedJobIdRef = useRef<string | null>(null);

  const confirmDialogContent = getConfirmDialogContent(confirmDialogState);

  const openConfirmDialog = (state: ConfirmDialogState) => {
    setConfirmDialogState(state);
    setConfirmDialogOpen(true);
  };

  const closeConfirmDialog = () => {
    setConfirmDialogOpen(false);
    setConfirmDialogState(null);
    setConfirmDialogLoading(false);
  };

  // Extract songs and pagination from response
  const songs = responseData?.result?.songs || [];
  const pagination = responseData?.result?.pagination;
  const selectedSongs = songs.filter((song) => selectedSongIds.has(song.video_id));

  const toggleSongSelection = (videoId: string, checked: boolean) => {
    setSelectedSongIds((current) => {
      const next = new Set(current);
      if (checked) next.add(videoId);
      else next.delete(videoId);
      return next;
    });
  };

  const toggleVisibleSongs = (checked: boolean) => {
    setSelectedSongIds((current) => {
      const next = new Set(current);
      songs.forEach((song) => {
        if (checked) next.add(song.video_id);
        else next.delete(song.video_id);
      });
      return next;
    });
  };

  const applySongPruneJob = useCallback((job: SongPruneJob) => {
    setYoutubePruneJob(job);
  }, []);

  const refreshSongPruneStatus = useCallback(async () => {
    try {
      const job = await fetchSongPruneStatus();
      if (job) {
        setYoutubePruneJob(job);
      }
      return job;
    } catch {
      return null;
    }
  }, []);

  const handleSongPruneFinished = useCallback(
    (job: SongPruneJob) => {
      applySongPruneJob(job);
      if (!isSongPruneTerminal(job)) return;
      if (lastPruneNotifiedJobIdRef.current === job.job_id) return;
      lastPruneNotifiedJobIdRef.current = job.job_id;

      if (job.status === "completed") {
        if (!job.dry_run) {
          queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
        }
        toast({
          title: job.dry_run ? "Dry run hoàn tất" : "Dọn thư viện xong",
          description: `Đã quét ${job.checked}/${job.total} · Xóa ${job.removed_from_db} bản ghi`,
        });
      } else if (job.status === "failed") {
        toast({
          title: "Dọn thư viện thất bại",
          description: job.error ?? "Job kết thúc với lỗi.",
          variant: "destructive",
        });
      } else if (job.status === "cancelled") {
        setYoutubePruneCancelRequested(false);
        if (!job.dry_run) {
          queryClient.invalidateQueries({ queryKey: ["songs-collection"] });
        }
        toast({
          title: "Đã hủy job dọn thư viện",
          description: `Đã quét ${job.checked}/${job.total} · Xóa ${job.removed_from_db} bản ghi trước khi dừng`,
        });
      }
    },
    [applySongPruneJob, queryClient, toast],
  );

  useEffect(() => {
    void refreshSongPruneStatus();
  }, [refreshSongPruneStatus]);

  useEffect(() => {
    const onStarted = (job: SongPruneJob) => {
      if (job.job_id !== lastPruneNotifiedJobIdRef.current) {
        lastPruneNotifiedJobIdRef.current = null;
        setYoutubePruneCancelRequested(false);
      }
      applySongPruneJob(job);
    };
    const onProgress = (job: SongPruneJob) => {
      applySongPruneJob(job);
    };
    const onFinished = (job: SongPruneJob) => {
      handleSongPruneFinished(job);
    };

    onSongPruneStarted(onStarted);
    onSongPruneProgress(onProgress);
    onSongPruneFinished(onFinished);

    return () => {
      offSongPruneStarted(onStarted);
      offSongPruneProgress(onProgress);
      offSongPruneFinished(onFinished);
    };
  }, [
    applySongPruneJob,
    handleSongPruneFinished,
    onSongPruneFinished,
    onSongPruneProgress,
    onSongPruneStarted,
    offSongPruneFinished,
    offSongPruneProgress,
    offSongPruneStarted,
  ]);

  const youtubePruneJobRunning = isSongPruneRunning(youtubePruneJob);
  const youtubePruneJobId = youtubePruneJob?.job_id;

  useEffect(() => {
    if (!youtubePruneJobRunning) return;

    const poll = () => {
      void refreshSongPruneStatus().then((job) => {
        if (job && isSongPruneTerminal(job)) {
          handleSongPruneFinished(job);
        }
      });
    };

    const id = window.setInterval(poll, PRUNE_STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [
    youtubePruneJobRunning,
    youtubePruneJobId,
    refreshSongPruneStatus,
    handleSongPruneFinished,
  ]);

  const openYoutubePruneDialog = async () => {
    setYoutubePruneOpen(true);
    setYoutubePruneStatusLoading(true);
    try {
      await refreshSongPruneStatus();
    } finally {
      setYoutubePruneStatusLoading(false);
    }
  };

  const executeStartYoutubePrune = async () => {
    try {
      setYoutubePruneCancelRequested(false);
      const job = await startSongPruneAsync({
        omitIds: true,
        dryRun: youtubePruneDryRun,
      });
      applySongPruneJob(job);
      if (isSongPruneTerminal(job)) {
        handleSongPruneFinished(job);
      }
    } catch {
      // toast từ http interceptor
    }
  };

  const executeCancelYoutubePrune = async () => {
    try {
      const { message, job } = await cancelSongPrune();
      applySongPruneJob(job);
      setYoutubePruneCancelRequested(true);
      toast({
        title: "Đã gửi yêu cầu hủy",
        description: message,
      });
      if (job.status === "cancelled") {
        handleSongPruneFinished(job);
      }
    } catch {
      // 400: không có job — toast từ http interceptor
    }
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialogState) return;
    setConfirmDialogLoading(true);
    try {
      switch (confirmDialogState.type) {
        case "normalize":
          normalizeSongs();
          break;
        case "startPrune":
          await executeStartYoutubePrune();
          break;
        case "cancelPrune":
          await executeCancelYoutubePrune();
          break;
        case "convertHls": {
          hlsSseDisabledRef.current.delete(confirmDialogState.videoId);
          delete hlsFallbackDelayRef.current[confirmDialogState.videoId];
          const job = await createSongHls({
            videoId: confirmDialogState.videoId,
            title: confirmDialogState.title,
          });
          setHlsJobs((current) => ({
            ...current,
            [confirmDialogState.videoId]: job,
          }));
          toast({
            title: "Đã xếp hàng tạo HLS",
            description: "Local đang xử lý video.",
          });
          break;
        }
        case "deleteSong":
          deleteSong(confirmDialogState.videoId);
          break;
      }
      closeConfirmDialog();
    } catch {
      setConfirmDialogLoading(false);
    }
  };

  const youtubePruneRunning = youtubePruneJobRunning;
  const youtubePruneDone = isSongPruneTerminal(youtubePruneJob);
  
  // Use pagination info from API
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || Number.isNaN(seconds)) return "-";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || Number.isNaN(bytes)) return "-";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getHlsStatusLabel = (
    status?: MediaJob["status"],
    catalogHlsReady = false,
  ) => {
    if (status === "ready" && !catalogHlsReady) {
      return "Worker xong, chưa đồng bộ HLS vào BE";
    }
    switch (status) {
      case "pending":
        return "Chờ xử lý";
      case "downloading":
        return "Đang tải";
      case "encoding":
        return "Đang encode";
      case "uploading":
        return "Đang upload R2";
      case "ready":
        return "Sẵn sàng";
      case "failed":
        return "Thất bại";
      default:
        return "";
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset về trang đầu tiên khi thay đổi page size
  };

  const requestConvertHls = (videoId: string, title: string) => {
    const existingJob = hlsJobs[videoId];
    if (existingJob && existingJob.status !== "failed" && existingJob.status !== "ready") {
      return;
    }
    openConfirmDialog({ type: "convertHls", videoId, title });
  };

  const requestDeleteSong = (videoId: string, title: string) => {
    openConfirmDialog({ type: "deleteSong", videoId, title });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Đang tải danh sách bài hát...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-lg text-red-600">
          Không thể tải danh sách bài hát
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Bộ sưu tập bài hát"
        description="Xem danh sách các bài hát đã được lưu vào collection"
        icon={Music}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => openConfirmDialog({ type: "normalize" })}
              disabled={isNormalizing}
            >
              {isNormalizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Chuẩn hóa dữ liệu
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => void openYoutubePruneDialog()}
              disabled={isStartingSongPrune}
            >
              {youtubePruneRunning || isStartingSongPrune ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Youtube className="w-4 h-4 mr-2" />
              )}
              Dọn thư viện YouTube
              {youtubePruneRunning && youtubePruneJob
                ? ` (${youtubePruneJob.percent}%)`
                : null}
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw
                className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        }
      />

      <Dialog open={youtubePruneOpen} onOpenChange={setYoutubePruneOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="p-6 pb-2 space-y-1 shrink-0">
            <DialogTitle>Dọn thư viện YouTube</DialogTitle>
            <DialogDescription>
              Job chạy nền (
              <span className="font-mono text-xs">async=1</span>
              ). Tiến độ realtime qua socket; poll{" "}
              <span className="font-mono text-xs">GET .../status</span> mỗi 3 giây
              khi đang chạy.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4 space-y-4 overflow-y-auto flex-1 min-h-0 text-sm">
            {youtubePruneStatusLoading && !youtubePruneJob ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tải trạng thái job…
              </div>
            ) : null}

            {youtubePruneRunning && youtubePruneJob ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {youtubePruneJob.source === "cron"
                        ? "Cron (4h sáng)"
                        : "Đang quét"}
                    </span>
                    <span className="tabular-nums font-medium text-foreground">
                      {youtubePruneJob.percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-600 transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, youtubePruneJob.percent))}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm">
                    Đã quét{" "}
                    <span className="font-medium tabular-nums">
                      {youtubePruneJob.checked.toLocaleString()}
                    </span>
                    /{" "}
                    <span className="font-medium tabular-nums">
                      {youtubePruneJob.total.toLocaleString()}
                    </span>
                    {" · "}
                    Đã xóa{" "}
                    <span className="font-medium tabular-nums">
                      {youtubePruneJob.removed_from_db.toLocaleString()}
                    </span>
                    {youtubePruneJob.dry_run ? " (dry run)" : null}
                  </p>
                  {formatElapsed(youtubePruneJob.elapsed_sec) ? (
                    <p className="text-xs text-muted-foreground">
                      Thời gian: {formatElapsed(youtubePruneJob.elapsed_sec)}
                    </p>
                  ) : null}
                  {youtubePruneCancelRequested ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Đã gửi yêu cầu hủy — chờ xong video đang probe rồi dừng…
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => openConfirmDialog({ type: "cancelPrune" })}
                  disabled={isCancellingSongPrune || youtubePruneCancelRequested}
                >
                  {isCancellingSongPrune ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <StopCircle className="w-4 h-4 mr-2" />
                  )}
                  Hủy job
                </Button>
              </div>
            ) : null}

            {!youtubePruneRunning ? (
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="youtube-prune-dry-run"
                  checked={youtubePruneDryRun}
                  disabled={youtubePruneRunning || isStartingSongPrune}
                  onCheckedChange={(checked) =>
                    setYoutubePruneDryRun(checked === true)
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="youtube-prune-dry-run" className="cursor-pointer">
                    Chạy thử (dry_run)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gửi <span className="font-mono">dry_run=1</span> — quét nhưng không
                    xóa DB.
                  </p>
                </div>
              </div>
            ) : null}

            {youtubePruneDone && youtubePruneJob ? (
              <div className="space-y-3">
                <div
                  className={`rounded-md border p-3 text-sm ${
                    youtubePruneJob.status === "failed"
                      ? "border-destructive/50 bg-destructive/5"
                      : youtubePruneJob.status === "cancelled"
                        ? "border-amber-600/30 bg-amber-50 dark:bg-amber-950/20"
                        : "border-green-600/30 bg-green-50 dark:bg-green-950/20"
                  }`}
                >
                  <p className="font-medium">
                    {youtubePruneJob.status === "completed"
                      ? youtubePruneJob.dry_run
                        ? "Dry run hoàn tất"
                        : "Hoàn tất"
                      : youtubePruneJob.status === "cancelled"
                        ? "Đã hủy"
                        : "Thất bại"}
                  </p>
                  {youtubePruneJob.error ? (
                    <p className="mt-1 text-destructive">{youtubePruneJob.error}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border bg-muted/40 p-3">
                  <span className="text-muted-foreground">checked</span>
                  <span className="font-medium tabular-nums">
                    {youtubePruneJob.checked}
                  </span>
                  <span className="text-muted-foreground">skipped_unknown</span>
                  <span className="font-medium tabular-nums">
                    {youtubePruneJob.skipped_unknown}
                  </span>
                  <span className="text-muted-foreground">unavailable_on_youtube</span>
                  <span className="font-medium tabular-nums">
                    {youtubePruneJob.unavailable_on_youtube}
                  </span>
                  <span className="text-muted-foreground">removed_from_db</span>
                  <span className="font-medium tabular-nums">
                    {youtubePruneJob.removed_from_db}
                  </span>
                  <span className="text-muted-foreground">dry_run</span>
                  <span className="font-medium">
                    {youtubePruneJob.dry_run ? "true" : "false"}
                  </span>
                  {youtubePruneJob.source ? (
                    <>
                      <span className="text-muted-foreground">source</span>
                      <span className="font-medium">{youtubePruneJob.source}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!youtubePruneRunning &&
            !youtubePruneDone &&
            !youtubePruneStatusLoading ? (
              <p className="text-muted-foreground">
                Nhấn &quot;Bắt đầu quét&quot; để chạy job nền. Nếu cron 4h sáng đang
                chạy, mở lại dialog sẽ thấy tiến độ.
              </p>
            ) : null}

          </div>
          <DialogFooter className="p-6 pt-2 border-t bg-background shrink-0 flex-row flex-wrap gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => openConfirmDialog({ type: "startPrune" })}
                disabled={
                  youtubePruneRunning ||
                  isStartingSongPrune ||
                  youtubePruneStatusLoading ||
                  isCancellingSongPrune
                }
              >
                {isStartingSongPrune ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Youtube className="w-4 h-4 mr-2" />
                )}
                Bắt đầu quét
              </Button>
              {youtubePruneRunning ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  onClick={() => openConfirmDialog({ type: "cancelPrune" })}
                  disabled={isCancellingSongPrune || youtubePruneCancelRequested}
                >
                  {isCancellingSongPrune ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <StopCircle className="w-4 h-4 mr-2" />
                  )}
                  Hủy job
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setYoutubePruneOpen(false)}
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          if (!open && !confirmDialogLoading) closeConfirmDialog();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialogState?.type === "startPrune" && youtubePruneDryRun ? (
                <>
                  <span className="font-medium text-foreground">Dry run</span> — quét
                  nhưng không xóa DB.{" "}
                </>
              ) : null}
              {confirmDialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmDialogLoading}>
              Đóng
            </AlertDialogCancel>
            <Button
              type="button"
              variant={confirmDialogContent.destructive ? "destructive" : "default"}
              disabled={confirmDialogLoading}
              onClick={() => void handleConfirmDialogAction()}
            >
              {confirmDialogLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {confirmDialogContent.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={searchInputRef}
              placeholder="Tìm kiếm theo tên bài hát, tác giả hoặc video ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Danh sách bài hát đã lưu</CardTitle>
            <Button
              type="button"
              onClick={() => setCategoryDialogOpen(true)}
              disabled={!selectedSongs.length}
            >
              Thêm vào danh mục
              {selectedSongs.length ? ` (${selectedSongs.length})` : ""}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={songs.length > 0 && songs.every((song) => selectedSongIds.has(song.video_id))}
                    onCheckedChange={(checked) => toggleVisibleSongs(checked === true)}
                    aria-label="Chọn tất cả bài hát trên trang"
                  />
                </TableHead>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead>Video ID</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Ngày thêm</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="w-[160px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {songs.map((song) => (
                <TableRow key={song._id || song.video_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSongIds.has(song.video_id)}
                      onCheckedChange={(checked) => toggleSongSelection(song.video_id, checked === true)}
                      aria-label={`Chọn ${song.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    {song.thumbnail ? (
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-16 h-16 rounded-md object-cover"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-md flex items-center justify-center text-[10px] font-semibold leading-tight text-center px-0.5 bg-red-500 text-white border border-red-600 shadow-sm"
                        title="Bản ghi không có thumbnail"
                      >
                        Thiếu ảnh
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium line-clamp-2">{song.title}</div>
                    {song.media_status === "ready" && song.hls_url ? (
                      <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        Đã tải HLS
                      </span>
                    ) : null}
                    {song.url && (
                      <a
                        href={song.url}
                        className="text-xs text-blue-600 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở liên kết
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{song.author}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {song.video_id}
                  </TableCell>
                  <TableCell>{formatDuration(song.duration)}</TableCell>
                  <TableCell>
                    {song.created_at
                      ? formatDate(String(song.created_at))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {song.updated_at
                      ? formatDate(String(song.updated_at))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void startDownload(song.video_id)}
                          disabled={isMediaDownloadBusy(song.video_id)}
                          title="Tải và encode video qua media service"
                        >
                          {isMediaDownloadStarting(song.video_id) ||
                          isMediaDownloadBusy(song.video_id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestConvertHls(song.video_id, song.title)}
                          disabled={
                            isCreatingSongHls ||
                            ["pending", "downloading", "encoding", "uploading"].includes(
                              hlsJobs[song.video_id]?.status ?? "",
                            )
                          }
                          title="Tạo HLS và upload R2"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          {hlsJobs[song.video_id]?.status === "pending" ||
                          hlsJobs[song.video_id]?.status === "downloading" ||
                          hlsJobs[song.video_id]?.status === "encoding" ||
                          hlsJobs[song.video_id]?.status === "uploading" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Film className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => requestDeleteSong(song.video_id, song.title)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {(() => {
                        const hlsJob = hlsJobs[song.video_id];
                        const download = getMediaDownload(song.video_id);
                        if (hlsJob) {
                          return (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p className={hlsJob.status === "failed" ? "text-destructive" : ""}>
                                {getHlsStatusLabel(
                                  hlsJob.status,
                                  song.media_status === "ready" && Boolean(song.hls_url),
                                )}
                              </p>
                              {hlsJob.status === "uploading" &&
                              hlsJob.totalObjectCount ? (
                                <>
                                  <div className="flex justify-between gap-2">
                                    <span>
                                      {hlsJob.uploadedObjectCount ?? 0}/
                                      {hlsJob.totalObjectCount} objects
                                    </span>
                                    <span>{hlsJob.uploadProgress ?? 0}%</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, hlsJob.uploadProgress ?? 0))}%`,
                                      }}
                                    />
                                  </div>
                                  <p>
                                    {formatBytes(hlsJob.uploadedBytes)} / {formatBytes(hlsJob.totalBytes)}
                                  </p>
                                </>
                              ) : null}
                              {hlsJob.currentObjectKey ? (
                                <p className="truncate" title={hlsJob.currentObjectKey}>
                                  {hlsJob.currentObjectKey.split("/").slice(-2).join("/")}
                                </p>
                              ) : null}
                              {hlsJob.status === "ready" && song.media_status === "ready" && song.hls_url ? (
                                <a
                                  href={song.hls_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 hover:underline break-all line-clamp-2"
                                >
                                  HLS
                                </a>
                              ) : null}
                              {hlsJob.status === "failed" && (hlsJob.errorMessage || hlsJob.error) ? (
                                <p className="text-destructive line-clamp-2">
                                  {hlsJob.errorMessage || hlsJob.error}
                                </p>
                              ) : null}
                            </div>
                          );
                        }
                        if (!download) {
                          return null;
                        }
                        return (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>{getMediaStatusLabel(download.status)}</p>
                            {download.status === "ready" && song.media_status === "ready" && song.hls_url ? (
                              <a
                                href={song.hls_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline break-all line-clamp-2"
                              >
                                HLS
                              </a>
                            ) : null}
                            {download.status === "failed" && download.error ? (
                              <p className="text-destructive line-clamp-2">
                                {download.error}
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {songs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {debouncedSearchTerm
                ? "Không tìm thấy bài hát phù hợp"
                : "Chưa có bài hát nào trong collection"}
            </div>
          )}

          {songs.length > 0 && (
            <PaginationContainer
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={total}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100, 1000]}
            />
          )}
        </CardContent>
      </Card>
      <AddSongsToCategoryDialog
        open={categoryDialogOpen}
        songs={selectedSongs}
        onClose={() => setCategoryDialogOpen(false)}
        onAssigned={() => setSelectedSongIds(new Set())}
      />
    </div>
  );
};

export default SongsCollectionPage;
