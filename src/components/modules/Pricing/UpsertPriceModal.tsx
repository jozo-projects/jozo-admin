/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Price } from "@/@types/general-management";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DayType, RoomType } from "@/constants/enum";
import { DAY_TYPE_OPTIONS } from "@/constants/options";
import {
  useAddPricing,
  useGetPricingById,
  useUpdatePricing,
} from "@/hooks/pricing";
import { useGetRoomTypes } from "@/hooks/room-type";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils";
import { addPricingSchema } from "@/utils/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Portal } from "@radix-ui/react-portal";
import { AxiosError } from "axios";
import { format } from "date-fns";
import { CalendarIcon, CircleXIcon, PlusIcon, TrashIcon } from "lucide-react";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { Calendar } from "../../ui/calendar";
import { Input } from "../../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Spin } from "../../ui/spin";
import Typography from "../../ui/typography";

type Props = {
  id?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  onUpsert?: (payload: any) => void;
};

type FormValues = {
  dayType: DayType;
  timeSlots: {
    start: string;
    end: string;
    prices: {
      roomType: RoomType;
      price: string;
    }[];
  }[];
  effectiveDate: string;
  endDate?: string;
  note?: string;
};

function UpsertPricingModal(props: Props) {
  const { id = "", icon, defaultOpen = false, onUpsert } = props;
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(defaultOpen);

  const title = id ? "Edit price" : "Add price";

  const { data: priceData } = useGetPricingById(id, !!id && !!open);
  const { data: roomTypesRes, isLoading: isRoomTypesLoading } =
    useGetRoomTypes();

  const price = useMemo(
    () => priceData?.data.result || ({} as Price),
    [priceData?.data.result],
  );
  const roomTypeRows = useMemo(
    () => roomTypesRes?.data?.result ?? [],
    [roomTypesRes?.data?.result],
  );

  const { mutate: addPricing, isPending: isAddPending } = useAddPricing();
  const { mutate: updatePricing, isPending: isUpdatePending } =
    useUpdatePricing();

  const isPending = isAddPending || isUpdatePending;

  const createDefaultTimeSlot = useCallback((): FormValues["timeSlots"][number] => {
    return {
      start: "",
      end: "",
      prices: roomTypeRows.map((rt) => ({ roomType: rt.type, price: "" })),
    };
  }, [roomTypeRows]);

  const buildFormValuesFromPrice = useCallback(
    (p: Price): FormValues => ({
      dayType: p.day_type || ("" as DayType),
      timeSlots:
        p.time_slots?.map((slot) => ({
          start: slot.start || "",
          end: slot.end || "",
          prices: roomTypeRows.map((rt) => {
            const fromSlot = slot.prices?.find((pr) => pr.room_type === rt.type);
            return {
              roomType: rt.type,
              price: fromSlot ? formatCurrency(fromSlot.price, false) : "",
            };
          }),
        })) || [createDefaultTimeSlot()],
      effectiveDate: p.effective_date || "",
      endDate: p.end_date || undefined,
      note: p.note || undefined,
    }),
    [roomTypeRows, createDefaultTimeSlot],
  );

  const emptyFormValues: FormValues = {
    dayType: "" as DayType,
    timeSlots: [{ start: "", end: "", prices: [] }],
    effectiveDate: "",
    endDate: undefined,
    note: undefined,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(addPricingSchema),
    defaultValues: emptyFormValues,
  });

  useEffect(() => {
    if (!open || roomTypeRows.length === 0) return;

    if (id && price && Object.keys(price).length > 0 && price._id) {
      form.reset(buildFormValuesFromPrice(price));
    } else if (!id) {
      form.reset({
        dayType: "" as DayType,
        timeSlots: [createDefaultTimeSlot()],
        effectiveDate: "",
        endDate: undefined,
        note: undefined,
      });
    }
  }, [
    open,
    id,
    price,
    roomTypeRows,
    form,
    createDefaultTimeSlot,
    buildFormValuesFromPrice,
  ]);

  const {
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // Lấy danh sách time slots hiện tại
  const timeSlots = watch("timeSlots");

  // Thêm time slot mới
  const addTimeSlot = () => {
    const newTimeSlots = [...timeSlots, createDefaultTimeSlot()];
    setValue("timeSlots", newTimeSlots);
  };

  // Xóa time slot
  const removeTimeSlot = (index: number) => {
    if (timeSlots.length > 1) {
      const newTimeSlots = timeSlots.filter((_, i) => i !== index);
      setValue("timeSlots", newTimeSlots);
    } else {
      toast({
        title: "Cannot remove",
        description: "At least one time slot is required.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = handleSubmit(
    (values: FormValues) => {
      const data = {
        ...values,
        timeSlots: values.timeSlots.map((slot) => ({
          ...slot,
          prices: slot.prices.map((price) => ({
            roomType: price.roomType,
            price: +price.price.replace(/\./g, ""),
          })),
        })),
        effectiveDate: format(new Date(values.effectiveDate), "yyyy-MM-dd"),
        endDate: values.endDate
          ? format(new Date(values.endDate), "yyyy-MM-dd")
          : undefined,
      };

      if (onUpsert) {
        onUpsert(data);
      } else {
        if (id) {
          updatePricing(
            {
              _id: id,
              ...data,
            },
            {
              onSuccess: () => {
                closeRef.current?.click();
                form.reset();
                toast({
                  title: "Price updated",
                  description: "The price has been updated successfully.",
                });
              },
              onError: (error: any) => {
                const axiosError = error as AxiosError<{
                  errors: Record<string, ErrorField>;
                }>;

                if (axiosError.response?.data) {
                  const errors = axiosError.response.data.errors;
                  for (const key in errors) {
                    setError(key as keyof FormValues, {
                      message: errors[key].msg,
                    });
                  }
                }
              },
            },
          );
        } else {
          addPricing(data, {
            onSuccess: () => {
              closeRef.current?.click();
              form.reset();
              toast({
                title: "Price added",
                description: "The price has been added successfully.",
              });
            },
            onError: (error: any) => {
              const axiosError = error as AxiosError<{
                errors: Record<string, ErrorField>;
              }>;

              if (axiosError.response?.data) {
                const errors = axiosError.response.data.errors;
                for (const key in errors) {
                  setError(key as keyof FormValues, {
                    message: errors[key].msg,
                  });
                }
              }
            },
          });
        }
      }
    },
    (error) =>
      toast({
        title: "Error",
        description: error?.timeSlots?.root?.message || "",
      }),
  );

  const handleClose = () => {
    if (roomTypeRows.length === 0) {
      form.reset(emptyFormValues);
      return;
    }
    if (id && price && Object.keys(price).length > 0 && price._id) {
      form.reset(buildFormValuesFromPrice(price));
    } else {
      form.reset({
        dayType: "" as DayType,
        timeSlots: [createDefaultTimeSlot()],
        effectiveDate: "",
        endDate: undefined,
        note: undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {icon ? (
          <Button variant="ghost" size="icon" aria-label="Edit pricing">
            {icon}
          </Button>
        ) : (
          <Button>{title}</Button>
        )}
      </DialogTrigger>

      <DialogContent
        className="max-h-[calc(100dvh-2rem)] sm:max-w-xl"
        onInteractOutside={handleClose}
      >
          <Spin spinning={isPending}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {id ? "Edit a pricing here." : "Add a new pricing here."}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[min(70dvh,42rem)]">
              <div className="grid gap-4 p-1">
                {open && roomTypeRows.length === 0 && isRoomTypesLoading ? (
                  <div className="flex min-h-[200px] items-center justify-center py-8">
                    <Typography className="text-muted-foreground">
                      Đang tải loại phòng…
                    </Typography>
                  </div>
                ) : open && roomTypeRows.length === 0 ? (
                  <div className="flex min-h-[200px] items-center justify-center py-8">
                    <Typography className="text-muted-foreground">
                      Chưa có loại phòng. Vui lòng thêm loại phòng trước khi cấu
                      hình giá.
                    </Typography>
                  </div>
                ) : roomTypeRows.length > 0 ? (
                <Form {...form}>
                  <form className="space-y-4" onSubmit={onSubmit}>
                    <FormField
                      control={control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Effective date</FormLabel>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
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
                                  selected={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    field.onChange(date?.toISOString())
                                  }
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

                    <FormField
                      control={control}
                      name="dayType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a day type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAY_TYPE_OPTIONS.map((option) => (
                                <SelectItem
                                  value={option.value}
                                  key={option.label}
                                >
                                  {option.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <Typography variant="h6">Time Slots</Typography>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={addTimeSlot}
                          className="flex items-center gap-2"
                        >
                          <PlusIcon size={16} />
                          Thêm khung giờ
                        </Button>
                      </div>

                      <Accordion
                        type="single"
                        collapsible
                        className="space-y-4"
                      >
                        {timeSlots.map((timeSlot, index) => (
                          <AccordionItem
                            key={index}
                            value={`item-${index}`}
                            className={cn(
                              "border rounded-lg",
                              errors.timeSlots?.[index]?.start?.message &&
                                "border-destructive",
                            )}
                          >
                            <AccordionTrigger className="px-4">
                              <div className="flex items-center gap-4">
                                <Typography variant="h6">
                                  Time slot {index + 1}
                                </Typography>
                                <Typography
                                  className={cn(
                                    "text-muted-foreground",
                                    errors.timeSlots?.[index] && "text-destructive",
                                  )}
                                >
                                  {timeSlot.start && timeSlot.end
                                    ? `${timeSlot.start} - ${timeSlot.end}`
                                    : "No time set"}
                                </Typography>
                                {timeSlots.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTimeSlot(index);
                                    }}
                                    className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title="Xóa khung giờ này"
                                  >
                                    <TrashIcon size={16} />
                                  </Button>
                                )}
                              </div>
                            </AccordionTrigger>

                            <AccordionContent className="px-4 pb-4 space-y-4">
                              <FormField
                                control={control}
                                name={`timeSlots.${index}`}
                                render={({ field }) => {
                                  return (
                                    <FormItem className="flex flex-col">
                                      <FormLabel>Time range</FormLabel>
                                      <div className="flex items-center gap-2 justify-between border rounded-md px-3 py-2">
                                        <FormControl>
                                          <input
                                            type="time"
                                            className="border-none focus:outline-none focus:ring-0 text-black"
                                            value={field.value.start}
                                            onChange={(e) =>
                                              field.onChange({
                                                ...field.value,
                                                start: e.target.value,
                                              })
                                            }
                                          />
                                        </FormControl>
                                        <span>-</span>
                                        <FormControl>
                                          <input
                                            type="time"
                                            className="border-none focus:outline-none focus:ring-0 text-black"
                                            value={field.value.end}
                                            onChange={(e) =>
                                              field.onChange({
                                                ...field.value,
                                                end: e.target.value,
                                              })
                                            }
                                          />
                                        </FormControl>
                                      </div>
                                      {errors.timeSlots?.[index]?.end
                                        ?.message && (
                                        <p className="text-[0.8rem] font-medium text-destructive">
                                          {errors.timeSlots?.[index]?.end
                                            ?.message ?? "No error message"}
                                        </p>
                                      )}
                                      {errors.timeSlots?.[index]?.start
                                        ?.message && (
                                        <p className="text-[0.8rem] font-medium text-destructive">
                                          {errors.timeSlots?.[index]?.start
                                            ?.message ?? "No error message"}
                                        </p>
                                      )}
                                    </FormItem>
                                  );
                                }}
                              />

                              <FormField
                                control={control}
                                name={`timeSlots.${index}.prices`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-col">
                                    <FormLabel>Prices</FormLabel>
                                    <div className="grid gap-3">
                                      {roomTypeRows.map((rt, priceIndex) => {
                                        const priceObj = field.value?.find(
                                          (p) => p.roomType === rt.type,
                                        );

                                        return (
                                          <div
                                            key={rt._id ?? rt.type}
                                            className="grid grid-cols-2 gap-4 items-center px-3 py-2 rounded-md border"
                                          >
                                            <div className="text-sm font-medium">
                                              {rt.name}
                                            </div>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                currency
                                                placeholder="Enter price"
                                                value={priceObj?.price ?? ""}
                                                onChange={(e) => {
                                                  const newPrices =
                                                    Array.isArray(field.value)
                                                      ? [...field.value]
                                                      : [];
                                                  const existingPriceIndex =
                                                    newPrices.findIndex(
                                                      (p) =>
                                                        p.roomType === rt.type,
                                                    );
                                                  const price = e.target.value;

                                                  if (existingPriceIndex >= 0) {
                                                    newPrices[
                                                      existingPriceIndex
                                                    ] = {
                                                      ...newPrices[
                                                        existingPriceIndex
                                                      ],
                                                      price,
                                                    };
                                                  } else {
                                                    newPrices.push({
                                                      roomType: rt.type,
                                                      price,
                                                    });
                                                  }

                                                  field.onChange(newPrices);
                                                }}
                                              />
                                            </FormControl>
                                            {form.formState.errors.timeSlots?.[
                                              index
                                            ]?.prices?.[priceIndex]?.price && (
                                              <p className="text-[0.8rem] font-medium text-destructive">
                                                {form.formState.errors
                                                  .timeSlots[index]?.prices?.[
                                                  priceIndex
                                                ]?.price?.message ??
                                                  "No error message"}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>

                    <FormField
                      control={control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>End date</FormLabel>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
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
                                  selected={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    field.onChange(date?.toISOString())
                                  }
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

                    <FormField
                      control={control}
                      name="note"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Note</FormLabel>

                          <FormControl>
                            <Input
                              maxLength={200}
                              as="textarea"
                              placeholder="Enter note"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <DialogClose ref={closeRef} asChild>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleClose}
                        >
                          Close
                        </Button>
                      </DialogClose>
                      <Button type="submit">Save changes</Button>
                    </DialogFooter>
                  </form>
                </Form>
                ) : null}
              </div>
            </ScrollArea>
          </Spin>
      </DialogContent>
    </Dialog>
  );
}

export default UpsertPricingModal;
