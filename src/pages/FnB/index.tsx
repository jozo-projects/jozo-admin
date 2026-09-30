import { FnbMenu } from "@/@types/FnBMenu";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { useDeleteMenu, useGetAllMenus } from "@/hooks/use-fnb-menu";
import { useToast } from "@/hooks/use-toast";
import { Plus, UtensilsCrossed } from "lucide-react";
import { useState, useEffect } from "react";
import { FnbModal } from "./components/FnbModal";
import { createColumns } from "./components/columns";

const FnBPage = () => {
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<FnbMenu | null>(null);

  const { data: menus, refetch, isLoading, error } = useGetAllMenus();

  const { mutate: deleteMenu } = useDeleteMenu();

  // Debug: Log data when it changes
  useEffect(() => {
    console.log("FnB Menus Data:", menus);
    console.log("Number of items:", menus?.length);
    if (menus) {
      const laysItems = menus.filter((item) =>
        item.name.toLowerCase().includes("lay")
      );
      console.log("Lays items found:", laysItems);
    }
  }, [menus]);

  const handleCreate = () => {
    setSelectedMenu(null);
    setIsModalOpen(true);
  };

  const handleEdit = (menu: FnbMenu) => {
    setSelectedMenu(menu);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMenu(id, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Menu item deleted successfully",
        });
        refetch();
      },
    });
  };

  const columns = createColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Food & Beverage Menu"
        description={`Quản lý thực đơn đồ ăn và thức uống${
          menus ? ` • ${menus.length} món` : ""
        }`}
        icon={UtensilsCrossed}
        actions={
          <div className="flex items-center gap-2">
            {isLoading && (
              <span className="text-sm text-muted-foreground">Loading...</span>
            )}
            {error && (
              <span className="text-sm text-red-500">Error loading data</span>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Menu Item
            </Button>
          </div>
        }
      />

      <DataTable columns={columns} data={menus || []} />

      <FnbModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialValues={selectedMenu || undefined}
      />
    </div>
  );
};

export default FnBPage;
