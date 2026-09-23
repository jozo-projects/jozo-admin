import {
  COFFEE_BOARD_GAME_PRICING_ID,
  ICoffeePricingConfig,
} from "@/@types/CoffeePricing";
import coffeePricingApis from "@/apis/coffeePricing.apis";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Role } from "@/constants/enum";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  pricePerPerson: z.coerce
    .number()
    .min(0, "Price per person must be greater than or equal to 0"),
  currency: z.string().trim().min(1, "Currency is required"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  pricePerPerson: 0,
  currency: "VND",
};

const mapConfigToFormValues = (
  config?: ICoffeePricingConfig | null,
): FormValues => ({
  pricePerPerson: config?.pricePerPerson ?? defaultValues.pricePerPerson,
  currency: config?.currency ?? defaultValues.currency,
});

const formatPriceInput = (value: number) => value.toLocaleString("vi-VN");

const parsePriceInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
};

function CoffeePricingPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === Role.Admin;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const {
    data: coffeePricingResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["coffeePricing"],
    queryFn: () => coffeePricingApis.getCoffeePricing(),
  });

  const pricingConfig = coffeePricingResponse?.data.result;

  useEffect(() => {
    form.reset(mapConfigToFormValues(pricingConfig));
  }, [form, pricingConfig]);

  const { mutate: upsertCoffeePricing, isPending: isSaving } = useMutation({
    mutationFn: coffeePricingApis.upsertCoffeePricing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffeePricing"] });
      toast({
        title: "Pricing updated successfully",
        description: "Coffee table pricing has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update pricing",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!isAdmin) return;

    upsertCoffeePricing({
      _id: pricingConfig?._id || COFFEE_BOARD_GAME_PRICING_ID,
      pricePerPerson: values.pricePerPerson,
      currency: values.currency.trim().toUpperCase(),
    });
  };

  const isBusy = isLoading || isFetching || isSaving;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Pricing"
        description="Configure board game pricing for coffee lounge customers."
        icon={Coffee}
      />

      <Card>
        <CardHeader>
          <CardTitle>Pricing Configuration</CardTitle>
          <CardDescription>
            Set the amount charged per person for board game usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAdmin && (
            <div className="rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              You have view-only access. Only admin users can update this
              pricing.
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="pricePerPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Person</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter price per person"
                        disabled={isBusy || !isAdmin}
                        value={formatPriceInput(Number(field.value || 0))}
                        onChange={(event) =>
                          field.onChange(parsePriceInput(event.target.value))
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter currency code"
                        disabled={isBusy || !isAdmin}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!isAdmin || isBusy}>
                  {isSaving ? "Saving..." : "Save Pricing"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() =>
                    form.reset(mapConfigToFormValues(pricingConfig))
                  }
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CoffeePricingPage;
