// @vitest-environment jsdom
import { act, createElement, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import roomApis from "@/apis/room.apis";
import { useSocket } from "./useSocket";
import { useRoomConnectionWarnings } from "./use-room-connection-warnings";
import { RoomConnectionWarnings } from "@/components/modules/RoomConnectionWarnings";
import type { RoomDeviceConnectionsSnapshot } from "@/@types/Room";

const mocks = vi.hoisted(() => ({
  io: vi.fn(),
  auth: { user: { _id: "admin-1", role: "admin" } as { _id: string; role: string } | null },
  toast: vi.fn(),
}));
vi.mock("socket.io-client", () => ({ default: mocks.io }));
vi.mock("./useAuth", () => ({ default: () => mocks.auth }));
vi.mock("./use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/apis/room.apis", () => ({ default: {
  getDeviceConnections: vi.fn(),
  getRooms: vi.fn(),
} }));

class TestSocket {
  connected = false;
  handlers = new Map<string, Set<(...args: unknown[]) => void>>();
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(callback);
  }
  off(event: string, callback: (...args: unknown[]) => void) {
    this.handlers.get(event)?.delete(callback);
  }
  emit = vi.fn();
  disconnect = vi.fn(() => { this.connected = false; });
  fire(event: string, payload?: unknown) {
    if (event === "connect") this.connected = true;
    if (event === "disconnect") this.connected = false;
    this.handlers.get(event)?.forEach((callback) => callback(payload));
  }
}
const snapshot = (online: boolean): RoomDeviceConnectionsSnapshot => ({
  rooms: online ? ["1", "2"].map((roomId) => ({
    roomId, count: 1, devices: [{ roomId, clientType: "control" as const,
      socketId: roomId, deviceId: roomId, origin: "test", connectedAt: "test" }],
  })) : [],
  totalDevices: online ? 2 : 0,
});
const response = (online: boolean) => ({ data: { result: snapshot(online) } });

const Harness = () => {
  const { state, onSocketReady } = useRoomConnectionWarnings();
  useSocket({ onSocketReady });
  return createElement(RoomConnectionWarnings, { state });
};
// Also exercise extension cleanup directly as a stand-in for provider restoration.
const RestoreHarness = ({ socket, active }: { socket: TestSocket; active: boolean }) => {
  const { state, onSocketReady } = useRoomConnectionWarnings();
  useEffect(() => {
    if (active) return onSocketReady(socket as never);
  }, [active, onSocketReady, socket]);
  return createElement(RoomConnectionWarnings, { state });
};

