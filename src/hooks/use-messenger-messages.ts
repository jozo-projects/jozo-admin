import { IMessengerMessageListResponse, IMessengerMessageQuery } from "@/@types/MessengerMessage";
import messengerMessageApis from "@/apis/messenger-message.apis";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const MESSENGER_MESSAGE_QUERY_KEYS = {
  all: ["messenger-messages"] as const,
  list: (params?: IMessengerMessageQuery) => [...MESSENGER_MESSAGE_QUERY_KEYS.all, "list", params] as const,
};

export const useMessengerMessages = (params?: IMessengerMessageQuery) =>
  useQuery({
    queryKey: MESSENGER_MESSAGE_QUERY_KEYS.list(params),
    queryFn: async (): Promise<IMessengerMessageListResponse> => {
      const response = await messengerMessageApis.getMessages(params);
      return response.data.result as IMessengerMessageListResponse;
    },
  });

export const useDeleteMessengerMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messengerMessageApis.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MESSENGER_MESSAGE_QUERY_KEYS.all });
    },
  });
};
