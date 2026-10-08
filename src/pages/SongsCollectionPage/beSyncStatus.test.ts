import { describe, expect, it } from "vitest";
import { getBeSyncView } from "./beSyncStatus";

describe("BE media sync status", () => {
  const job = { id: "media-1", status: "ready" as const, hlsUrl: "https://media.example/master.m3u8" };
  const catalog = { media_id: "media-1", media_status: "ready", hls_url: job.hlsUrl };

  it("requires the BE catalog to match the worker media id and URL", () => {
    expect(getBeSyncView({ ...job, beSyncStatus: "synced" }, catalog)).toEqual({ label: "Đã đồng bộ BE", canRetry: false });
    expect(getBeSyncView({ ...job, beSyncStatus: "synced" }, { ...catalog, media_id: "older" }).label).not.toBe("Đã đồng bộ BE");
    expect(getBeSyncView({ ...job, beSyncStatus: "synced" }, { ...catalog, hls_url: "https://old/master.m3u8" }).label).not.toBe("Đã đồng bộ BE");
  });

  it("shows callback stages separately from R2 readiness", () => {
    expect(getBeSyncView({ ...job, beSyncStatus: "syncing" }, {}).label).toBe("Đang gửi kết quả tới BE");
    expect(getBeSyncView({ ...job, beSyncStatus: "failed", beSyncError: "HTTP 401" }, {})).toEqual({ label: "Đồng bộ BE lỗi", canRetry: true, error: "HTTP 401" });
    expect(getBeSyncView({ ...job, beSyncStatus: "syncing", beSyncUpdatedAt: "2020-01-01T00:00:00.000Z" }, {})).toEqual({ label: "Đồng bộ BE quá hạn", canRetry: true });
    expect(getBeSyncView(job, {})).toEqual({ label: "Worker xong, chưa xác nhận BE", canRetry: true });
  });

  it("does not retry upload failures or duplicate an already mapped catalog", () => {
    expect(getBeSyncView({ ...job, status: "failed", beSyncStatus: "failed" }, {}).canRetry).toBe(false);
    expect(getBeSyncView({ ...job, beSyncStatus: "failed" }, catalog).canRetry).toBe(false);
  });
});
