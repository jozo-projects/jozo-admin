import { IMessengerMessageListResponse, IMessengerMessageQuery } from "@/@types/MessengerMessage";
import http from "@/utils/http";

const messengerMessageApis = {
  getMessages: (params?: IMessengerMessageQuery) =>
    http.get<HTTPResponse<IMessengerMessageListResponse>>("/messenger-messages", { params }),
  deleteMessage: (id: string) => http.delete<{ message: string }>(`/messenger-messages/${id}`),
};

export default messengerMessageApis;
