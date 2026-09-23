import { IRoom } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DoorOpen } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import { RoomStatus, RoomType } from "@/constants/enum";
import PATHS from "@/constants/paths";
import { useToast } from "@/hooks/use-toast";
import { Select } from "@radix-ui/react-select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { roomStatusOptions, roomTypeOptions } from "../constants";

// FormValues đồng bộ với IRoom tối giản
type FormValues = {
  roomId: number;
  roomName: string;
  roomType: RoomType;
  maxCapacity: number;
  description?: string;
  status: RoomStatus;
};

function UpsertRoomPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const title = id ? "Edit room" : "New room";

  const form = useForm<FormValues>({
    defaultValues: {
      roomId: 1,
      roomName: "",
      roomType: RoomType.Medium,
      maxCapacity: 1,
      description: "",
      status: RoomStatus.Available,
    },
    mode: "onChange",
  });

  const { reset } = form;

  const { data } = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomApis.getRoomById(id),
    enabled: !!id,
    select: (data) => data.data.result,
  });

  useEffect(() => {
    if (!id) return;

    if (data) {
      reset({
        roomId: data.roomId,
        roomName: data.roomName,
        roomType: data.roomType,
        maxCapacity: data.maxCapacity || 1,
        description: data.description,
        status: data.status,
      });
    }
  }, [id, data]);

  const { mutate: createRoom, isPending: isCreating } = useMutation({
    mutationFn: roomApis.createRoom,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room created successfully",
      });
      navigate(PATHS.ROOMS);
    },
  });

  const { mutate: updateRoom, isPending: isUpdating } = useMutation({
    mutationFn: roomApis.updateRoom,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      navigate(PATHS.ROOMS);
    },
  });

  const onSubmit = async (values: FormValues) => {
    const payload: IRoom = {
      ...data,
      roomId: values.roomId,
      roomName: values.roomName,
      roomType: values.roomType,
      description: values.description || "",
      status: values.status,
    };

    if (id) {
      payload._id = id;
      updateRoom(payload);
    } else {
      createRoom(payload);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={title}
        description={id ? "Chỉnh sửa thông tin phòng" : "Tạo phòng mới"}
        icon={DoorOpen}
        showBackButton
        backUrl={PATHS.ROOMS}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Room ID */}
          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Room ID <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter room ID"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Room Name */}
          <FormField
            control={form.control}
            name="roomName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Room Name <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter room name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Room Type */}
          <FormField
            control={form.control}
            name="roomType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Room Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roomTypeOptions.map((option) => (
                      <SelectItem value={option.value} key={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roomStatusOptions.map((option) => (
                      <SelectItem value={option.value} key={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nút Submit */}
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating
                ? "Loading..."
                : id
                ? "Update Room"
                : "Create Room"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default UpsertRoomPage;
