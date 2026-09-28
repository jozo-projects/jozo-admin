import {
  CreateStaffErrorLogPayload,
  CreateStaffErrorPresetPayload,
  StaffErrorLog,
  StaffErrorLogFilters,
  StaffErrorLogStatus,
  StaffErrorLogType,
  StaffErrorPreset,
} from "@/@types/staffErrorLog";
import { User } from "@/@types/user";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Role } from "@/constants/enum";
import {
  useStaffErrorLogMutations,
  useStaffErrorLogs,
  useStaffErrorPresets,
} from "@/hooks/use-staff-error-logs";
import { useUsers } from "@/hooks/use-users";
import { Plus, ShieldAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateForInput = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

const staffName = (user: User) => user.name || user.full_name || user.username || "Không có tên";

const emptyLogForm: CreateStaffErrorLogPayload = {
  userId: "",
  type: StaffErrorLogType.Warning,
  presetId: "",
  title: "",
  note: "",
  amount: 0,
  occurredAt: new Date().toISOString().slice(0, 10),
};

const emptyPresetForm: CreateStaffErrorPresetPayload = {
  code: "",
  name: "",
  description: "",
  defaultAmount: 0,
  isActive: true,
};

const LogTypeBadge = ({ type }: { type: StaffErrorLogType }) =>
  type === StaffErrorLogType.Warning ? (
    <Badge variant="secondary">Cảnh cáo</Badge>
  ) : (
    <Badge variant="destructive">Phạt tiền</Badge>
  );

const StatusBadge = ({ status }: { status: StaffErrorLogStatus }) =>
  status === StaffErrorLogStatus.Active ? (
    <Badge>Đang hiệu lực</Badge>
  ) : (
    <Badge variant="outline">Đã hủy</Badge>
  );

const StaffErrorLogsPage = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState<StaffErrorLogFilters>(() => ({
    userId: searchParams.get("userId") || undefined,
    type: (searchParams.get("type") as StaffErrorLogType | null) || undefined,
    status:
      (searchParams.get("status") as StaffErrorLogStatus | null) ||
      StaffErrorLogStatus.Active,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
  }));
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [logForm, setLogForm] = useState<CreateStaffErrorLogPayload>(emptyLogForm);
  const [cancelTarget, setCancelTarget] = useState<StaffErrorLog | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<StaffErrorPreset | null>(null);
  const [presetForm, setPresetForm] = useState<CreateStaffErrorPresetPayload>(emptyPresetForm);

  const { data: logs = [], isLoading: isLoadingLogs } = useStaffErrorLogs(filters);
  const { data: presets = [], isLoading: isLoadingPresets } = useStaffErrorPresets(true);
  const { users } = useUsers({ page: 1, limit: 10000, role: Role.Staff });
  const {
    createLog,
    cancelLog,
    createPreset,
    updatePreset,
    deletePreset,
    isCreatingLog,
    isCancellingLog,
    isSavingPreset,
    isDeletingPreset,
  } = useStaffErrorLogMutations();

  const staffUsers = useMemo(
    () => users.filter((user) => user.role === Role.Staff || user.role === Role.Admin),
    [users]
  );

  const selectedPreset = presets.find((preset) => preset._id === logForm.presetId);

  const openCreateLog = () => {
    setLogForm(emptyLogForm);
    setIsLogDialogOpen(true);
  };

  const handlePresetChange = (presetId: string) => {
    const preset = presets.find((item) => item._id === presetId);
    setLogForm((prev) => ({
      ...prev,
      presetId,
      title: preset?.name || prev.title,
      amount:
        prev.type === StaffErrorLogType.Penalty
          ? preset?.defaultAmount ?? prev.amount
          : 0,
    }));
  };

  const handleSubmitLog = () => {
    if (!logForm.userId || !logForm.note.trim()) return;
    const payload: CreateStaffErrorLogPayload = {
      userId: logForm.userId,
      type: logForm.type,
      note: logForm.note.trim(),
      ...(logForm.presetId ? { presetId: logForm.presetId } : {}),
      ...(logForm.title?.trim() ? { title: logForm.title.trim() } : {}),
      ...(logForm.type === StaffErrorLogType.Penalty
        ? { amount: Number(logForm.amount || 0) }
        : {}),
      ...(logForm.occurredAt ? { occurredAt: logForm.occurredAt } : {}),
    };
    createLog(payload, { onSuccess: () => setIsLogDialogOpen(false) });
  };

  const openCreatePreset = () => {
    setEditingPreset(null);
    setPresetForm(emptyPresetForm);
    setIsPresetDialogOpen(true);
  };

  const openEditPreset = (preset: StaffErrorPreset) => {
    setEditingPreset(preset);
    setPresetForm({
      code: preset.code,
      name: preset.name,
      description: preset.description || "",
      defaultAmount: preset.defaultAmount,
      isActive: preset.isActive,
    });
    setIsPresetDialogOpen(true);
  };

  const handleSubmitPreset = () => {
    const payload = {
      ...presetForm,
      code: presetForm.code.trim(),
      name: presetForm.name.trim(),
      description: presetForm.description?.trim() || undefined,
      defaultAmount: Number(presetForm.defaultAmount || 0),
    };

    if (editingPreset) {
      updatePreset(
        { id: editingPreset._id, payload },
        { onSuccess: () => setIsPresetDialogOpen(false) }
      );
      return;
    }

    createPreset(payload, { onSuccess: () => setIsPresetDialogOpen(false) });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Log lỗi nhân viên"
        description="Admin ghi nhận cảnh cáo/phạt tiền và quản lý preset lỗi nhân viên"
        icon={ShieldAlert}
        actions={
          <Button onClick={openCreateLog}>
            <Plus className="mr-2 h-4 w-4" />
            Ghi lỗi nhân viên
          </Button>
        }
      />

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Danh sách log</TabsTrigger>
          <TabsTrigger value="presets">Preset lỗi</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-5">
              <div>
                <Label>Nhân viên</Label>
                <select
                  value={filters.userId || ""}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, userId: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Tất cả</option>
                  {staffUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {staffName(user)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Loại</Label>
                <select
                  value={filters.type || ""}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      type: event.target.value as StaffErrorLogType | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Tất cả</option>
                  <option value={StaffErrorLogType.Warning}>Cảnh cáo</option>
                  <option value={StaffErrorLogType.Penalty}>Phạt tiền</option>
                </select>
              </div>
              <div>
                <Label>Trạng thái</Label>
                <select
                  value={filters.status || ""}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      status: event.target.value as StaffErrorLogStatus | "",
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Tất cả</option>
                  <option value={StaffErrorLogStatus.Active}>Đang hiệu lực</option>
                  <option value={StaffErrorLogStatus.Cancelled}>Đã hủy</option>
                </select>
              </div>
              <div>
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Lỗi</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Ngày xảy ra</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Người tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLogs ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center">
                        Đang tải...
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                        Chưa có log lỗi phù hợp
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell><LogTypeBadge type={log.type} /></TableCell>
                        <TableCell>{log.presetName || log.title}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={log.note}>{log.note}</TableCell>
                        <TableCell>{log.type === StaffErrorLogType.Penalty ? money(log.amount) : "-"}</TableCell>
                        <TableCell>{formatDateTime(log.occurredAt)}</TableCell>
                        <TableCell><StatusBadge status={log.status} /></TableCell>
                        <TableCell>{log.createdByName}</TableCell>
                        <TableCell className="text-right">
                          {log.status === StaffErrorLogStatus.Active && (
                            <Button variant="outline" size="sm" onClick={() => setCancelTarget(log)}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Hủy
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreatePreset}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo preset
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Tên lỗi</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Số tiền mặc định</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingPresets ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center">Đang tải...</TableCell></TableRow>
                  ) : presets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Chưa có preset lỗi</TableCell></TableRow>
                  ) : (
                    presets.map((preset) => (
                      <TableRow key={preset._id}>
                        <TableCell className="font-mono text-xs">{preset.code}</TableCell>
                        <TableCell className="font-medium">{preset.name}</TableCell>
                        <TableCell>{preset.description || "-"}</TableCell>
                        <TableCell>{money(preset.defaultAmount)}</TableCell>
                        <TableCell>{preset.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditPreset(preset)}>Sửa</Button>
                          <Button variant="destructive" size="sm" disabled={isDeletingPreset} onClick={() => deletePreset(preset._id)}>Xóa</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ghi lỗi nhân viên</DialogTitle>
            <DialogDescription>Ghi cảnh cáo hoặc phạt tiền cho nhân viên.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nhân viên *</Label>
              <select
                value={logForm.userId}
                onChange={(event) => setLogForm((prev) => ({ ...prev, userId: event.target.value }))}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Chọn nhân viên</option>
                {staffUsers.map((user) => (
                  <option key={user._id} value={user._id}>{staffName(user)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Loại *</Label>
              <select
                value={logForm.type}
                onChange={(event) => {
                  const type = event.target.value as StaffErrorLogType;
                  setLogForm((prev) => ({
                    ...prev,
                    type,
                    amount: type === StaffErrorLogType.Warning ? 0 : selectedPreset?.defaultAmount ?? prev.amount,
                  }));
                }}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value={StaffErrorLogType.Warning}>Cảnh cáo</option>
                <option value={StaffErrorLogType.Penalty}>Phạt tiền</option>
              </select>
            </div>
            <div>
              <Label>Preset lỗi</Label>
              <select
                value={logForm.presetId || ""}
                onChange={(event) => handlePresetChange(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Không dùng preset</option>
                {presets.filter((preset) => preset.isActive).map((preset) => (
                  <option key={preset._id} value={preset._id}>{preset.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tiêu đề</Label>
              <Input value={logForm.title || ""} onChange={(event) => setLogForm((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div>
              <Label>Ngày xảy ra</Label>
              <Input type="date" value={formatDateForInput(logForm.occurredAt)} onChange={(event) => setLogForm((prev) => ({ ...prev, occurredAt: event.target.value }))} />
            </div>
            {logForm.type === StaffErrorLogType.Penalty && (
              <div>
                <Label>Số tiền phạt</Label>
                <Input type="number" min={0} value={logForm.amount || 0} onChange={(event) => setLogForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Ghi chú *</Label>
              <Textarea value={logForm.note} onChange={(event) => setLogForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Nhập mô tả lỗi..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogDialogOpen(false)}>Đóng</Button>
            <Button disabled={isCreatingLog || !logForm.userId || !logForm.note.trim()} onClick={handleSubmitLog}>Lưu log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy log lỗi</DialogTitle>
            <DialogDescription>Log sẽ được chuyển sang trạng thái đã hủy.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Lý do hủy</Label>
            <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Nhập lý do nếu có..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Đóng</Button>
            <Button
              variant="destructive"
              disabled={isCancellingLog}
              onClick={() =>
                cancelTarget &&
                cancelLog(
                  { id: cancelTarget._id, cancelReason: cancelReason.trim() || undefined },
                  { onSuccess: () => { setCancelTarget(null); setCancelReason(""); } }
                )
              }
            >
              Hủy log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPreset ? "Sửa preset lỗi" : "Tạo preset lỗi"}</DialogTitle>
            <DialogDescription>Preset giúp admin ghi lỗi nhanh và đồng nhất.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Code *</Label>
              <Input value={presetForm.code} onChange={(event) => setPresetForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="late_shift" />
            </div>
            <div>
              <Label>Tên lỗi *</Label>
              <Input value={presetForm.name} onChange={(event) => setPresetForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Đi trễ ca" />
            </div>
            <div>
              <Label>Mô tả</Label>
              <Textarea value={presetForm.description || ""} onChange={(event) => setPresetForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div>
              <Label>Số tiền mặc định</Label>
              <Input type="number" min={0} value={presetForm.defaultAmount} onChange={(event) => setPresetForm((prev) => ({ ...prev, defaultAmount: Number(event.target.value) }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Đang sử dụng</Label>
                <p className="text-sm text-muted-foreground">Tắt để ẩn preset khỏi form ghi lỗi mới.</p>
              </div>
              <Switch checked={presetForm.isActive !== false} onCheckedChange={(checked) => setPresetForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>Đóng</Button>
            <Button disabled={isSavingPreset || !presetForm.code.trim() || !presetForm.name.trim()} onClick={handleSubmitPreset}>Lưu preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffErrorLogsPage;
