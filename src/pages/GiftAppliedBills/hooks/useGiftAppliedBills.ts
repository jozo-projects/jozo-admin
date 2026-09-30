import billAPis from "@/apis/bill.apis";
import { useQuery } from "@tanstack/react-query";
import type { GiftAppliedKind, GiftAppliedSource } from "../constants";

export type GiftAppliedBillsQueryParams = {
  page: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  kind?: GiftAppliedKind;
  source?: GiftAppliedSource;
  search?: string;
};

export const giftAppliedBillsQueryKey = {
  all: ["gift-applied-bills"] as const,
  list: (params: GiftAppliedBillsQueryParams) =>
    [...giftAppliedBillsQueryKey.all, params] as const,
};

export const useGiftAppliedBills = (
  params: GiftAppliedBillsQueryParams,
  enabled = true,
) => {
  return useQuery({
    queryKey: giftAppliedBillsQueryKey.list(params),
    queryFn: () =>
      billAPis.getGiftAppliedBills({
        page: params.page,
        limit: params.limit ?? 20,
        startDate: params.startDate,
        endDate: params.endDate,
        kind: params.kind,
        source: params.source,
        search: params.search,
      }),
    enabled,
    select: (response) => response.data.result,
  });
};
