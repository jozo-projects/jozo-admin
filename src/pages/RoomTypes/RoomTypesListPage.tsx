import { IRoomType } from "@/@types/RoomType";
import roomTypeApis from "@/apis/roomType.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { DeleteModal } from "@/components/shared/DeleteModal";
import PATHS from "@/constants/paths";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { formatCurrency } from "@/utils";

function RoomTypesListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["roomTypes"],
    queryFn: () => roomTypeApis.getRoomTypes(),
  });

  const [selectedRoomType, setSelectedRoomType] = useState<IRoomType | null>(
    null
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteRoomTypeMutation = useMutation({
    mutationFn: (roomTypeId: string) =>
      roomTypeApis.deleteRoomType({ _id: roomTypeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTypes"] });
      toast({
        title: "Xóa loại phòng thành công",
        description: "Loại phòng đã được xóa thành công",
      });
      setSelectedRoomType(null);
    },
    onError: () => {
      toast({
        title: "Có lỗi xảy ra khi xóa loại phòng",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<IRoomType>[] = [
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
      id: "name",
      header: "Name",
      accessorKey: "name",
    },
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
    },
    {
      id: "capacity",
      header: "Capacity",
      accessorKey: "capacity",
    },
    {
      id: "area",
      header: "Area (m²)",
      accessorKey: "area",
    },
    {
      id: "prices",
      header: "Prices",
      columns: [
        {
          header: "Time Slot",
          accessorKey: "timeSlot",
          cell: ({ row }) => (
            <div className="space-y-2">
              {row.original.prices.weekday.map((price) => (
                <div key={price.timeSlot}>{price.timeSlot}</div>
              ))}
            </div>
          ),
        },
        {
          header: "Weekday Price",
          cell: ({ row }) => (
            <div className="space-y-2">
              {row.original.prices.weekday.map((price) => (
                <div key={price.timeSlot}>{formatCurrency(price.price)}</div>
              ))}
            </div>
          ),
        },
        {
          header: "Weekend Price",
          cell: ({ row }) => (
            <div className="space-y-2">
              {row.original.prices.weekend.map((price) => (
                <div key={price.timeSlot}>{formatCurrency(price.price)}</div>
              ))}
            </div>
          ),
        },
        {
          header: "Holiday Price",
          cell: ({ row }) => (
            <div className="space-y-2">
              {row.original.prices.holiday.map((price) => (
                <div key={price.timeSlot}>{formatCurrency(price.price)}</div>
              ))}
            </div>
          ),
        },
      ],
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <Link to={`${PATHS.ROOM_TYPES_LISTS}/${row.original._id}/edit`}>
            <Button variant="ghost" size="icon">
              <PencilIcon size={16} />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedRoomType(row.original)}
          >
            <TrashIcon size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Room Types"
        description="Danh sách các loại phòng"
        icon={Building2}
        actions={
      <Link to={PATHS.ROOM_TYPES_NEW}>
            <Button>New room type</Button>
      </Link>
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
        isOpen={!!selectedRoomType}
        onClose={() => setSelectedRoomType(null)}
        onConfirm={() => {
          if (selectedRoomType) {
            deleteRoomTypeMutation.mutate(selectedRoomType._id as string);
          }
        }}
        title="Xóa loại phòng"
        description={`Bạn có chắc chắn muốn xóa loại phòng "${selectedRoomType?.name}"?`}
        isLoading={deleteRoomTypeMutation.isPending}
      />
    </div>
  );
}

export default RoomTypesListPage;
