import { IRoom } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import { Page, PageHeader } from "@/components/shared";
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
import { useNavigate, useParams } from "@tanstack/react-router";
import { roomStatusOptions, roomTypeOptions } from "../constants";
import { RoomService, toggleRoomService } from "./roomServices";

// FormValues đồng bộ với IRoom tối giản
type FormValues = {
  services?: RoomService[];
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
  const roomParams = useParams({
    from: "/_authenticated/rooms/$id/edit",
    shouldThrow: false,
  });
  const id = roomParams?.id ?? "";
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
        services: data.services,
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
      navigate({ to: PATHS.ROOMS });
    },
  });

  const { mutate: updateRoom, isPending: isUpdating } = useMutation({
    mutationFn: roomApis.updateRoom,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
      navigate({ to: PATHS.ROOMS });
    },
  });

  const onSubmit = async (values: FormValues) => {
    if ((!id || values.services !== undefined) && !values.services?.length) {
      form.setError("services", { message: "Chọn ít nhất một dịch vụ" });
      return;
    }
    const payload: IRoom = {
      ...data,
      roomId: values.roomId,
      roomName: values.roomName,
      roomType: values.roomType,
      description: values.description || "",
      status: values.status,
      services: values.services,
    };

    if (id) {
      payload._id = id;
      updateRoom(payload);
    } else {
      createRoom(payload);
    }
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title={title}
        description={id ? "Chỉnh sửa thông tin phòng" : "Tạo phòng mới"}
        icon={DoorOpen}
        showBackButton
        backUrl={PATHS.ROOMS}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
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

          <FormField
            control={form.control}
            name="services"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dịch vụ phòng</FormLabel>
                {id && field.value === undefined && <p className="text-sm text-muted-foreground">Chưa xác định dịch vụ cho phòng cũ.</p>}
                <div className="flex flex-wrap gap-5">
                  {([
                    ["singing", "Hát"],
                    ["gaming", "Chơi game"],
                  ] as const).map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={field.value?.includes(value) ?? false} onChange={(event) => field.onChange(toggleRoomService(field.value, value, event.target.checked))} />
                      {label}
                    </label>
                  ))}
                </div>
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
          <div className="mt-2 flex justify-end border-t pt-5">
            <Button className="w-full sm:w-auto" type="submit" disabled={isCreating || isUpdating}>
              {isCreating || isUpdating
                ? "Loading..."
                : id
                ? "Update Room"
                : "Create Room"}
            </Button>
          </div>
        </form>
      </Form>
    </Page>
  );
}

export default UpsertRoomPage;
