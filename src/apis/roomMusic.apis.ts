import { Song } from "@/@types/RoomMusic";
import http from "@/utils/http";

const ROOM_MUSIC_CONTROLLER = "/room-music";
const ROOMS_MUSIC_CONTROLLER = "/rooms-music";

/** POST /room-music/songs/prune-unavailable-youtube — `result` từ BE (sync) */
export interface PruneUnavailableYoutubeResult {
  checked: number;
  skipped_unknown: number;
  unavailable_on_youtube: number;
  removed_from_db: number;
  dry_run: boolean;
  /** Rỗng khi gọi với `omit_ids=1` */
  video_ids_removed_or_would_remove?: string[];
}

export type SongPruneJobStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface CancelSongPruneResponse {
  message: string;
  job: SongPruneJob;
}

/** Job async + GET .../status + socket `song_prune_*` */
export interface SongPruneJob {
  job_id: string;
  status: SongPruneJobStatus | string;
  source?: string;
  total: number;
  checked: number;
  percent: number;
  removed_from_db: number;
  unavailable_on_youtube: number;
  skipped_unknown: number;
  elapsed_sec?: number;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  dry_run?: boolean;
}

export type PruneUnavailableYoutubeParams = {
  dryRun?: boolean;
  /** `omit_ids=1` — BE không trả mảng video_id (chỉ số liệu) */
  omitIds?: boolean;
  concurrency?: number;
  batchSize?: number;
};

const appendPruneQueryParams = (
  queryParams: URLSearchParams,
  params?: PruneUnavailableYoutubeParams,
) => {
  if (params?.dryRun) {
    queryParams.append("dry_run", "1");
  }
  if (params?.omitIds) {
    queryParams.append("omit_ids", "1");
  }
  if (params?.concurrency != null) {
    queryParams.append("concurrency", String(params.concurrency));
  }
  if (params?.batchSize != null) {
    queryParams.append("batch_size", String(params.batchSize));
  }
};

/** Job toàn thư viện có thể rất lâu; tăng thêm ở proxy nếu cần */
const PRUNE_YOUTUBE_TIMEOUT_MS = 1_800_000;

interface SongsCollectionResponse {
  songs: Song[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface MoveMusicQueueRequest {
  targetRoomId: string;
}

const roomsMusicApis = {
  getQueue: (roomId: string) =>
    http.get<HTTPResponse<{ queue: Song[]; nowPlaying: Song | null }>>(
      `${ROOM_MUSIC_CONTROLLER}/${roomId}`,
    ),
  resolveRequest: (roomId: string) =>
    http.post<HTTPResponse>(
      `${ROOMS_MUSIC_CONTROLLER}/${roomId}/solve-request`
    ),
  /** POST /room-music/:roomId/move-queue — chuyển queue nhạc sang phòng khác */
  moveQueue: (roomId: string, payload: MoveMusicQueueRequest) =>
    http.post<HTTPResponse<{ movedCount: number }>>(
      `${ROOM_MUSIC_CONTROLLER}/${roomId}/move-queue`,
      payload,
    ),
  getSongsCollection: (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    }
    if (params?.keyword) {
      queryParams.append("keyword", params.keyword);
    }
    const queryString = queryParams.toString();
    return http.get<HTTPResponse<SongsCollectionResponse>>(
      `${ROOM_MUSIC_CONTROLLER}/songs-collection${queryString ? `?${queryString}` : ""}`
    );
  },
  normalizeSongs: () =>
    http.post<HTTPResponse>(
      `${ROOM_MUSIC_CONTROLLER}/songs/normalize`
    ),
  pruneUnavailableYoutube: (params?: PruneUnavailableYoutubeParams) => {
    const queryParams = new URLSearchParams();
    appendPruneQueryParams(queryParams, params);
    const qs = queryParams.toString();
    return http.post<HTTPResponse<PruneUnavailableYoutubeResult>>(
      `${ROOM_MUSIC_CONTROLLER}/songs/prune-unavailable-youtube${qs ? `?${qs}` : ""}`,
      undefined,
      { timeout: PRUNE_YOUTUBE_TIMEOUT_MS },
    );
  },
  /** POST ?async=1 — 202, job chạy nền */
  startPruneUnavailableYoutubeAsync: (
    params?: PruneUnavailableYoutubeParams,
  ) => {
    const queryParams = new URLSearchParams({ async: "1" });
    appendPruneQueryParams(queryParams, params);
    const qs = queryParams.toString();
    return http.post<HTTPResponse<SongPruneJob>>(
      `${ROOM_MUSIC_CONTROLLER}/songs/prune-unavailable-youtube?${qs}`,
      undefined,
      { timeout: 60_000 },
    );
  },
  getPruneUnavailableYoutubeStatus: () =>
    http.get<HTTPResponse<SongPruneJob | null>>(
      `${ROOM_MUSIC_CONTROLLER}/songs/prune-unavailable-youtube/status`,
      { timeout: 30_000 },
    ),
  /** Hủy job async đang chạy (cron hoặc API) */
  cancelPruneUnavailableYoutube: () =>
    http.post<CancelSongPruneResponse>(
      `${ROOM_MUSIC_CONTROLLER}/songs/prune-unavailable-youtube/cancel`,
      undefined,
      { timeout: 30_000 },
    ),
  deleteSong: (videoId: string) =>
    http.delete<HTTPResponse>(
      `${ROOM_MUSIC_CONTROLLER}/songs-collection/${videoId}`
    ),
};

export default roomsMusicApis;
