import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import retailSaleApis, { RetailProduct } from "@/apis/retailSale.apis";
import { Page, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

type CartLine = RetailProduct & { cartQuantity: number };

export default function RetailSalesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "drink" | "snack">("all");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">(
    "cash",
  );
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [isPreviewPrinted, setIsPreviewPrinted] = useState(false);

  const productsQuery = useQuery({
    queryKey: ["retail-products"],
    queryFn: async () => (await retailSaleApis.getProducts()).data.result || [],
  });

  const saleMutation = useMutation({
    mutationFn: retailSaleApis.createSale,
    onSuccess: async (response) => {
      const saleId = response.data.result?._id;
      if (!saleId)
        throw new Error("API không trả về bill bán lẻ sau khi thanh toán");
      setCart({});
      setLastSaleId(saleId);
      setIsPreviewPrinted(false);
      await queryClient.invalidateQueries({ queryKey: ["retail-products"] });
      await queryClient.invalidateQueries({ queryKey: ["retail-sales"] });
      toast({
        title: "Đã xác nhận thanh toán",
        description: "Bill đã được chốt.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể thanh toán",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: retailSaleApis.printPreview,
    onSuccess: () => {
      setIsPreviewPrinted(true);
      toast({
        title: "Đã in bill tạm tính",
        description: "Mời khách kiểm tra bill trước khi xác nhận thanh toán.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Không thể in bill tạm tính",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const products = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (productsQuery.data || []).filter((product) => {
      const matchesCategory =
        category === "all" || product.category === category;
      const matchesSearch =
        !normalized || product.name.toLowerCase().includes(normalized);
      return matchesCategory && matchesSearch;
    });
  }, [category, productsQuery.data, search]);

  const lines = Object.values(cart);
  const total = lines.reduce(
    (sum, line) => sum + line.price * line.cartQuantity,
    0,
  );

  const addProduct = (product: RetailProduct) => {
    setIsPreviewPrinted(false);
    setCart((current) => {
      const previous = current[product.itemId];
      const nextQuantity = Math.min(
        (previous?.cartQuantity || 0) + 1,
        product.quantity,
      );
      return {
        ...current,
        [product.itemId]: { ...product, cartQuantity: nextQuantity },
      };
    });
  };

  const changeQuantity = (line: CartLine, delta: number) => {
    setIsPreviewPrinted(false);
    const nextQuantity = line.cartQuantity + delta;
    setCart((current) => {
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[line.itemId];
        return next;
      }
      return {
        ...current,
        [line.itemId]: {
          ...line,
          cartQuantity: Math.min(nextQuantity, line.quantity),
        },
      };
    });
  };

  const printPreview = () => {
    if (!lines.length) return;
    previewMutation.mutate({
      items: lines.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        price: line.price,
        quantity: line.cartQuantity,
      })),
      paymentMethod,
    });
  };

  const checkout = () => {
    if (!lines.length || !isPreviewPrinted) return;
    saleMutation.mutate({
      items: lines.map((line) => ({
        itemId: line.itemId,
        name: line.name,
        price: line.price,
        quantity: line.cartQuantity,
      })),
      paymentMethod,
      idempotencyKey: `retail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  };

  return (
    <Page>
      <PageHeader
        title="Bán lẻ"
        description="Bán trực tiếp tại quầy, không gắn với phòng."
        icon={ShoppingCart}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader className="space-y-4">
            <CardTitle>Sản phẩm</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm món..."
              />
              <div className="flex gap-2">
                {(["all", "drink", "snack"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={category === value ? "default" : "outline"}
                    onClick={() => setCategory(value)}
                  >
                    {value === "all"
                      ? "Tất cả"
                      : value === "drink"
                        ? "Đồ uống"
                        : "Snack"}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? <p>Đang tải sản phẩm...</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.itemId}
                  type="button"
                  className="rounded-lg border p-4 text-left transition hover:border-primary"
                  onClick={() => addProduct(product)}
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Còn {product.quantity}
                  </div>
                  <div className="mt-3 font-semibold">
                    {money(product.price)}
                  </div>
                </button>
              ))}
            </div>
            {!productsQuery.isLoading && !products.length ? (
              <p className="text-sm text-muted-foreground">
                Không có sản phẩm phù hợp.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Giỏ hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!lines.length ? (
              <p className="text-sm text-muted-foreground">Chưa có sản phẩm.</p>
            ) : null}
            {lines.map((line) => (
              <div
                key={line.itemId}
                className="flex items-center justify-between gap-3 border-b pb-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{line.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {money(line.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => changeQuantity(line, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-5 text-center">{line.cartQuantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => changeQuantity(line, 1)}
                    disabled={line.cartQuantity >= line.quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Tổng</span>
              <span>{money(total)}</span>
            </div>
            <select
              className="h-10 w-full rounded-md border bg-background px-3"
              value={paymentMethod}
              onChange={(event) => {
                setPaymentMethod(event.target.value as typeof paymentMethod);
                setIsPreviewPrinted(false);
              }}
            >
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
            <Button
              className="w-full"
              variant="outline"
              disabled={!lines.length || previewMutation.isPending}
              onClick={printPreview}
            >
              {previewMutation.isPending
                ? "Đang in bill tạm tính..."
                : "In bill"}
            </Button>
            <Button
              className="w-full"
              disabled={
                !lines.length || !isPreviewPrinted || saleMutation.isPending
              }
              onClick={checkout}
            >
              {saleMutation.isPending
                ? "Đang xác nhận..."
                : isPreviewPrinted
                  ? "Xác nhận thanh toán"
                  : "In bill trước khi thanh toán"}
            </Button>
            {lastSaleId ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    await retailSaleApis.printSale(lastSaleId);
                    toast({ title: "Đã gửi lại bill tới máy in" });
                  } catch (error) {
                    toast({
                      title: "In bill thất bại",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Kiểm tra máy in.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                In lại bill gần nhất
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
