const MEDIA_SERVICE_URL =
  import.meta.env.VITE_MEDIA_SERVICE_URL ?? "http://localhost:4001";

export type MediaStatus =
  | "pending"
  | "downloading"
  | "encoding"
  | "ready"
  | "failed";

export interface MediaJob {
  id: string;
  videoId?: string;
  status: MediaStatus;
  hlsUrl?: string;
  error?: string;
}

const parseMediaJob = (data: Record<string, unknown>): MediaJob => {
  const payload =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data;
  const id = String(payload.id ?? payload.mediaId ?? payload._id ?? "");
  const status = String(payload.status ?? "pending") as MediaStatus;

  return {
    id,
    videoId: payload.videoId != null ? String(payload.videoId) : undefined,
    status,
    hlsUrl: payload.hlsUrl != null ? String(payload.hlsUrl) : undefined,
    error:
      payload.error != null
        ? String(payload.error)
        : payload.errorMessage != null
          ? String(payload.errorMessage)
          : undefined,
  };
};

const mediaFetch = async (
  path: string,
  init?: RequestInit,
): Promise<MediaJob> => {
  const response = await fetch(`${MEDIA_SERVICE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return parseMediaJob(body);
};

const mediaListFetch = async (path: string): Promise<MediaJob[]> => {
  const response = await fetch(`${MEDIA_SERVICE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  const items = Array.isArray(body.data) ? body.data : [];
  return items
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object" && !Array.isArray(item),
    )
    .map(parseMediaJob);
};

export const createMediaJob = (videoId: string) =>
  mediaFetch("/api/media", {
    method: "POST",
    body: JSON.stringify({ videoId }),
  });

export const fetchMediaJob = (mediaId: string) =>
  mediaFetch(`/api/media/${mediaId}`);

export const fetchDownloadedMedia = () =>
  mediaListFetch("/api/media?status=ready&limit=20000");

export const isMediaJobActive = (status?: MediaStatus) =>
  status === "pending" ||
  status === "downloading" ||
  status === "encoding";

export const isMediaJobTerminal = (status?: MediaStatus) =>
  status === "ready" || status === "failed";
