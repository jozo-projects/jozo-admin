import http from "@/utils/http";

export type RetailProduct = {
  itemId: string;
  name: string;
  category: "drink" | "snack";
  quantity: number;
  price: number;
  image?: string;
};

export type RetailSale = {
  _id: string;
  source: "retail";
  items: Array<{ itemId: string; name: string; price: number; quantity: number }>;
  totalAmount: number;
  paymentMethod: string;
  createdBy: string;
  idempotencyKey: string;
  createdAt: string;
};

const retailSaleApis = {
  getProducts: () =>
    http.get<HTTPResponse<RetailProduct[]>>("/retail-sales/products"),
  createSale: (data: {
    items: Array<{ itemId: string; name: string; price: number; quantity: number }>;
    paymentMethod: "cash" | "bank_transfer";
    idempotencyKey: string;
  }) => http.post<HTTPResponse<RetailSale>>("/retail-sales", data),
  printSale: (saleId: string) =>
    http.post<HTTPResponse<{ status: "queued"; saleId: string }>>(`/retail-sales/${saleId}/print`),
  printPreview: (data: {
    items: Array<{ itemId: string; name: string; price: number; quantity: number }>;
    paymentMethod: "cash" | "bank_transfer";
  }) => http.post<HTTPResponse<{ status: "queued" }>>("/retail-sales/print-preview", data),
  getSales: () =>
    http.get<HTTPResponse<RetailSale[]>>("/retail-sales"),
};

export default retailSaleApis;
