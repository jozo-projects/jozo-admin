import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { AppSidebar } from "./AppSideBar";
import DaySky, { getSkyState, SkyGreeting, useCurrentTime } from "./DaySky";
import { MessengerInbox } from "../shared/MessengerInbox";
import { NotificationBell } from "../shared/NotificationBell";
import { PageHeaderTargetContext } from "./page-header-context";

const SHOW_SKY_PREVIEW = false;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewHour, setPreviewHour] = useState<number | null>(null);
  const currentTime = useCurrentTime();
  const skyTime = new Date(currentTime);
  if (SHOW_SKY_PREVIEW && previewHour !== null) skyTime.setHours(previewHour, 0, 0, 0);
  const isNight = !getSkyState(skyTime).isDay;
  const [pageHeaderTarget, setPageHeaderTarget] = useState<HTMLDivElement | null>(null);

  // Kiểm tra chế độ và áp dụng từ localStorage nếu có
  useEffect(() => {
    const darkMode = localStorage.getItem("theme") === "dark";
    setIsDarkMode(darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  // Hàm chuyển đổi chế độ sáng/tối
  const toggleDarkMode = () => {
    setIsDarkMode((prevMode) => {
      const newMode = !prevMode;
      document.documentElement.classList.toggle("dark", newMode);
      localStorage.setItem("theme", newMode ? "dark" : "light");
      return newMode;
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className={`relative isolate min-w-0 text-foreground ${isNight ? "dark" : ""}`}>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div ref={setPageHeaderTarget} className="min-w-0 flex-1" />
          <div className="ml-auto flex items-center gap-1">
            <DaySky now={skyTime} preview={SHOW_SKY_PREVIEW && previewHour !== null} />
            <SkyGreeting now={skyTime} />
            <MessengerInbox />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              title="Toggle Theme"
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Moon /> : <Sun />}
            </Button>
          </div>
        </header>
        {SHOW_SKY_PREVIEW && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b bg-card/85 px-4 py-2 text-xs backdrop-blur-sm">
          <label htmlFor="sky-preview-hour" className="shrink-0 font-medium">Thử giờ bầu trời</label>
          <span className="text-muted-foreground">00</span>
          <input id="sky-preview-hour" type="range" min={0} max={23} step={1} value={previewHour ?? currentTime.getHours()} onChange={(event) => setPreviewHour(Number(event.target.value))} aria-valuetext={`${String(skyTime.getHours()).padStart(2, "0")}:00`} className="min-w-24 flex-1 accent-orange-500 sm:max-w-64" />
          <span className="text-muted-foreground">23</span>
          <output htmlFor="sky-preview-hour" className="w-10 font-semibold tabular-nums">{String(skyTime.getHours()).padStart(2, "0")}:{String(skyTime.getMinutes()).padStart(2, "0")}</output>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={previewHour === null} onClick={() => setPreviewHour(null)}>{previewHour === null ? "Giờ thực" : "Về giờ thực"}</Button>
        </div>}
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6 [&>*]:min-w-0">
          <PageHeaderTargetContext.Provider value={pageHeaderTarget}>
            {children}
          </PageHeaderTargetContext.Provider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
