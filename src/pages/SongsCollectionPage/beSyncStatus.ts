import type { MediaJob } from "@/apis/mediaWorker.apis";

type CatalogMedia = {
  media_id?: string;
  media_status?: string;
  hls_url?: string;
};

export function getBeSyncView(
  job: Pick<MediaJob, "id" | "status" | "hlsUrl" | "beSyncStatus" | "beSyncError" | "beSyncUpdatedAt">,
  catalog: CatalogMedia,
): { label: string; canRetry: boolean; error?: string } {
  const matchesCatalog = Boolean(
    job.hlsUrl && catalog.media_status === "ready" &&
      catalog.media_id === job.id && catalog.hls_url === job.hlsUrl,
  );
  if (matchesCatalog) return { label: "Đã đồng bộ BE", canRetry: false };
  if (job.status !== "ready" || !job.hlsUrl) {
    return { label: "Chưa sẵn sàng đồng bộ BE", canRetry: false };
  }
  switch (job.beSyncStatus) {
    case "syncing":
      if (job.beSyncUpdatedAt && Date.now() - new Date(job.beSyncUpdatedAt).getTime() > 5 * 60_000) {
        return { label: "Đồng bộ BE quá hạn", canRetry: true };
      }
      return { label: "Đang gửi kết quả tới BE", canRetry: false };
    case "synced":
      return { label: "BE báo đã nhận; đang kiểm tra catalog", canRetry: false };
    case "failed":
      return { label: "Đồng bộ BE lỗi", canRetry: true, ...(job.beSyncError ? { error: job.beSyncError } : {}) };
    case "pending":
      return { label: "Chờ gửi kết quả tới BE", canRetry: true };
    default:
      return { label: "Worker xong, chưa xác nhận BE", canRetry: true };
  }
}
