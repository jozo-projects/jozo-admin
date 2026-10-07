import {
  createMediaJob,
  fetchDownloadedMedia,
  fetchMediaJob,
  isMediaJobActive,
  isMediaJobTerminal,
  type MediaJob,
  type MediaStatus,
} from "@/apis/media.apis";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useRef, useState } from "react";

const MEDIA_STATUS_POLL_MS = 4000;

const MEDIA_STATUS_LABEL: Record<MediaStatus, string> = {
  pending: "Chờ xử lý",
  downloading: "Đang tải",
  encoding: "Đang encode",
  ready: "Sẵn sàng",
  failed: "Thất bại",
};

export type MediaDownloadEntry = {
  mediaId: string;
  status: MediaStatus;
  hlsUrl?: string;
  error?: string;
};

export const getMediaStatusLabel = (status?: MediaStatus) =>
  status ? MEDIA_STATUS_LABEL[status] : "";

export const useMediaDownload = () => {
  const { toast } = useToast();
  const [downloads, setDownloads] = useState<
    Record<string, MediaDownloadEntry>
  >({});
  const [startingVideoIds, setStartingVideoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [downloadedVideoIds, setDownloadedVideoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const notifiedReadyRef = useRef<Set<string>>(new Set());
  const downloadsRef = useRef(downloads);
  downloadsRef.current = downloads;

  const activePollKey = Object.entries(downloads)
    .filter(([, entry]) => isMediaJobActive(entry.status))
    .map(([videoId, entry]) => `${videoId}:${entry.mediaId}`)
    .sort()
    .join("|");

  const applyMediaJob = useCallback((videoId: string, job: MediaJob) => {
    setDownloads((prev) => ({
      ...prev,
      [videoId]: {
        mediaId: job.id,
        status: job.status,
        hlsUrl: job.hlsUrl,
        error: job.error,
      },
    }));
  }, []);

  const handleMediaJobFinished = useCallback(
    (videoId: string, job: MediaJob) => {
      applyMediaJob(videoId, job);
      if (job.status === "ready") {
        setDownloadedVideoIds((prev) => {
          if (prev.has(videoId)) return prev;
          return new Set(prev).add(videoId);
        });
      }
      if (!isMediaJobTerminal(job.status)) return;

      const notifyKey = `${videoId}:${job.id}:${job.status}`;
      if (notifiedReadyRef.current.has(notifyKey)) return;
      notifiedReadyRef.current.add(notifyKey);

      if (job.status === "ready" && job.hlsUrl) {
        toast({
          title: "Video sẵn sàng",
          description: job.hlsUrl,
        });
      } else if (job.status === "failed") {
        toast({
          title: "Tải video thất bại",
          description: job.error ?? "Media service trả về lỗi.",
          variant: "destructive",
        });
      }
    },
    [applyMediaJob, toast],
  );

  const startDownload = useCallback(
    async (videoId: string) => {
      const current = downloadsRef.current[videoId];
      if (
        current &&
        (isMediaJobActive(current.status) || current.status === "ready")
      ) {
        return;
      }

      setStartingVideoIds((prev) => new Set(prev).add(videoId));
      try {
        const job = await createMediaJob(videoId);
        applyMediaJob(videoId, job);
        if (isMediaJobTerminal(job.status)) {
          handleMediaJobFinished(videoId, job);
        }
      } catch (error) {
        toast({
          title: "Không gọi được media service",
          description:
            error instanceof Error ? error.message : "Lỗi không xác định",
          variant: "destructive",
        });
      } finally {
        setStartingVideoIds((prev) => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
      }
    },
    [applyMediaJob, handleMediaJobFinished, toast],
  );

  useEffect(() => {
    if (!activePollKey) return;

    const poll = () => {
      const active = Object.entries(downloadsRef.current).filter(([, entry]) =>
        isMediaJobActive(entry.status),
      );

      void Promise.all(
        active.map(async ([videoId, entry]) => {
          try {
            const job = await fetchMediaJob(entry.mediaId);
            applyMediaJob(videoId, job);
            if (isMediaJobTerminal(job.status)) {
              handleMediaJobFinished(videoId, job);
            }
          } catch {
            // Giữ trạng thái cũ; lần poll sau thử lại
          }
        }),
      );
    };

    const intervalId = window.setInterval(poll, MEDIA_STATUS_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [activePollKey, applyMediaJob, handleMediaJobFinished]);

  useEffect(() => {
    let cancelled = false;
    void fetchDownloadedMedia()
      .then((items) => {
        if (cancelled) return;
        setDownloadedVideoIds(
          new Set(
            items
              .map((item) => item.videoId)
              .filter((videoId): videoId is string => Boolean(videoId)),
          ),
        );
      })
      .catch(() => {
        // Media service may be unavailable while the admin remains usable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isStarting = (videoId: string) => startingVideoIds.has(videoId);

  const isBusy = (videoId: string) => {
    const entry = downloads[videoId];
    return (
      isStarting(videoId) ||
      (entry != null && isMediaJobActive(entry.status))
    );
  };

  return {
    downloads,
    downloadedVideoIds,
    startDownload,
    isStarting,
    isBusy,
    getDownload: (videoId: string) => downloads[videoId],
  };
};
