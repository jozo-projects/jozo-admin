import http from "@/utils/http";
import { useIsAdmin } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";

type Release = { versionCode: number; versionName: string; apkUrl: string; sha256: string; sizeBytes: number };
type Config = { enabled: boolean; release: Release | null; verified?: boolean };
type History = Release & { publishedAt: string };
const endpoint = "/tv-release/admin";

function Editor({ config, reload }: { config: Config; reload: () => Promise<unknown> }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<"publish" | "disable" | null>(null);
  const history = useQuery({ queryKey: ["tv-release-history"], queryFn: async () => (await http.get<History[]>(`${endpoint}/history`)).data, refetchOnWindowFocus: false });
  const save = async (enable: boolean) => {
    if (busy || (enable && (!file || file.size === 0 || file.size > 200 * 1024 * 1024))) return;
    setBusy(true); setMessage("");
    setConfirmation(null);
    try {
      if (enable && file) {
        const data = new FormData(); data.append("apk", file);
        await http.post(`${endpoint}/upload`, data, { timeout: 300000 });
      } else await http.put(endpoint, { enabled: false, release: config.release });
      await Promise.all([reload(), history.refetch()]);
      setMessage(enable ? "Đã xác minh và phát hành bản cập nhật." : "Đã tắt cập nhật.");
    } catch (error) {
      const backendMessage = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
      const safeMessage = typeof backendMessage === "string" && backendMessage.trim() && backendMessage.length <= 500 ? backendMessage : "Không xác nhận được kết quả.";
      const warning = "Kiểm tra trạng thái và lịch sử trước khi thử lại.";
      setMessage(safeMessage.includes(warning) ? safeMessage : `${safeMessage} ${warning}`);
      await Promise.all([reload().catch(() => undefined), history.refetch()]);
    } finally { setBusy(false); }
  };
  return <Card><CardHeader><CardTitle>Cập nhật Jozo TV</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">Trạng thái: {config.enabled ? config.verified ? "Đang phát hành" : "Bản cũ chưa xác minh, không cung cấp cho TV" : "Đang tắt"}. TV chỉ gợi ý cập nhật, không bắt buộc. Máy chủ kiểm tra chữ ký, phiên bản và tệp tải về trước khi phát hành.</p>
    {config.release && <p className="text-sm">Hiện tại: {config.release.versionName} ({config.release.versionCode}) · {config.release.sizeBytes} byte · SHA-256: {config.release.sha256}</p>}
    <label className="text-sm">APK đã ký (tối đa 200 MiB)<Input type="file" accept=".apk,application/vnd.android.package-archive" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
    {file && (file.size === 0 || file.size > 200 * 1024 * 1024) && <p role="alert">Kích thước APK không hợp lệ.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={busy || !file || file.size === 0 || file.size > 200 * 1024 * 1024} onClick={() => setConfirmation("publish")}>Kiểm tra và phát hành</Button><Button variant="outline" disabled={busy || !config.enabled} onClick={() => setConfirmation("disable")}>Tắt cập nhật</Button></div>
    {busy && <p role="status" className="text-sm">Đang tải và kiểm tra APK, vui lòng chờ...</p>}{message && <p role="status" className="text-sm">{message}</p>}
    <h3 className="font-medium">Lịch sử phát hành</h3>
    {history.isLoading ? <p>Đang tải lịch sử...</p> : history.isError ? <p role="alert">Không tải được lịch sử.</p> : !history.data?.length ? <p>Chưa có bản phát hành qua công cụ này.</p> : <ul className="space-y-1 text-sm">{history.data.slice().reverse().map(item => <li key={`${item.versionCode}-${item.sha256}`}>{item.versionName} ({item.versionCode}) · {new Date(item.publishedAt).toLocaleString()} · {item.sizeBytes} byte</li>)}</ul>}
    <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !busy) setConfirmation(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmation === "publish" ? "Phát hành bản cập nhật?" : "Tắt cập nhật Jozo TV?"}</DialogTitle>
          <DialogDescription>{confirmation === "publish" ? `APK ${file?.name ?? ""} sẽ được kiểm tra và phát hành cho các TV. Việc cập nhật vẫn là tùy chọn.` : "TV sẽ không thấy bản cập nhật này nữa. Các TV đã cài sẽ không tự quay về phiên bản cũ."}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Hủy</Button>
          <Button disabled={busy} onClick={() => void save(confirmation === "publish")}>{confirmation === "publish" ? "Phát hành" : "Tắt cập nhật"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardContent></Card>;
}
export default function TvReleaseConfig() {
  const isAdmin = useIsAdmin();
  const query = useQuery({ queryKey: ["tv-release-admin"], queryFn: async () => (await http.get<Config>(endpoint)).data, enabled: isAdmin, refetchOnWindowFocus: false });
  if (!isAdmin) return null;
  if (query.isLoading) return <p role="status">Đang tải bản phát hành TV...</p>;
  if (query.isError || !query.data) return <Card><CardContent className="pt-6"><p role="alert">Không tải được cấu hình TV.</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></CardContent></Card>;
  return <Editor key={JSON.stringify(query.data)} config={query.data} reload={async () => { const result = await query.refetch(); if (result.isError) throw result.error; }} />;
}
