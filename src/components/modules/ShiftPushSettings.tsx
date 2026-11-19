import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuth from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { disablePush, enablePush, getPushConfig, pushEnabled, pushSupport, PushSetupError } from '@/services/shift-push';

function Settings({ owner }: { owner: string }) {
  const unsupported = pushSupport();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const config = useQuery({ queryKey: ['shift-push-config', owner], queryFn: getPushConfig, enabled: !unsupported, retry: false });
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if ('Notification' in window) setPermission(Notification.permission);
      void pushEnabled(owner).then(value => { if (alive) setEnabled(value); }).catch(() => { if (alive) setMessage('Không đọc được trạng thái thông báo trên thiết bị.'); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); };
  }, [owner]);
  const act = async (turnOn: boolean) => {
    setBusy(true); setMessage('');
    try {
      if (turnOn) {
        await enablePush(owner, config.data!.publicKey);
        setMessage('Đã lưu đăng ký trên trình duyệt này. Việc gửi phụ thuộc dịch vụ nhắc ca và cài đặt hệ thống.');
      } else {
        const revoked = await disablePush();
        setMessage(revoked ? 'Đã tắt thông báo trên trình duyệt này.' : 'Đã chặn hiển thị trên thiết bị; chưa xác nhận xóa đăng ký máy chủ. Có thể thử tắt lại.');
      }
    } catch (error) { setMessage(turnOn && error instanceof PushSetupError ? error.message : 'Chưa thể hoàn tất. Kiểm tra quyền, kết nối và phiên đăng nhập rồi thử lại.'); }
    finally {
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
      setEnabled(await pushEnabled(owner).catch(() => false)); setBusy(false);
    }
  };
  return <Card className="mb-4">
    <CardHeader><CardTitle>Thông báo nhắc đăng ký ca</CardTitle><CardDescription>Tùy chọn riêng cho tài khoản và trình duyệt này. Đăng ký không đảm bảo thông báo sẽ được gửi hoặc nhận.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-2">
      {unsupported ? <p>{unsupported}</p> : <>
        <p>Quyền trình duyệt: {permission === 'granted' ? 'Đã cho phép' : permission === 'denied' ? 'Đã chặn — mở cài đặt trang để cho phép lại.' : 'Chưa cấp quyền'}.</p>
        {config.data?.configured && <p>{enabled ? 'Đã bật cho tài khoản này.' : 'Chưa bật cho tài khoản này.'}</p>}
        {config.isPending && <p>Đang kiểm tra dịch vụ...</p>}
        {config.isError && <p role="alert">Không tải được cấu hình thông báo.</p>}
        {config.data && !config.data.configured && <p>Thông báo trên thiết bị chưa sẵn sàng. Vui lòng xem nhắc nhở trong ứng dụng.</p>}
      </>}
      {message && <p role="status">{message}</p>}
    </CardContent>
    <CardFooter className="flex flex-wrap gap-2">
      <Button disabled={!!unsupported || busy || enabled || permission === 'denied' || !config.data?.configured || !config.data.publicKey} onClick={() => void act(true)}>{busy ? 'Đang xử lý...' : 'Bật thông báo trên thiết bị'}</Button>
      <Button variant="outline" disabled={busy || !!unsupported} onClick={() => void act(false)}>Tắt thông báo trên thiết bị</Button>
      {config.isError && <Button variant="outline" disabled={busy || config.isFetching} onClick={() => void config.refetch()}>Thử tải lại</Button>}
    </CardFooter>
  </Card>;
}
export default function ShiftPushSettings() {
  const { user } = useAuth();
  return user ? <Settings key={user._id} owner={user._id} /> : null;
}
