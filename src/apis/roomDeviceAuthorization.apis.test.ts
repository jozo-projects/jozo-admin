import { describe, expect, it, vi } from "vitest";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/utils/http", () => ({ default: http }));
import api from "./roomDeviceAuthorization.apis";

describe("room device authorization API", () => {
  it("uses the raw admin endpoints and sends compare-and-swap payloads", () => {
    api.list();
    api.approve({ roomId: 7, clientType: "control", id: "request", expectedActiveId: null });
    api.revoke({ roomId: 7, clientType: "control", expectedActiveId: "current" });
    expect(http.get).toHaveBeenCalledWith("/room-device-authorization/admin");
    expect(http.post).toHaveBeenCalledWith("/room-device-authorization/admin/approve", { roomId: 7, clientType: "control", id: "request", expectedActiveId: null });
    expect(http.post).toHaveBeenCalledWith("/room-device-authorization/admin/revoke", { roomId: 7, clientType: "control", expectedActiveId: "current" });
  });
});
