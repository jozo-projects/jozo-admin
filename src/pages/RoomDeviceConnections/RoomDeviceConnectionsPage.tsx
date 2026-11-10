import type {
  IRoom,
  RoomDeviceClientType,
  RoomDeviceConnection,
  RoomDeviceRoomGroup,
} from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import MoveQueueDialog from "./MoveQueueDialog";
import DeviceAuthorizations from "./DeviceAuthorizations";
import DeviceAuthorizationConfig from "./DeviceAuthorizationConfig";
import OnlineGameBookingConfig from "./OnlineGameBookingConfig";
import { Page, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRoomDeviceConnections } from "@/hooks/use-room-device-connections";
import { formatUTCToLocal, timeAgo } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  MonitorSmartphone,
  RefreshCcw,
  Tv,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";

const CLIENT_TYPE_META: Record<
  RoomDeviceClientType,
  { label: string; className: string; icon: typeof MonitorSmartphone }
> = {
  control: {
    label: "Control",
    className: "border-transparent bg-emerald-100 text-emerald-800",
    icon: MonitorSmartphone,
  },
  video: {
    label: "Video",
    className: "border-transparent bg-sky-100 text-sky-800",
    icon: Tv,
  },
  unknown: {
    label: "Unknown",
    className: "border-transparent bg-muted text-muted-foreground",
    icon: Wifi,
  },
};

const ClientTypeBadge = ({ type }: { type: RoomDeviceClientType }) => {
  const meta = CLIENT_TYPE_META[type] ?? CLIENT_TYPE_META.unknown;
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", meta.className)}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
};

const DeviceRow = ({ device, onMoveQueue }: { device: RoomDeviceConnection; onMoveQueue: () => void }) => (
  <TableRow>
    <TableCell className="font-medium">{device.deviceId}</TableCell>
    <TableCell>
      <div className="flex flex-wrap items-center gap-2">
        <ClientTypeBadge type={device.clientType} />
        {device.clientType === "control" && <Button variant="outline" size="sm" onClick={onMoveQueue}>Chuyển bài hát</Button>}
      </div>
    </TableCell>
    <TableCell className="max-w-[220px] truncate text-muted-foreground">
      {device.origin || "—"}
    </TableCell>
    <TableCell className="font-mono text-xs text-muted-foreground">
      {device.socketId}
    </TableCell>
    <TableCell>
      <div className="flex flex-col gap-0.5">
        <span>{formatUTCToLocal(device.connectedAt)}</span>
        <span className="text-xs text-muted-foreground">
          {timeAgo(device.connectedAt)}
        </span>
      </div>
    </TableCell>
  </TableRow>
);

const RoomGroupCard = ({
  group,
  roomName,
  onMoveQueue,
}: {
  group: RoomDeviceRoomGroup;
  roomName?: string;
  onMoveQueue: () => void;
}) => (
  <Card>
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
      <div className="min-w-0 break-words">
        <CardTitle className="text-base">
          {roomName || `Phòng ${group.roomId}`}
        </CardTitle>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Room ID: {group.roomId}
        </p>
      </div>
      <Badge variant="secondary">{group.count} thiết bị</Badge>
    </CardHeader>
    <CardContent className="px-0 pb-0 sm:px-0">
      <div className="space-y-3 px-4 pb-4 sm:hidden">
        {group.devices.map((device) => (
          <div key={`${device.deviceId}-${device.socketId}`} className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-all font-medium">{device.deviceId}</span>
              <ClientTypeBadge type={device.clientType} />
            </div>
            <dl className="space-y-1 text-muted-foreground">
              <div><dt className="inline">Origin: </dt><dd className="inline break-all">{device.origin || "—"}</dd></div>
              <div><dt className="inline">Socket ID: </dt><dd className="inline break-all font-mono text-xs">{device.socketId}</dd></div>
              <div><dt className="inline">Kết nối lúc: </dt><dd className="inline">{formatUTCToLocal(device.connectedAt)} ({timeAgo(device.connectedAt)})</dd></div>
            </dl>
            {device.clientType === "control" && <Button variant="outline" size="sm" onClick={onMoveQueue}>Chuyển bài hát</Button>}
          </div>
        ))}
      </div>
      <div className="hidden sm:block"><Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Device ID</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Socket ID</TableHead>
            <TableHead className="pr-6">Kết nối lúc</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {group.devices.map((device) => (
            <DeviceRow
              key={`${device.deviceId}-${device.socketId}`}
              device={device}
              onMoveQueue={onMoveQueue}
            />
          ))}
        </TableBody>
      </Table></div>
    </CardContent>
  </Card>
);

const EmptyState = () => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full bg-muted p-3">
        <WifiOff className="size-6 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Không có thiết bị nào đang kết nối</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Chỉ các phòng có thiết bị online mới hiển thị tại đây.
        </p>
      </div>
    </CardContent>
  </Card>
);

const RoomDeviceConnectionsPage = () => {
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } =
    useRoomDeviceConnections();

  const { data: roomsRes } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
  });

  const roomNameById = useMemo(() => {
    const map = new Map<string, string>();
    const rooms = (roomsRes?.data.result ?? []) as IRoom[];
    for (const room of rooms) {
      map.set(String(room.roomId), room.roomName);
    }
    return map;
  }, [roomsRes]);

  const rooms = data?.rooms ?? [];
  const totalDevices = data?.totalDevices ?? 0;
  const onlineRoomCount = rooms.length;

  return (
    <Page>
      <PageHeader
        title="Theo dõi thiết bị"
        description="Danh sách thiết bị tablet / tv đang kết nối theo từng phòng"
        icon={MonitorSmartphone}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
            Làm mới
          </Button>
        }
      />

      {moveSource !== null && <MoveQueueDialog open onOpenChange={(open) => { if (!open) setMoveSource(null); }} initialSource={moveSource} rooms={(roomsRes?.data.result ?? []) as IRoom[]} />}

      <OnlineGameBookingConfig />
      <DeviceAuthorizationConfig />
      <DeviceAuthorizations />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng thiết bị online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {totalDevices}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Phòng có thiết bị
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {onlineRoomCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cập nhật lần cuối
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {dataUpdatedAt
                ? formatUTCToLocal(new Date(dataUpdatedAt).toISOString())
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tự làm mới mỗi 10 giây
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="font-medium text-destructive">
              Không tải được danh sách thiết bị
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : rooms.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {rooms.map((group) => (
            <RoomGroupCard
              key={group.roomId}
              group={group}
              roomName={roomNameById.get(String(group.roomId))}
              onMoveQueue={() => setMoveSource(String(group.roomId))}
            />
          ))}
        </div>
      )}
    </Page>
  );
};

export default RoomDeviceConnectionsPage;
