/* eslint-disable @typescript-eslint/no-unused-vars */
import { FnbMenu } from "@/@types/FnBMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMenu, useUpdateMenu } from "@/hooks/use-fnb-menu";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import ImagesList from "../../RoomsManagement/components/ui/ImagesList";
import { FNB_CATEGORIES, FNB_CATEGORY_LABELS } from "../constants";

interface FnbModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: Partial<FnbMenu>;
}

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  price: z.string().optional(),
  isAvailable: z.boolean().default(true),
  image: z.string().optional(),
  inventory: z
    .object({
      quantity: z
        .number()
        .min(0, "Quantity must be greater than or equal to 0"),
      minStock: z
        .number()
        .min(0, "Minimum stock must be greater than or equal to 0"),
      maxStock: z
        .number()
        .min(0, "Maximum stock must be greater than or equal to 0"),
    })
    .optional(),
});

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    price: z.string().min(1, "Price is required"),
    description: z.string(),
    category: z.string(),
    image: z.string().optional(),
    hasVariants: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === "string" ? val === "true" : val)),
    variants: z.array(variantSchema).optional(),
    inventory: z
      .object({
        quantity: z
          .number()
          .min(0, "Quantity must be greater than or equal to 0"),
        unit: z.string().optional(),
        minStock: z
          .number()
          .min(0, "Minimum stock must be greater than or equal to 0"),
        maxStock: z
          .number()
          .min(0, "Maximum stock must be greater than or equal to 0"),
        lastUpdated: z.date().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasVariants && (!data.variants || data.variants.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please add at least one variant",
        path: ["variants"],
      });
    }
  });

const formatPrice = (price: string | number): string => {
  const numericPrice =
    typeof price === "string" ? parseFloat(price.replace(/\./g, "")) : price;
  return numericPrice.toLocaleString("vi-VN");
};

