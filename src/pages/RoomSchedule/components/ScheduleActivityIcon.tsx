import { IRoomSchedule } from "@/@types/Room";
import { Gamepad2, Mic2 } from "lucide-react";

export default function ScheduleActivityIcon({ activityType }: { activityType: IRoomSchedule["activityType"] }) {
  const className = "h-3.5 w-3.5 shrink-0 text-white";
  if (activityType === "nintendo-switch") {
    return <Gamepad2 className={className} aria-label="Nintendo Switch" />;
  }
  if (activityType === "music-box") {
    return <Mic2 className={className} aria-label="Music Box" />;
  }
  return null;
}
