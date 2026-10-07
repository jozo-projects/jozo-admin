import axios from "axios";

export type MediaStatus =
  | "pending"
  | "downloading"
  | "encoding"
  | "uploading"
  | "ready"
  | "failed";

export interface MediaJob {
  id: string;
  videoId?: string;
  title?: string;
  type: "video" | "audio";
  status: MediaStatus;
  hlsPath?: string;
  hlsUrl?: string;
  r2Prefix?: string;
  uploadedObjectCount?: number;
  totalObjectCount?: number;
  uploadedBytes?: number;
  totalBytes?: number;
  uploadProgress?: number;
  currentObjectKey?: string;
  error?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MediaEnvelope {
  success: boolean;
  data: MediaJob;
  message?: string;
}

export const mediaWorkerBaseUrl =
  import.meta.env.VITE_MEDIA_WORKER_URL || "http://localhost:4001";

const mediaWorkerHttp = axios.create({
  baseURL: mediaWorkerBaseUrl,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

const mediaWorkerApis = {
  createHls: async (payload: { videoId: string; title?: string }) => {
    const response = await mediaWorkerHttp.post<MediaEnvelope>("/api/media", {
      ...payload,
      type: "video",
    });
    return response.data.data;
  },
  getMedia: async (mediaId: string) => {
    const response = await mediaWorkerHttp.get<MediaEnvelope>(`/api/media/${mediaId}`);
    return response.data.data;
  },
  listMedia: async (limit = 20_000) => {
    const response = await mediaWorkerHttp.get<{
      success: boolean;
      data: MediaJob[];
    }>("/api/media", { params: { limit } });
    return response.data.data;
  },
  getMediaEventsUrl: (mediaId: string) =>
    `${mediaWorkerBaseUrl}/api/media/${mediaId}/events`,
};

export default mediaWorkerApis;
