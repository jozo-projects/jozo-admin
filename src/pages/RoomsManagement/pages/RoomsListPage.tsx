import { IRoom } from "@/@types/Room";
import roomApis from "@/apis/room.apis";
import { PageHeader } from "@/components/shared";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Button } from "@/components/ui/button";
import { DoorOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import PATHS from "@/constants/paths";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/usePermission";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
// import { toast } from "sonner";

function RoomsListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApis.getRooms(),
  });

  const [selectedRoom, setSelectedRoom] = useState<IRoom | null>(null);
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => roomApis.deleteRoom({ _id: roomId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "Xóa phòng thành công",
        description: "Phòng đã được xóa thành công",
      });
      setSelectedRoom(null);
    },
    onError: () => {
      toast({
        title: "Có lỗi xảy ra khi xóa phòng",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<IRoom>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "roomId",
      header: "Room ID",
      accessorKey: "roomId",
    },
    {
      id: "roomName",
      header: "Room Name",
      accessorKey: "roomName",
    },
    {
      id: "roomType",
      header: "Room Type",
      accessorKey: "roomType",
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        isAdmin ? (
          <div className="flex items-center justify-center gap-2">
            <Link to={`/rooms/${row.original._id}/edit`}>
              <Button variant="ghost" size="icon">
                <PencilIcon size={16} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedRoom(row.original)}
            >
              <TrashIcon size={16} />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Rooms Management"
        description="Quản lý danh sách phòng"
        icon={DoorOpen}
        actions={
          isAdmin ? (
            <Link to={PATHS.NEW_ROOM}>
              <Button>New room</Button>
            </Link>
          ) : undefined
        }
      />

      <DataTable
        rowKey="_id"
        loading={isLoading}
        data={data?.data.result || []}
        columns={columns}
        scroll={{
          y: 750,
        }}
      />

      <DeleteModal
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onConfirm={() => {
          if (selectedRoom) {
            deleteRoomMutation.mutate(selectedRoom._id);
          }
        }}
        title="Xóa phòng"
        description={`Bạn có chắc chắn muốn xóa phòng "${selectedRoom?.roomName}"?`}
        isLoading={deleteRoomMutation.isPending}
      />
    </div>
  );
}

export default RoomsListPage;
