import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomDeviceConnectionsSnapshot } from "@/@types/Room";
import { RoomConnectionWarningTracker } from "./roomConnectionWarnings";

const snapshot = (...groups: [string, "control" | "video" | "unknown", number][]): RoomDeviceConnectionsSnapshot => ({
  rooms: groups.map(([roomId, clientType, count]) => ({
    roomId, count,
    devices: Array.from({ length: count }, (_, i) => ({
      roomId, clientType, socketId: `socket-${i}`, deviceId: `device-${i}`,
      origin: "test", connectedAt: "2026-01-01T00:00:00Z",
    })),
  })),
  totalDevices: groups.reduce((sum, [, , count]) => sum + count, 0),
});

describe("room connection loss tracker", () => {
  const publish = vi.fn();
  let tracker: RoomConnectionWarningTracker;
  beforeEach(() => {
    vi.useFakeTimers();
    publish.mockClear();
    tracker = new RoomConnectionWarningTracker(publish);
    tracker.beginSync();
  });
  afterEach(() => {
    tracker.dispose();
    vi.useRealTimers();
  });
  const losses = () => publish.mock.lastCall?.[0].losses;

  it("warns at 10 seconds, not before, and persists until recovery", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(9999);
    expect(losses()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(losses()).toEqual([{ roomId: "101", clientType: "control" }]);
    vi.advanceTimersByTime(60_000);
    expect(losses()).toHaveLength(1);
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    expect(losses()).toEqual([]);
  });

  it("cancels a pending loss when restored before threshold", () => {
    tracker.applySnapshot(snapshot(["101", "video", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(9000);
    tracker.applySnapshot(snapshot(["101", "video", 1]));
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(losses()).toEqual([]);
  });

  it("does not warn when only one of duplicate tabs closes", () => {
    tracker.applySnapshot(snapshot(["101", "control", 2]));
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    vi.advanceTimersByTime(20_000);
    expect(losses()).toEqual([]);
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(10_000);
    expect(losses()).toHaveLength(1);
  });

  it("keeps independent warnings for every room and client type", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1], ["101", "video", 1], ["102", "control", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(10_000);
    expect(losses()).toHaveLength(3);
    tracker.applySnapshot(snapshot(["101", "video", 1]));
    expect(losses()).toEqual([
      { roomId: "101", clientType: "control" },
      { roomId: "102", clientType: "control" },
    ]);
  });

  it("does not invent losses for never-seen rooms or unknown clients", () => {
    tracker.applySnapshot(snapshot(["101", "unknown", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(10_000);
    expect(losses()).toEqual([]);
  });

  it("repeated snapshots do not extend the original loss deadline", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(5000);
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(5000);
    expect(losses()).toHaveLength(1);
  });

  it("admin disconnect cancels pending loss, then reconnect starts a fresh deadline", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(9000);
    tracker.pause();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(30_000);
    expect(losses()).toEqual([]);
    const token = tracker.beginSync();
    tracker.applyHttp(snapshot(), token);
    vi.advanceTimersByTime(9999);
    expect(losses()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(losses()).toHaveLength(1);
  });

  it("retains established alerts as stale while monitoring is unavailable", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(10_000);
    tracker.pause();
    expect(publish.mock.lastCall?.[0].status).toBe("unavailable");
    expect(losses()).toHaveLength(1);
    const token = tracker.beginSync();
    tracker.applyHttp(snapshot(["101", "control", 1]), token);
    expect(losses()).toEqual([]);
  });

  it("ignores stale HTTP snapshots after a newer socket snapshot", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    const token = tracker.beginSync();
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    tracker.applyHttp(snapshot(), token);
    tracker.syncFailed(token);
    vi.advanceTimersByTime(10_000);
    expect(losses()).toEqual([]);
    expect(publish.mock.lastCall?.[0].status).toBe("live");
  });

  it("ignores HTTP from an earlier transport connection", () => {
    const oldToken = tracker.beginSync();
    tracker.pause();
    const token = tracker.beginSync();
    tracker.applyHttp(snapshot(["101", "control", 1]), token);
    tracker.applyHttp(snapshot(), oldToken);
    vi.advanceTimersByTime(10_000);
    expect(losses()).toEqual([]);
  });

  it("disposal cancels timers and ignores late HTTP/socket results", () => {
    tracker.applySnapshot(snapshot(["101", "control", 1]));
    const token = tracker.beginSync();
    tracker.applySnapshot(snapshot());
    tracker.dispose();
    const calls = publish.mock.calls.length;
    tracker.applyHttp(snapshot(), token);
    tracker.applySnapshot(snapshot());
    vi.advanceTimersByTime(20_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(publish).toHaveBeenCalledTimes(calls);
  });
});
