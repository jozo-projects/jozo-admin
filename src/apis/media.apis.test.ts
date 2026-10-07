import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMediaJob,
  fetchDownloadedMedia,
  fetchMediaJob,
} from "./media.apis";

describe("media API envelope", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unwraps the backend data envelope when creating a media job", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "media-123",
              videoId: "video-123",
              status: "downloading",
              poll: true,
            },
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(createMediaJob("video-123")).resolves.toMatchObject({
      id: "media-123",
      videoId: "video-123",
      status: "downloading",
    });
  });

  it("keeps terminal ready status and HLS URL from the backend envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "media-123",
              videoId: "video-123",
              status: "ready",
              hlsUrl: "http://localhost:4001/hls/media-123/hls/index.m3u8",
              poll: false,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(fetchMediaJob("media-123")).resolves.toMatchObject({
      id: "media-123",
      status: "ready",
      hlsUrl: "http://localhost:4001/hls/media-123/hls/index.m3u8",
    });
  });

  it("loads the persistent list of ready downloaded videos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: "media-123",
                videoId: "video-123",
                status: "ready",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(fetchDownloadedMedia()).resolves.toMatchObject([
      { id: "media-123", videoId: "video-123", status: "ready" },
    ]);
  });
});