describe("global room connection monitoring wiring", () => {
  let root: Root;
  let container: HTMLDivElement;
  let socket: TestSocket;
  let client: QueryClient;
  const render = async (element: ReactNode = createElement(Harness)) => {
    await act(async () => root.render(createElement(QueryClientProvider, { client }, element)));
  };
  const fire = async (event: string, payload?: unknown) => {
    await act(async () => socket.fire(event, payload));
  };
  const tick = async (ms: number) => { await act(async () => vi.advanceTimersByTime(ms)); };
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.useFakeTimers();
    mocks.auth.user = { _id: "admin-1", role: "admin" };
    mocks.io.mockReset();
    socket = new TestSocket();
    mocks.io.mockReturnValue(socket);
    vi.mocked(roomApis.getDeviceConnections).mockReset();
    vi.mocked(roomApis.getDeviceConnections).mockResolvedValue(response(true) as never);
    vi.mocked(roomApis.getRooms).mockResolvedValue({ data: { result: [
      { roomId: 1, roomName: "Phòng 101" }, { roomId: 2, roomName: "Phòng 102" },
    ] } } as never);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses one socket and renders every persistent loss, clearing all on recovery", async () => {
    await render();
    await fire("connect");
    expect(mocks.io).toHaveBeenCalledTimes(1);
    expect(roomApis.getDeviceConnections).toHaveBeenCalledTimes(1);
    await fire("device_connections_snapshot", snapshot(false));
    await tick(9999);
    expect(container.textContent).not.toContain("mất kết nối Control");
    await tick(1);
    expect(container.textContent).toContain("Phòng 101 mất kết nối Control");
    expect(container.textContent).toContain("Phòng 102 mất kết nối Control");
    await tick(60_000);
    expect(container.querySelectorAll("li")).toHaveLength(2);
    await fire("device_connections_snapshot", snapshot(true));
    expect(container.textContent).toBe("");
  });

  it("shows admin monitoring interruption, not room losses, and fetches after reconnect", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await render();
    await fire("connect");
    await fire("device_connections_snapshot", snapshot(false));
    await tick(9000);
    await fire("disconnect");
    await tick(20_000);
    expect(container.textContent).toContain("gián đoạn");
    expect(container.querySelectorAll("li")).toHaveLength(0);
    await fire("connect");
    expect(roomApis.getDeviceConnections).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe("");
  });

  it("retains every existing room alert and labels it stale during admin disconnect", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await render();
    await fire("connect");
    await fire("device_connections_snapshot", snapshot(false));
    await tick(10_000);
    await fire("disconnect");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).toContain("trạng thái ghi nhận trước đó");
    await fire("connect");
    expect(container.textContent).toBe("");
  });

  it("reports failed baseline monitoring without inventing losses and recovers on socket data", async () => {
    vi.mocked(roomApis.getDeviceConnections).mockRejectedValue(new Error("unavailable"));
    await render();
    await fire("connect");
    await tick(20_000);
    expect(container.textContent).toContain("gián đoạn");
    expect(container.querySelectorAll("li")).toHaveLength(0);
    await fire("device_connections_snapshot", snapshot(true));
    expect(container.textContent).toBe("");
  });

  it("creates no monitoring socket or UI without an authorized user", async () => {
    mocks.auth.user = null;
    await render();
    expect(mocks.io).not.toHaveBeenCalled();
    expect(roomApis.getDeviceConnections).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });

  it("does not let a late baseline HTTP response override newer socket data", async () => {
    let resolve!: (value: never) => void;
    vi.mocked(roomApis.getDeviceConnections).mockReturnValue(new Promise((done) => { resolve = done; }));
    await render();
    await fire("connect");
    await fire("device_connections_snapshot", snapshot(true));
    await act(async () => resolve(response(false) as never));
    await tick(10_000);
    expect(container.textContent).toBe("");
  });

  it("logout cancels pending warnings, unregisters presence listeners, and clears UI", async () => {
    await render();
    await fire("connect");
    await fire("device_connections_snapshot", snapshot(false));
    await tick(9000);
    mocks.auth.user = null;
    await render();
    await tick(20_000);
    expect(socket.handlers.get("device_connections_snapshot")?.size).toBe(0);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("");
  });

  it("restoring a monitoring lifecycle removes old timers and never-seen history", async () => {
    socket.connected = true;
    await render(createElement(RestoreHarness, { socket, active: true }));
    await fire("device_connections_snapshot", snapshot(false));
    await tick(9000);
    await render(createElement(RestoreHarness, { socket, active: false }));
    vi.mocked(roomApis.getDeviceConnections).mockResolvedValue(response(false) as never);
    await render(createElement(RestoreHarness, { socket, active: true }));
    await tick(20_000);
    expect(container.textContent).toBe("");
  });

  it("unmount removes presence listeners and ignores an in-flight HTTP result", async () => {
    let resolve!: (value: never) => void;
    vi.mocked(roomApis.getDeviceConnections).mockReturnValue(new Promise((done) => { resolve = done; }));
    await render();
    await fire("connect");
    await fire("device_connections_snapshot", snapshot(true));
    await fire("device_connections_snapshot", snapshot(false));
    await act(async () => root.unmount());
    expect(socket.handlers.get("device_connections_snapshot")?.size).toBe(0);
    await act(async () => resolve(response(false) as never));
    await tick(20_000);
    expect(container.textContent).toBe("");
    // Replace the disposed root so the common teardown remains valid.
    root = createRoot(container);
  });
});
