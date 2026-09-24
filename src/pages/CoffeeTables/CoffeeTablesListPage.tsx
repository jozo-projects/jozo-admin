import { ICoffeeTable } from "@/@types/CoffeeTable";
import coffeeTableApis from "@/apis/coffeeTable.apis";
import { PageHeader } from "@/components/shared";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import PATHS from "@/constants/paths";
import { useIsAdmin } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Coffee, PencilIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

function CoffeeTablesListPage() {
  const isAdmin = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<ICoffeeTable | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["coffeeTables"],
    queryFn: () => coffeeTableApis.getCoffeeTables(),
  });

  const deleteCoffeeTableMutation = useMutation({
    mutationFn: (id: string) => coffeeTableApis.deleteCoffeeTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffeeTables"] });
      toast({
        title: "Table deleted successfully",
        description: "The coffee table has been deleted.",
      });
      setSelectedTable(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete table",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<ICoffeeTable>[] = [
    {
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        isAdmin ? (
          <div className="flex items-center justify-center gap-2">
            <Link
              preload="intent"
              to="/coffee-tables/$id/edit"
              params={{ id: row.original._id as string }}
            >
              <Button variant="ghost" size="icon">
                <PencilIcon size={16} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedTable(row.original)}
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
        title="Service Stations"
        description="Manage coffee lounge service stations"
        icon={Coffee}
        actions={
          isAdmin ? (
            <Link preload="intent" to={PATHS.COFFEE_TABLES_NEW}>
              <Button>New Station</Button>
            </Link>
          ) : undefined
        }
      />

      <DataTable
        rowKey="_id"
        loading={isLoading}
        data={data?.data.result || []}
        columns={columns}
      />

      <DeleteModal
        isOpen={!!selectedTable}
        onClose={() => setSelectedTable(null)}
        onConfirm={() => {
          if (selectedTable?._id) {
            deleteCoffeeTableMutation.mutate(selectedTable._id);
          }
        }}
        title="Delete Service Station"
        description={`Are you sure you want to delete "${selectedTable?.name}"?`}
        isLoading={deleteCoffeeTableMutation.isPending}
      />
    </div>
  );
}

export default CoffeeTablesListPage;
