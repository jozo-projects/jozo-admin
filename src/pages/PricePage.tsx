import { Price } from "@/@types/general-management";
import { PageHeader } from "@/components/shared";
import UpsertPricingModal from "@/components/modules/Pricing/UpsertPriceModal";
import { DollarSign } from "lucide-react";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { useDeletePricing, useGetPricingLists } from "@/hooks/pricing";
import { useGetRoomTypes } from "@/hooks/room-type";
import { formatCurrency } from "@/utils";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useMemo, useState } from "react";

function PricePage() {
  const [selectedPricing, setSelectedPricing] = useState<Price | null>(null);

  const { data, isLoading, refetch } = useGetPricingLists();
  const { mutate: deletePricing } = useDeletePricing();
  const { data: roomTypesRes } = useGetRoomTypes();
  const roomTypeRows = useMemo(
    () => roomTypesRes?.data?.result ?? [],
    [roomTypesRes?.data?.result],
  );

  const columns: ColumnDef<Price>[] = useMemo(
    () => [
    // Cột checkbox để chọn hàng
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
    // Cột Day type
    {
      id: "day_type",
      header: "Day type",
      accessorKey: "day_type",
      enableMultiSort: false,
    },
    // Cột Prices (chỉ hiển thị 1 cột thay vì 3 cột)
    {
      id: "prices",
      header: "Prices",
      enableMultiSort: false,
      cell: ({ row }) => {
        const timeSlots = row.original.time_slots; // Mảng time_slots

        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-1 text-left">Time</th>
                {roomTypeRows.map((rt) => (
                  <th key={rt._id ?? rt.type} className="p-1 text-left">
                    {rt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="p-1">
                    {slot.start} - {slot.end}
                  </td>
                  {roomTypeRows.map((rt) => {
                    const cellPrice =
                      slot.prices.find((p) => p.room_type === rt.type)?.price ||
                      0;
                    return (
                      <td key={rt._id ?? rt.type} className="p-1">
                        {formatCurrency(cellPrice)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      },
    },
    // Cột Note
    {
      id: "note",
      header: "Note",
      accessorKey: "note",
      enableMultiSort: false,
    },
    // Cột hành động (Sửa/Xoá)
    {
      id: "actions",
      header: "",
      accessorKey: "price",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <UpsertPricingModal
            id={row.original._id}
            icon={<PencilIcon size={12} />}
            defaultOpen={false}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPricing(row.original)}
          >
            <TrashIcon size={16} />
          </Button>
        </div>
      ),
    },
  ],
    [roomTypeRows],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Pricing"
        description="Quản lý bảng giá phòng theo loại và khung giờ"
        icon={DollarSign}
        actions={<UpsertPricingModal />}
      />

      {/* Modal xóa giá */}
      <DeleteModal
        title="Delete pricing"
        description="Are you sure you want to delete this pricing?"
        isOpen={!!selectedPricing}
        onClose={() => setSelectedPricing(null)}
        onConfirm={() => {
          deletePricing(
            { _id: selectedPricing?._id || "" },
            {
              onSuccess: () => {
                setSelectedPricing(null);
                refetch();
              },
            }
          );
        }}
      />

      {/* Bọc DataTable trong div overflow-x-auto để hỗ trợ cuộn ngang khi cần */}
      <div className="overflow-x-auto">
        <DataTable
          rowKey="_id"
          loading={isLoading}
          data={data?.data.result || []}
          columns={columns}
          // Tuỳ chọn scroll nếu bạn muốn cố định chiều cao
          scroll={{ y: 750 }}
        />
      </div>
    </div>
  );
}

export default PricePage;
