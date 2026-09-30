import { IRoomSchedule } from "@/@types/Room";
import roomsScheduleApis from "@/apis/roomSchedule.api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoomType } from "@/constants/enum";
import { toast } from "@/hooks/use-toast";
import { roomTypeOptions } from "@/pages/RoomsManagement/constants";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import {
  getEffectiveScheduleRoomType,
  getRoomTypeLabel,
  isScheduleRoomTypeEditable,
  normalizeRoomType,
} from "../utils/scheduleRoomType";

interface ScheduleRoomTypeSectionProps {
  schedule: IRoomSchedule;
  physicalRoomType?: RoomType | string;
  canEdit?: boolean;
  onUpdated?: () => void;
  className?: string;
  variant?: "default" | "inline";
}

const ScheduleRoomTypeSection: React.FC<ScheduleRoomTypeSectionProps> = ({
  schedule,
  physicalRoomType,
  canEdit,
  onUpdated,
  className,
  variant = "default",
}) => {
  const normalizedPhysicalType = normalizeRoomType(physicalRoomType);
  const effectiveRoomType = getEffectiveScheduleRoomType(
    schedule,
    normalizedPhysicalType ? { roomType: normalizedPhysicalType } : undefined,
  );
  const editable =
    (canEdit ?? isScheduleRoomTypeEditable(schedule)) && !!schedule._id;
  const [selectedType, setSelectedType] = React.useState<RoomType>(
    effectiveRoomType || RoomType.Medium,
  );

  React.useEffect(() => {
    if (effectiveRoomType) {
      setSelectedType(effectiveRoomType);
    }
  }, [effectiveRoomType, schedule._id]);

  const { mutate: updateRoomType, isPending } = useMutation({
    mutationFn: (roomType: RoomType) =>
      roomsScheduleApis.updateSchedule(schedule._id, { roomType }),
    onSuccess: () => {
      toast({
        title: "Đã cập nhật",
        description: "Đã lưu size.",
      });
      onUpdated?.();
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không lưu được size.",
        variant: "destructive",
      });
    },
  });

  const hasTypeChanged = selectedType !== effectiveRoomType;
  const isInline = variant === "inline";

  const physicalTypeHint =
    normalizedPhysicalType &&
    normalizedPhysicalType !== effectiveRoomType ? (
      <p className="text-sm text-muted-foreground">
        {isInline ? "Gốc: " : "Size gốc: "}
        {getRoomTypeLabel(normalizedPhysicalType).toLowerCase()}
      </p>
    ) : null;

  if (isInline) {
    return (
      <div className={className}>
        {editable ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as RoomType)}
              >
                <SelectTrigger className="h-9 min-w-0 flex-1">
                  <SelectValue placeholder="Chọn size" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypeOptions.map((option) => (
                    <SelectItem value={option.value} key={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateRoomType(selectedType)}
                loading={isPending}
                disabled={!hasTypeChanged}
                className="h-9 shrink-0 px-2"
              >
                Lưu
              </Button>
            </div>
            {physicalTypeHint}
          </div>
        ) : (
          <p className="font-medium">
            {getRoomTypeLabel(effectiveRoomType)}
            {normalizedPhysicalType &&
              normalizedPhysicalType !== effectiveRoomType &&
              ` (gốc: ${getRoomTypeLabel(normalizedPhysicalType).toLowerCase()})`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {editable ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Size</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as RoomType)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Chọn size" />
              </SelectTrigger>
              <SelectContent>
                {roomTypeOptions.map((option) => (
                  <SelectItem value={option.value} key={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {physicalTypeHint}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateRoomType(selectedType)}
            loading={isPending}
            disabled={!hasTypeChanged}
            className="h-9 w-fit"
          >
            Lưu size
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Size</p>
          <p className="text-sm text-muted-foreground">
            {getRoomTypeLabel(effectiveRoomType)}
            {normalizedPhysicalType &&
              normalizedPhysicalType !== effectiveRoomType &&
              ` (gốc: ${getRoomTypeLabel(normalizedPhysicalType).toLowerCase()})`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ScheduleRoomTypeSection;
