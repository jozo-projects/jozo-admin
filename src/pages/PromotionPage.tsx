import { Promotion } from "@/apis/promotion.apis";
import { PageHeader } from "@/components/shared";
import UpsertPromotionModal from "@/components/modules/Promotion/UpsertPromotionModal";
import { Tag } from "lucide-react";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useDeletePromotion, useGetPromotions } from "@/hooks/promotion";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

function PromotionPage() {
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null
  );

  const { data, isLoading, refetch } = useGetPromotions();
  const { mutate: deletePromotion } = useDeletePromotion();

  const columns: ColumnDef<Promotion>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const description = row.original.description;
        return (
          <span className="truncate block max-w-xs">
            {description.length > 100
              ? `${description.substring(0, 100)}...`
              : description}
          </span>
        );
      },
    },
    {
      accessorKey: "discountPercentage",
      header: "Discount",
      cell: ({ row }) => {
        return <span>{row.original.discountPercentage}%</span>;
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => {
        return (
          <span>{format(new Date(row.original.startDate), "dd/MM/yyyy")}</span>
        );
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        return (
          <span>{format(new Date(row.original.endDate), "dd/MM/yyyy")}</span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        return row.original.isActive ? (
          <Badge className="bg-green-500">Active</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        );
      },
    },
    {
      accessorKey: "appliesTo",
      header: "Applies To",
      cell: ({ row }) => {
        return (
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{row.original.appliesTo}</Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <UpsertPromotionModal
            id={row.original._id}
            icon={<PencilIcon size={12} />}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPromotion(row.original)}
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
        title="Promotions"
        description="Quản lý các chương trình khuyến mãi và giảm giá"
        icon={Tag}
        actions={<UpsertPromotionModal />}
      />

      <DeleteModal
        title="Delete Promotion"
        description="Are you sure you want to delete this promotion? This action cannot be undone."
        isOpen={!!selectedPromotion}
        onClose={() => setSelectedPromotion(null)}
        onConfirm={() => {
          if (selectedPromotion) {
            deletePromotion(
              { _id: selectedPromotion._id },
              {
                onSuccess: () => {
                  setSelectedPromotion(null);
                  refetch();
                },
              }
            );
          }
        }}
      />

      <div className="overflow-x-auto">
        <DataTable
          rowKey="_id"
          loading={isLoading}
          data={data?.data.result || []}
          columns={columns}
          scroll={{ y: 750 }}
        />
      </div>
    </div>
  );
}

export default PromotionPage;
