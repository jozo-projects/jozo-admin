import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuth from '@/hooks/useAuth';
import { getPushConfig } from '@/services/shift-push';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function Status({ owner }: { owner: string }) {
  const [copyMessage, setCopyMessage] = useState('');
  const config = useQuery({ queryKey: ['shift-push-config', owner], queryFn: getPushConfig, retry: false });
  const publicKey = config.data?.configured && typeof config.data.publicKey === 'string' ? config.data.publicKey : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopyMessage('Đã sao chép khóa công khai.');
    } catch {
      setCopyMessage('Không thể sao chép. Hãy chọn và sao chép khóa thủ công.');
    }
  };
  return <Card className="mb-4">
    <CardHeader>
      <CardTitle>Web Push</CardTitle>
      <CardDescription>Danh tính Web Push được hệ thống tự động tạo và lưu. Quyền nhận thông báo được quản lý riêng trên từng trình duyệt.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {config.isPending ? <p>Đang kiểm tra trạng thái Web Push...</p> : config.isError ? <>
        <p role="alert">Không tải được trạng thái Web Push.</p>
        <Button variant="outline" disabled={config.isFetching} onClick={() => void config.refetch()}>Thử tải lại</Button>
      </> : publicKey ? <>
        <p>Máy chủ Web Push sẵn sàng. Điều này không đảm bảo thông báo được gửi hoặc nhận.</p>
        <div><p className="font-medium">Khóa công khai</p><code className="block break-all rounded-md border bg-muted p-2">{publicKey}</code></div>
        <Button variant="outline" onClick={() => void copy()}>Sao chép khóa công khai</Button>
        {copyMessage && <p role="status">{copyMessage}</p>}
      </> : <p>Web Push chưa sẵn sàng; khóa công khai hiện không khả dụng.</p>}
    </CardContent>
  </Card>;
}
export default function WebPushStatus() {
  const { user } = useAuth();
  return user ? <Status key={user._id} owner={user._id} /> : null;
}
