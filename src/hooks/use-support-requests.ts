import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import supportRequestApis from "@/apis/supportRequest.apis";

export const SUPPORT_REQUEST_QUERY_KEYS = {
  all: ["supportRequests"] as const,
  active: (roomId: string) => ["supportRequests", "active", roomId] as const,
  history: (roomId: string) => ["supportRequests", "history", roomId] as const,
};

export const useAllSupportRequestHistory = () =>
  useQuery({
    queryKey: [...SUPPORT_REQUEST_QUERY_KEYS.all, "history"],
    queryFn: async () => {
      const response = await supportRequestApis.getAllHistory();
      return response.data.result ?? [];
    },
  });

export const useActiveSupportRequests = (roomId?: string) =>
  useQuery({
    queryKey: SUPPORT_REQUEST_QUERY_KEYS.active(roomId ?? ""),
    queryFn: async () => {
      if (!roomId) return [];
      const response = await supportRequestApis.getActive(roomId);
      return response.data.result ?? [];
    },
    enabled: Boolean(roomId),
  });

export const useSupportRequestHistory = (roomId?: string) =>
  useQuery({
    queryKey: SUPPORT_REQUEST_QUERY_KEYS.history(roomId ?? ""),
    queryFn: async () => {
      if (!roomId) return [];
      const response = await supportRequestApis.getHistory(roomId);
      return response.data.result ?? [];
    },
    enabled: Boolean(roomId),
  });

export const useAcknowledgeSupportRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      supportRequestApis.acknowledge(requestId),
    onSuccess: (response) => {
      const request = response.data.result;
      queryClient.invalidateQueries({
        queryKey: SUPPORT_REQUEST_QUERY_KEYS.active(request.roomId),
      });
      queryClient.invalidateQueries({
        queryKey: [...SUPPORT_REQUEST_QUERY_KEYS.all, "history"],
      });
    },
  });
};

export const useCloseUnsupportedSupportRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => supportRequestApis.close(requestId),
    onSuccess: (response) => {
      const request = response.data.result;
      queryClient.invalidateQueries({
        queryKey: SUPPORT_REQUEST_QUERY_KEYS.active(request.roomId),
      });
      queryClient.invalidateQueries({
        queryKey: [...SUPPORT_REQUEST_QUERY_KEYS.all, "history"],
      });
    },
  });
};

export const useResolveSupportRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      supportNote,
    }: {
      requestId: string;
      supportNote: string;
    }) => supportRequestApis.resolve(requestId, supportNote),
    onSuccess: (response) => {
      const request = response.data.result;
      queryClient.invalidateQueries({
        queryKey: SUPPORT_REQUEST_QUERY_KEYS.active(request.roomId),
      });
      queryClient.invalidateQueries({
        queryKey: SUPPORT_REQUEST_QUERY_KEYS.history(request.roomId),
      });
      queryClient.invalidateQueries({
        queryKey: [...SUPPORT_REQUEST_QUERY_KEYS.all, "history"],
      });
    },
  });
};
