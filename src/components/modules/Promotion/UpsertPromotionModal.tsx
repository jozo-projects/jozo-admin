import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spin } from "@/components/ui/spin";
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import {
  useCreatePromotion,
  useGetPromotionById,
  useUpdatePromotion,
} from "@/hooks/promotion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Portal } from "@radix-ui/react-portal";
import { useQueryClient } from "@tanstack/react-query";
import { format, isBefore, startOfDay } from "date-fns";
import { CalendarIcon, CircleXIcon, PlusIcon } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Create a schema for form validation
const promotionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  discountPercentage: z.coerce
    .number()
    .min(1, "Discount must be at least 1%")
    .max(100, "Discount cannot exceed 100%"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  isActive: z.boolean().default(false),
  appliesTo: z.string().min(1, "Select a service"),
});

type FormValues = z.infer<typeof promotionSchema>;

// Room type options for multi-select
// Có, bên FE cần tạo options cho appliesTo khi tạo hoặc cập nhật promotion. Dựa trên code hiện tại, options nên là:
const appliesToOptions = [
  { value: "sing", label: "Chỉ dịch vụ thu âm" },
  { value: "all", label: "Tất cả dịch vụ (hát, đồ ăn, đồ uống)" },
];

type Props = {
  id?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
};

export default function UpsertPromotionModal({
  id,
  icon,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = useGetPromotionById(id || "", !!id);
  const promotion = data?.data.result;

  const { mutate: createPromotion, isPending: isCreating } =
    useCreatePromotion();
  const { mutate: updatePromotion, isPending: isUpdating } =
    useUpdatePromotion();

  const queryClient = useQueryClient();

  const isPending = isCreating || isUpdating;

  const form = useForm<FormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      description: "",
      discountPercentage: 0,
      isActive: false,
      appliesTo: "",
    },
  });

  // Set form values when promotion data is available
  useEffect(() => {
    if (promotion) {
      form.reset({
        name: promotion.name,
        description: promotion.description,
        discountPercentage: promotion.discountPercentage,
        startDate: new Date(promotion.startDate),
        endDate: new Date(promotion.endDate),
        isActive: promotion.isActive,
        appliesTo: promotion.appliesTo,
      });
    }
  }, [promotion, form]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      startDate: values.startDate.toISOString(),
      endDate: values.endDate.toISOString(),
      _id: id,
      appliesTo: values.appliesTo,
    };

    if (id) {
      updatePromotion(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
          form.reset();
          // close the modal
          setOpen(false);
          toast({
            title: "Promotion updated successfully",
          });
        },
      });
    } else {
      createPromotion(payload, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["promotions"] });
          form.reset();
          // close the modal
          setOpen(false);
          toast({
            title: "Promotion created successfully",
          });
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {icon ? (
          <Button variant="ghost" size="icon">
            {icon}
          </Button>
        ) : (
          <Button className="my-4">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Promotion
          </Button>
        )}
      </DialogTrigger>

      <DialogPortal>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {id ? "Edit Promotion" : "Add New Promotion"}
            </DialogTitle>
            <DialogDescription>
              {id
                ? "Update the promotion details below"
                : "Fill in the promotion details below"}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(80vh-200px)]">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4 px-1"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promotion Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter promotion name"
                            {...field}
                          />
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
                          <Textarea
                            placeholder="Enter promotion description"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="discountPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter discount percentage"
                            min={1}
                            max={100}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <Typography>Pick a date</Typography>
                                  )}

                                  {field.value ? (
                                    <CircleXIcon
                                      className="ml-auto h-4 w-4 opacity-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        field.onChange(undefined);
                                      }}
                                    />
                                  ) : (
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <Portal>
                              <PopoverContent
                                className="w-full p-0"
                                align="center"
                              >
                                <Calendar
                                  className="w-full"
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    isBefore(
                                      startOfDay(date),
                                      startOfDay(new Date()),
                                    )
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Portal>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End Date</FormLabel>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <Typography>Pick a date</Typography>
                                  )}

                                  {field.value ? (
                                    <CircleXIcon
                                      className="ml-auto h-4 w-4 opacity-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        field.onChange(undefined);
                                      }}
                                    />
                                  ) : (
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <Portal>
                              <PopoverContent
                                className="w-full p-0"
                                align="center"
                              >
                                <Calendar
                                  className="w-full"
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Portal>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <FormDescription>
                            Set whether this promotion is currently active
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appliesTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Applies To</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select service" />
                            </SelectTrigger>
                            <SelectContent>
                              {appliesToOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </ScrollArea>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isPending && <Spin className="mr-2" />}
              {id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
