import React from "react";
import { IRoom } from "@/@types/Room";
import { RoomType } from "@/constants/enum";
import roomApis from "@/apis/room.apis";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { roomTypeOptions } from "@/pages/RoomsManagement/constants";

interface EditRoomTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: IRoom | null;
}

const EditRoomTypeModal: React.FC<EditRoomTypeModalProps> = ({
  isOpen,
  onClose,
  room,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = React.useState<RoomType>(
    room?.roomType || RoomType.Medium,
  );

  React.useEffect(() => {
    if (room) {
      setSelectedType(room.roomType);
    }
  }, [room]);

  const updateRoomMutation = useMutation({
    mutationFn: (updatedRoom: IRoom) => roomApis.updateRoom(updatedRoom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "Cập nhật thành công",
        description: "Loại phòng đã được cập nhật",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Có lỗi xảy ra",
        description: "Không thể cập nhật loại phòng",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!room) return;

    const updatedRoom: IRoom = {
      ...room,
      roomType: selectedType,
    };

    updateRoomMutation.mutate(updatedRoom);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cập nhật loại phòng</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="roomName" className="text-right">
              Tên phòng
            </Label>
            <div className="col-span-3 text-sm text-muted-foreground">
              {room?.roomName}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="roomType" className="text-right">
              Loại phòng
            </Label>
            <div className="col-span-3">
              <Select
                value={selectedType}
                onValueChange={(value) => setSelectedType(value as RoomType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại phòng" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypeOptions.map((option) => (
                    <SelectItem value={option.value} key={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateRoomMutation.isPending}
          >
            {updateRoomMutation.isPending ? "Đang cập nhật..." : "Cập nhật"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoomTypeModal;
