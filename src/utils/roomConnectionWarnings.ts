import type { RoomDeviceConnectionsSnapshot } from "@/@types/Room";

export type RoomConnectionLoss = {
  roomId: string;
  clientType: "control" | "video";
};
export type RoomMonitoringStatus = "inactive" | "syncing" | "live" | "unavailable";
export type RoomConnectionWarningState = {
  status: RoomMonitoringStatus;
  losses: RoomConnectionLoss[];
};

const LOSS_DELAY_MS = 10_000;

/** Tracks only previously observed room/type groups, never all configured rooms. */
export class RoomConnectionWarningTracker {
  private known = new Map<string, RoomConnectionLoss>();
  private losses = new Map<string, RoomConnectionLoss>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private status: RoomMonitoringStatus = "inactive";
  private revision = 0;
  private disposed = false;

  constructor(private publish: (state: RoomConnectionWarningState) => void) {}

  private emit() {
    this.publish({ status: this.status, losses: [...this.losses.values()] });
  }

  private cancelTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  /** Token invalidates HTTP responses after newer socket data or connection changes. */
  beginSync() {
    this.cancelTimers();
    this.status = "syncing";
    const token = ++this.revision;
    this.emit();
    return token;
  }

  applyHttp(snapshot: RoomDeviceConnectionsSnapshot, token: number) {
    if (this.disposed || token !== this.revision) return;
    this.applySnapshot(snapshot);
  }

  syncFailed(token: number) {
    if (!this.disposed && token === this.revision) this.pause();
  }

  applySnapshot(snapshot: RoomDeviceConnectionsSnapshot) {
    if (this.disposed) return;
    ++this.revision;
    this.status = "live";
    const present = new Set<string>();
    for (const room of snapshot.rooms) {
      for (const device of room.devices) {
        if (device.clientType !== "control" && device.clientType !== "video") continue;
        const group = { roomId: String(room.roomId), clientType: device.clientType };
        const key = JSON.stringify([group.roomId, group.clientType]);
        present.add(key);
        this.known.set(key, group);
      }
    }
    for (const [key, group] of this.known) {
      if (present.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
        this.losses.delete(key);
      } else if (!this.losses.has(key) && !this.timers.has(key)) {
        this.timers.set(key, setTimeout(() => {
          this.timers.delete(key);
          this.losses.set(key, group);
          this.emit();
        }, LOSS_DELAY_MS));
      }
    }
    this.emit();
  }

  /** Admin transport loss is not evidence of room loss. Keep old alerts as stale. */
  pause() {
    if (this.disposed) return;
    ++this.revision;
    this.cancelTimers();
    this.status = "unavailable";
    this.emit();
  }

  dispose() {
    this.disposed = true;
    ++this.revision;
    this.cancelTimers();
    this.known.clear();
    this.losses.clear();
  }
}
