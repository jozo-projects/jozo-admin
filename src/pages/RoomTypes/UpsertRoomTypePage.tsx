import roomTypeApis from "@/apis/roomType.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import PATHS from "@/constants/paths";
import { toast } from "@/hooks/use-toast";
import ImagesList from "@/pages/RoomsManagement/components/ui/ImagesList";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "@tanstack/react-router";
import * as z from "zod";
import { RoomType } from "@/constants/enum";

const roomTypeOptions = [
  { value: RoomType.Medium, label: "Medium" },
  { value: RoomType.Large, label: "Large" },
  { value: RoomType.Dorm, label: "Dorm" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(RoomType),
  capacity: z.string().min(1, "Capacity must be at least 1"),
  area: z.string().min(1, "Area is required"),
  description: z.string(),
  images: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

function UpsertRoomTypePage() {
  const roomTypeParams = useParams({
    from: "/room-types/$id/edit",
    shouldThrow: false,
  });
  const id = roomTypeParams?.id ?? "";
  const title = id ? "Edit Room Type" : "New Room Type";
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: RoomType.Medium,
      capacity: "1",
      area: "1",
      description: "",
      images: [],
    },
  });

  const { data: roomTypeData } = useQuery({
    queryKey: ["roomType", id],
    queryFn: () => roomTypeApis.getRoomType(id || ""),
    enabled: !!id,
  });

  useEffect(() => {
    if (roomTypeData?.data) {
      form.reset({
        name: roomTypeData?.data.result?.name || "",
        type: roomTypeData?.data.result?.type || RoomType.Medium,
        capacity: roomTypeData?.data.result?.capacity?.toString() || "1",
        area: roomTypeData?.data.result?.area?.toString() || "1",
        description: roomTypeData?.data.result?.description || "",
        images: roomTypeData?.data.result?.images || [],
      });
    }
  }, [roomTypeData, form]);

  const { mutate: createRoomType, isPending: isCreating } = useMutation({
    mutationFn: roomTypeApis.createRoomType,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type created successfully",
      });
      form.reset();
      navigate({ to: PATHS.ROOM_TYPES_LISTS });
    },

    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Thêm mutation để cập nhật room type
  const { mutate: updateRoomType, isPending: isUpdating } = useMutation({
    mutationFn: (data: FormData) => roomTypeApis.updateRoomType(data, id || ""),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room type updated successfully",
      });
      navigate({ to: PATHS.ROOM_TYPES_LISTS });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("type", values.type);
      formData.append("capacity", values.capacity.toString());
      formData.append("area", values.area + "");
      formData.append("description", values.description || "");

      // Separate existing and new images
      const existingImages = values.images.filter((url) =>
        url.startsWith("http"),
      );
      const newImages = values.images.filter((url) => !url.startsWith("http"));

      // Add existing images as JSON string
      if (existingImages.length > 0) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }

      // Process and add new images
      if (newImages.length > 0) {
        for (const blobUrl of newImages) {
          const response = await fetch(blobUrl);
          if (!response.ok)
            throw new Error(`Failed to fetch image: ${blobUrl}`);

          const blob = await response.blob();
          const fileName = `image-${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}.jpg`;
          const file = new File([blob], fileName, { type: "image/jpeg" });
          formData.append("images", file);
        }
      }

      if (id) {
        updateRoomType(formData);
      } else {
        createRoomType(formData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title={title}
        description={
          id ? "Chỉnh sửa thông tin loại phòng" : "Tạo loại phòng mới"
        }
        icon={Building2}
        showBackButton
        backUrl={PATHS.ROOM_TYPES_LISTS}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter room type name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type <Typography variant="span">(*)</Typography>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roomTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Capacity <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter capacity"
                    min={1}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Area (m²) <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Input type="text" placeholder="Enter area 1111" {...field} />
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
                <FormLabel>
                  Description <Typography variant="span">(*)</Typography>
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Images</FormLabel>
                <FormControl>
                  <ImagesList
                    onChange={field.onChange}
                    images={field.value}
                    max={5}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="mt-6"
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating
              ? "Loading..."
              : id
                ? "Update Room Type"
                : "Create Room Type"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default UpsertRoomTypePage;
