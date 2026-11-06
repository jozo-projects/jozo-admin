import { useEffect, useState } from "react";
import "./day-sky.css";

export function getSkyState(date: Date) {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const isDay = hour >= 6 && hour < 18;
  const progress = isDay ? (hour - 6) / 12 : ((hour + 6) % 24) / 12;
  return { isDay, progress, hour };
}

export function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const refresh = () => setNow(new Date());
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return now;
}

export function SkyGreeting({ now }: { now: Date }) {
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : "Good evening";
  return <span className="max-w-20 shrink truncate text-xs text-muted-foreground sm:max-w-none sm:shrink-0 sm:text-sm">{greeting}</span>;
}

export default function DaySky({ now, preview = false }: { now: Date; preview?: boolean }) {
  const { isDay, progress } = getSkyState(now);
  const x = 7 + progress * 86;
  const y = 86 - Math.sin(progress * Math.PI) * 67;

  return (
    <div className={`day-sky ${isDay ? "day-sky--day" : "day-sky--night"} ${preview ? "day-sky--preview" : ""}`} aria-hidden="true">
      <div className="day-sky__scene">
        {!isDay && <div className="day-sky__stars">{Array.from({ length: 17 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 9) % 100}%`, top: `${(i * 23 + 7) % 65}%`, animationDelay: `${i * -0.23}s` }} />)}</div>}
        <div key={isDay ? "day" : "night"} className="day-sky__orbit" style={{ left: `${x}%`, top: `${y}%` }}>
          <div className={isDay ? "day-sky__sun" : "day-sky__moon"} />
        </div>
        <div className="day-sky__horizon" />
      </div>
    </div>
  );
}
