export interface IMessengerMessage {
  _id: string;
  messageId: string;
  senderId: string;
  text: string;
  pageId: string;
  timestamp: number | string;
  receivedAt: string | Date;
  createdAt: string | Date;
}

export interface IMessengerMessageQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IMessengerMessageListResponse {
  messages: IMessengerMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
