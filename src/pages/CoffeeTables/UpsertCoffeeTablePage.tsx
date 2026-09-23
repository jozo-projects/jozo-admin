import coffeeTableApis from "@/apis/coffeeTable.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import PATHS from "@/constants/paths";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import * as z from "zod";

const formSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function UpsertCoffeeTablePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      isActive: true,
      description: "",
    },
  });

  const { data: coffeeTableData } = useQuery({
    queryKey: ["coffeeTable", id],
    queryFn: () => coffeeTableApis.getCoffeeTableById(id),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (coffeeTableData?.data.result) {
      const table = coffeeTableData.data.result;
      form.reset({
        code: table.code || "",
        name: table.name || "",
        isActive: table.isActive ?? true,
        description: table.description || "",
      });
    }
  }, [coffeeTableData, form]);

  const { mutate: createCoffeeTable, isPending: isCreating } = useMutation({
    mutationFn: coffeeTableApis.createCoffeeTable,
    onSuccess: () => {
      toast({
        title: "Table created successfully",
        description: "The coffee table has been created.",
      });
      navigate(PATHS.COFFEE_TABLES);
    },
    onError: (error) => {
      toast({
        title: "Failed to create table",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updateCoffeeTable, isPending: isUpdating } = useMutation({
    mutationFn: (values: FormValues) => coffeeTableApis.updateCoffeeTable(id, values),
    onSuccess: () => {
      toast({
        title: "Table updated successfully",
        description: "Coffee table information has been updated.",
      });
      navigate(PATHS.COFFEE_TABLES);
    },
    onError: (error) => {
      toast({
        title: "Failed to update table",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditMode) {
      updateCoffeeTable(values);
      return;
    }
    createCoffeeTable(values);
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={isEditMode ? "Edit Service Station" : "New Service Station"}
        description={
          isEditMode
            ? "Update service station details"
            : "Create a new service station"
        }
        icon={Coffee}
        showBackButton
        backUrl={PATHS.COFFEE_TABLES}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Code <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter table code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter table name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter description (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable to allow this table to be used.
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isCreating || isUpdating}>
            {isCreating || isUpdating
              ? "Processing..."
              : isEditMode
                ? "Update"
                : "Create"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default UpsertCoffeeTablePage;
