import {
  FnBMenuCustomizationGroup,
  IFnBCustomizationGroupTemplate,
} from "@/@types/FnBCustomization";
import customizationGroupTemplateApis from "@/apis/customizationGroupTemplate.apis";
import { PageHeader } from "@/components/shared";
import { DeleteModal } from "@/components/shared/DeleteModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const groupSchema = z
  .object({
    groupKey: z.string().min(1, "groupKey là bắt buộc"),
    label: z.string().min(1, "Tên nhóm là bắt buộc"),
    minSelect: z.number().min(0),
    maxSelect: z.number().min(0),
    options: z
      .array(
        z.object({
          optionKey: z.string().min(1, "optionKey là bắt buộc"),
          label: z.string().min(1, "Tên option là bắt buộc"),
          priceDelta: z.number(),
        })
      )
      .min(1, "Cần tối thiểu 1 option"),
  })
  .refine((value) => value.maxSelect >= value.minSelect, {
    message: "maxSelect phải lớn hơn hoặc bằng minSelect",
    path: ["maxSelect"],
  });

const formSchema = z.object({
  templateKey: z.string().min(1, "templateKey là bắt buộc"),
  label: z.string().min(1, "Nhãn template là bắt buộc"),
  isActive: z.boolean(),
  group: groupSchema,
});

type FormData = z.infer<typeof formSchema>;

const initialGroup: FnBMenuCustomizationGroup = {
  groupKey: "",
  label: "",
  minSelect: 0,
  maxSelect: 1,
  options: [{ optionKey: "", label: "", priceDelta: 0 }],
};

function CustomizationGroupTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<IFnBCustomizationGroupTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] =
    useState<IFnBCustomizationGroupTemplate | null>(null);

  const isEdit = Boolean(selectedTemplate?.templateKey);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateKey: "",
      label: "",
      isActive: true,
      group: initialGroup,
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["customizationGroupTemplates"],
    queryFn: () => customizationGroupTemplateApis.getTemplates(),
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        templateKey: "",
        label: "",
        isActive: true,
        group: initialGroup,
      });
      return;
    }

    if (selectedTemplate) {
      form.reset({
        templateKey: selectedTemplate.templateKey,
        label: selectedTemplate.label,
        isActive: selectedTemplate.isActive,
        group: {
          groupKey: selectedTemplate.group?.groupKey || "",
          label: selectedTemplate.group?.label || "",
          minSelect: selectedTemplate.group?.minSelect || 0,
          maxSelect: selectedTemplate.group?.maxSelect || 1,
          options: selectedTemplate.group?.options?.length
            ? selectedTemplate.group.options
            : [{ optionKey: "", label: "", priceDelta: 0 }],
        },
      });
    }
  }, [form, isOpen, selectedTemplate]);

  const createMutation = useMutation({
    mutationFn: customizationGroupTemplateApis.createTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customizationGroupTemplates"] });
      toast({ title: "Thành công", description: "Đã tạo template mới." });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo template.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormData) =>
      customizationGroupTemplateApis.updateTemplate(
        selectedTemplate?.templateKey || "",
        values
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customizationGroupTemplates"] });
      toast({ title: "Thành công", description: "Đã cập nhật template." });
      setIsOpen(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật template.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateKey: string) =>
      customizationGroupTemplateApis.deleteTemplate(templateKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customizationGroupTemplates"] });
      toast({ title: "Thành công", description: "Đã xoá template." });
      setTemplateToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xoá template.",
        variant: "destructive",
      });
    },
  });

  const openCreateModal = () => {
    setSelectedTemplate(null);
    setIsOpen(true);
  };

  const openEditModal = (template: IFnBCustomizationGroupTemplate) => {
    setSelectedTemplate(template);
    setIsOpen(true);
  };

  const addOption = () => {
    const options = form.getValues("group.options") || [];
    form.setValue("group.options", [
      ...options,
      { optionKey: "", label: "", priceDelta: 0 },
    ]);
  };

  const removeOption = (index: number) => {
    const options = form.getValues("group.options") || [];
    form.setValue(
      "group.options",
      options.filter((_, optionIndex) => optionIndex !== index)
    );
  };

  const onSubmit = (values: FormData) => {
    if (isEdit) {
      updateMutation.mutate(values);
      return;
    }
    createMutation.mutate(values);
  };

  const templates = data?.data?.result || [];

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Customization Group Templates"
        description="Quản lý nhóm tuỳ chọn dùng chung cho menu item"
        icon={Coffee}
        actions={
          <Button onClick={openCreateModal}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Tạo template
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Key</TableHead>
              <TableHead>Nhãn</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Options</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading &&
              templates.map((template) => (
                <TableRow key={template._id || template.templateKey}>
                  <TableCell className="font-medium">{template.templateKey}</TableCell>
                  <TableCell>{template.label}</TableCell>
                  <TableCell>
                    {template.group?.label} ({template.group?.groupKey})
                  </TableCell>
                  <TableCell>{template.group?.options?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateToDelete(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && templates.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  Chưa có customization template nào
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);
          if (!nextOpen) {
            setSelectedTemplate(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Cập nhật Customization Template" : "Tạo Customization Template"}
            </DialogTitle>
            <DialogDescription>
              Quản lý nhóm tuỳ chọn dùng chung để tái sử dụng cho nhiều món.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>templateKey *</Label>
                <Input {...form.register("templateKey")} placeholder="vd: sugar-level" />
                {form.formState.errors.templateKey && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.templateKey.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nhãn template *</Label>
                <Input {...form.register("label")} placeholder="vd: Mức đường" />
                {form.formState.errors.label && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.label.message}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-md border p-4 space-y-4">
              <h3 className="text-lg font-medium">Group</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>groupKey *</Label>
                  <Input {...form.register("group.groupKey")} placeholder="vd: sugar" />
                </div>
                <div className="space-y-2">
                  <Label>Tên nhóm *</Label>
                  <Input {...form.register("group.label")} placeholder="vd: Mức đường" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>minSelect</Label>
                  <Input
                    type="number"
                    min={0}
                    {...form.register("group.minSelect", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>maxSelect</Label>
                  <Input
                    type="number"
                    min={0}
                    {...form.register("group.maxSelect", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Thêm option
                  </Button>
                </div>
                {(form.watch("group.options") || []).map((_, optionIndex) => (
                  <div key={optionIndex} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4 space-y-2">
                      <Label>optionKey</Label>
                      <Input
                        {...form.register(`group.options.${optionIndex}.optionKey`)}
                        placeholder="vd: no-sugar"
                      />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label>Tên option</Label>
                      <Input
                        {...form.register(`group.options.${optionIndex}.label`)}
                        placeholder="vd: Không đường"
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>priceDelta</Label>
                      <Input
                        type="number"
                        {...form.register(`group.options.${optionIndex}.priceDelta`, {
                          valueAsNumber: true,
                        })}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(optionIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-4">
              <div>
                <p className="font-medium">Kích hoạt template</p>
                <p className="text-sm text-gray-500">
                  Template đang active sẽ xuất hiện trong form menu item.
                </p>
              </div>
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedTemplate(null);
                }}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending
                  ? "Đang lưu..."
                  : isEdit
                    ? "Cập nhật"
                    : "Tạo mới"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteModal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={() => {
          if (templateToDelete?.templateKey) {
            deleteMutation.mutate(templateToDelete.templateKey);
          }
        }}
        title="Xóa Customization Template"
        description={`Bạn có chắc muốn xoá template "${templateToDelete?.label}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default CustomizationGroupTemplatesPage;
