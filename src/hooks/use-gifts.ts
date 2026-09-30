import { Gift, GiftBundleItem } from "@/@types/Gift";
import giftApis from "@/apis/gift.apis";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const GIFTS_QUERY_KEY = ["gifts"] as const;
const GIFT_DETAIL_STALE_TIME = 5 * 60 * 1000;

const fetchAllGifts = async () => {
  const response = await giftApis.listGifts();
  return response.data.result || [];
};

const fetchGiftById = async (id: string): Promise<Gift | undefined> => {
  const response = await giftApis.getGiftById(id);
  return response.data.result;
};

export const useGetAllGifts = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: GIFTS_QUERY_KEY,
    queryFn: fetchAllGifts,
    enabled: options?.enabled ?? true,
    staleTime: GIFT_DETAIL_STALE_TIME,
    refetchOnWindowFocus: true,
  });
};

/**
 * Resolve FNB items cho các giftId cần hiển thị.
 * Ưu tiên cache danh sách `["gifts"]` (admin), còn thiếu thì GET `/gifts/:id`
 * để staff (không có quyền list) vẫn xem được món cần chuẩn bị.
 */
export const useGiftItemsByIds = (
  giftIds: string[],
  options?: { enabled?: boolean },
) => {
  const queryClient = useQueryClient();
  const uniqueIds = useMemo(
    () => [...new Set(giftIds.filter(Boolean))].sort(),
    [giftIds],
  );
  const enabled = (options?.enabled ?? true) && uniqueIds.length > 0;

  const cachedList = queryClient.getQueryData<Gift[]>(GIFTS_QUERY_KEY);
  const itemsFromCache = useMemo(() => {
    const map: Record<string, GiftBundleItem[]> = {};
    if (!cachedList?.length) return map;
    const idSet = new Set(uniqueIds);
    for (const gift of cachedList) {
      if (gift._id && idSet.has(gift._id) && gift.items?.length) {
        map[gift._id] = gift.items;
      }
    }
    return map;
  }, [cachedList, uniqueIds]);

  const missingIds = useMemo(
    () => uniqueIds.filter((id) => !itemsFromCache[id]),
    [uniqueIds, itemsFromCache],
  );

  const giftQueries = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: ["gift", id] as const,
      queryFn: () => fetchGiftById(id),
      enabled,
      staleTime: GIFT_DETAIL_STALE_TIME,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });

  const fetchedGifts = giftQueries.map((query) => query.data);

  return useMemo(() => {
    const map: Record<string, GiftBundleItem[]> = { ...itemsFromCache };

    for (const gift of fetchedGifts) {
      if (gift?._id && gift.items?.length) {
        map[gift._id] = gift.items;
      }
    }

    return map;
  }, [itemsFromCache, fetchedGifts]);
};

export const useGetGiftById = (id: string) => {
  return useQuery({
    queryKey: ["gift", id],
    queryFn: () => giftApis.getGiftById(id),
    enabled: !!id,
  });
};

export const useCreateGift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (formData: FormData) => giftApis.createGift(formData),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã tạo quà tặng mới thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể tạo quà tặng mới",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateGift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      giftApis.updateGift(id, formData),
    onSuccess: (_, variables) => {
      toast({
        title: "Thành công",
        description: "Đã cập nhật quà tặng thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
      queryClient.invalidateQueries({ queryKey: ["gift", variables.id] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật quà tặng",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteGift = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => giftApis.deleteGift(id),
    onSuccess: () => {
      toast({
        title: "Thành công",
        description: "Đã xóa quà tặng thành công",
      });
      queryClient.invalidateQueries({ queryKey: ["gifts"] });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa quà tặng",
        variant: "destructive",
      });
    },
  });
};