export function FnbModal({ isOpen, onClose, initialValues }: FnbModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [variantFiles, setVariantFiles] = useState<{ [key: number]: File[] }>(
    {}
  );
  const [itemKey, setItemKey] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: "1.000",
      description: "",
      category: FNB_CATEGORIES.SNACKS,
      image: "",
      hasVariants: false,
      variants: [],
      inventory: {
        quantity: 0,
        unit: "",
        minStock: 0,
        maxStock: 0,
        lastUpdated: new Date(),
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const { mutate: createMenu, isPending: isCreating } = useCreateMenu();
  const { mutate: updateMenu, isPending: isUpdating } = useUpdateMenu();

  // Update itemKey when isOpen changes to ensure form resets properly
  useEffect(() => {
    if (isOpen && initialValues?._id) {
      setItemKey(initialValues._id);
    }
  }, [isOpen, initialValues]);

  useEffect(() => {
    if (initialValues && itemKey) {
      form.reset({
        name: initialValues.name || "",
        price: formatPrice(initialValues.price || "1.000"),
        description: initialValues.description || "",
        category: initialValues.category || FNB_CATEGORIES.SNACKS,
        image: initialValues.image || "",
        hasVariants: initialValues.hasVariants || false,
        variants: (initialValues.variants || []).map((variant) => ({
          ...variant,
          price: variant.price ? formatPrice(variant.price) : "",
        })),
        inventory: initialValues.inventory || {
          quantity: 0,
          unit: "",
          minStock: 0,
          maxStock: 0,
          lastUpdated: new Date(),
        },
      });
    }
  }, [initialValues, itemKey, form]);

  const resetForm = () => {
    form.reset({
      name: "",
      price: "1.000",
      description: "",
      category: FNB_CATEGORIES.SNACKS,
      image: "",
      hasVariants: false,
      variants: [],
      inventory: {
        quantity: 0,
        unit: "",
        minStock: 0,
        maxStock: 0,
        lastUpdated: new Date(),
      },
    });
    setFiles([]);
    setItemKey("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVariantImagesChange = (
    index: number,
    images: string[],
    imageFiles: File[]
  ) => {
    setVariantFiles((prev) => ({
      ...prev,
      [index]: imageFiles,
    }));
    const variants = form.getValues("variants") || [];
    variants[index] = {
      ...variants[index],
      image: images[0] || "",
    };
    form.setValue("variants", variants);
  };

  const onFormSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("price", data.price.toString());
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("hasVariants", data.hasVariants ? "true" : "false");

      // Handle main image upload
      if (data.image) {
        if (data.image.startsWith("http")) {
          formData.append("existingImage", data.image);
        } else if (files.length > 0) {
          formData.append("file", files[0]);
        }
      }

      // Handle inventory for main product (only when hasVariants is false)
      if (!data.hasVariants && data.inventory) {
        formData.append(
          "inventory",
          JSON.stringify({
            ...data.inventory,
            lastUpdated: new Date(),
          })
        );
      }

      if (data.hasVariants && data.variants) {
        // Ensure all variants have the correct structure before sending
        const processedVariants = await Promise.all(
          data.variants.map(async (variant, index) => {
            // Lấy inventory từ variant hoặc tạo mới nếu không có
            const inventory = variant.inventory || {
              quantity: 0,
              minStock: 0,
              maxStock: 0,
              lastUpdated: new Date(),
            };

            // Handle variant image
            let variantImage = variant.image || "";
            if (
              variant.image &&
              !variant.image.startsWith("http") &&
              variantFiles[index]?.[0]
            ) {
              formData.append(`variantFile_${index}`, variantFiles[index][0]);
              variantImage = `variantFile_${index}`;
            }

            return {
              name: variant.name,
              price: variant.price
                ? formatPrice(variant.price)
                : formatPrice(data.price),
              isAvailable: true,
              image: variantImage,
              inventory,
            };
          })
        );

        formData.append("variants", JSON.stringify(processedVariants));
      }

      if (!initialValues?._id) {
        formData.append("createdAt", new Date().toISOString());
        createMenu(formData as unknown as Omit<FnbMenu, "_id">, {
          onSuccess: handleClose,
        });
      } else {
        updateMenu(
          {
            id: initialValues._id,
            menu: formData as unknown as Partial<FnbMenu>,
          },
          {
            onSuccess: handleClose,
          }
        );
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleImagesChange = (images: string[], imageFiles: File[]) => {
    setFiles(imageFiles);
    form.setValue("image", images[0] || "");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {!initialValues?._id ? "Create Menu Item" : "Edit Menu Item"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onFormSubmit, (errors) => {
              console.log(errors);
            })}
            className="grid gap-4 py-4"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Name</FormLabel>
                      <FormControl>
                        <Input id="name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="price">Price</FormLabel>
                      <FormControl>
                        <Input
                          id="price"
                          currency
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="category">Category</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(FNB_CATEGORIES).map(([_, value]) => (
                            <SelectItem key={value} value={value}>
                              {FNB_CATEGORY_LABELS[value]}
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="description">Description</FormLabel>
                      <FormControl>
                        <Textarea id="description" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <ImagesList
                        images={field.value ? [field.value] : []}
                        onChange={handleImagesChange}
                        max={1}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Inventory Management for Main Product - Only show when hasVariants is false */}
              {!form.watch("hasVariants") && (
                <FormField
                  control={form.control}
                  name="inventory"
                  render={() => (
                    <FormItem className="space-y-4">
                      <FormLabel>Inventory Management</FormLabel>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="inventory.quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="inventory.unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., pieces, kg, liters"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="inventory.minStock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Min Stock</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="inventory.maxStock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Stock</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(Number(e.target.value))
                                  }
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hasVariants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Variants</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable if this item has different variations
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

              {form.watch("hasVariants") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Variants</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          name: "",
                          price: "",
                          isAvailable: true,
                          image: "",
                          inventory: {
                            quantity: 0,
                            minStock: 0,
                            maxStock: 0,
                          },
                        })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Variant
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Variant {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            remove(index);
                            setVariantFiles((prev) => {
                              const newFiles = { ...prev };
                              delete newFiles[index];
                              return newFiles;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variant Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`variants.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  currency
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(e.target.value)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name={`variants.${index}.image`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image</FormLabel>
                            <FormControl>
                              <ImagesList
                                images={field.value ? [field.value] : []}
                                onChange={(images, files) =>
                                  handleVariantImagesChange(
                                    index,
                                    images,
                                    files
                                  )
                                }
                                max={1}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.inventory`}
                        render={() => (
                          <FormItem className="space-y-4">
                            <FormLabel>Inventory Management</FormLabel>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <FormField
                                control={form.control}
                                name={`variants.${index}.inventory.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={0}
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.inventory.minStock`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Stock</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={0}
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`variants.${index}.inventory.maxStock`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Stock</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={0}
                                        {...field}
                                        onChange={(e) =>
                                          field.onChange(Number(e.target.value))
                                        }
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={isCreating || isUpdating}>
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
