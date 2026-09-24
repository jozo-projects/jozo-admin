import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { useToast } from "./use-toast";
import useAuth from "./useAuth";
import { INotification } from "@/@types/Notification";
import { Gift } from "@/@types/Gift";
import { IBookingSocketData } from "@/@types/Booking";
import { IRoomScheduleChangedSocketPayload } from "@/@types/Room";
import {
  ICoffeeOrderSocketPayload,
  IOrderBatchStatusChangedSocketPayload,
} from "@/@types/CoffeeSessionOrder";
import type { SongPruneJob } from "@/apis/roomMusic.apis";
import type { SupportRequest } from "@/@types/SupportRequest";

export const useSocket = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    const userRole = user.role; // 'admin', 'staff', hoặc 'user'
    const userId = user._id;

    // Chỉ admin và staff mới kết nối đến management room
    if (userRole !== "admin" && userRole !== "staff") {
      return;
    }

    // Initialize socket connection với query params mới
    const queryParams: { role: string; userId?: string } = {
      role: userRole, // 'admin' hoặc 'staff'
    };

    // Thêm userId cho staff để nhận notifications riêng
    if (userRole === "staff") {
      queryParams.userId = userId;
    }

    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      query: queryParams,
      transports: ["websocket"],
    });

    // Setup reconnection handling
    socketRef.current.on("connect", () => {
      // Backend sẽ tự động join vào management room cho admin và staff
      // Staff vẫn cần join vào room user:userId để nhận notifications riêng
      if (userRole === "staff") {
        socketRef.current?.emit("join_room", `user:${userId}`);
      }
      // Admin không cần join room riêng vì đã được join vào management room tự động
    });

    socketRef.current.on("disconnect", () => {
      console.error("Socket disconnected");
    });

    socketRef.current.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to server",
        variant: "destructive",
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [toast, user]);

  const joinRoom = (roomId: string) => {
    socketRef.current?.emit("join_room", roomId);
  };

  const leaveRoom = (roomId: string) => {
    socketRef.current?.emit("leave_room", roomId);
  };

  const onNotification = (
    callback: (data: { roomId: string; message: string }) => void,
  ) => {
    socketRef.current?.on("notification", callback);
  };

  const offNotification = (
    callback: (data: { roomId: string; message: string }) => void,
  ) => {
    socketRef.current?.off("notification", callback);
  };

  const onSupportRequestCreated = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_created", callback);
  };

  const offSupportRequestCreated = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_created", callback);
  };

  const onSupportRequestAcknowledged = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_acknowledged", callback);
  };

  const offSupportRequestAcknowledged = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_acknowledged", callback);
  };

  const onSupportRequestExpired = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_expired", callback);
  };

  const offSupportRequestExpired = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_expired", callback);
  };

  const onSupportRequestNotSupported = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_not_supported", callback);
  };

  const offSupportRequestNotSupported = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_not_supported", callback);
  };

  const onSupportRequestResolved = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_resolved", callback);
  };

  const offSupportRequestResolved = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_resolved", callback);
  };

  const onSupportRequestClosed = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.on("support_request_closed", callback);
  };

  const offSupportRequestClosed = (
    callback: (data: SupportRequest) => void,
  ) => {
    socketRef.current?.off("support_request_closed", callback);
  };

  const onNewOrderNotification = (
    callback: (data: {
      type: string;
      roomId: string;
      message: string;
      timestamp: number;
      orderData: {
        orderId: string;
        items: Array<{
          itemId: string;
          name: string;
          quantity: number;
          price: number;
        }>;
        totalAmount: number;
        customerInfo: {
          roomName: string;
          roomScheduleId: string;
        };
        createdAt: string;
      };
    }) => void,
  ) => {
    socketRef.current?.on("new_order_notification", callback);
  };

  const offNewOrderNotification = (
    callback: (data: {
      type: string;
      roomId: string;
      message: string;
      timestamp: number;
      orderData: {
        orderId: string;
        items: Array<{
          itemId: string;
          name: string;
          quantity: number;
          price: number;
        }>;
        totalAmount: number;
        customerInfo: {
          roomName: string;
          roomScheduleId: string;
        };
        createdAt: string;
      };
    }) => void,
  ) => {
    socketRef.current?.off("new_order_notification", callback);
  };

  const onOrderServedNotification = (
    callback: (data: {
      type: "order_served";
      roomId: string;
      notificationId?: string;
      orderId?: string;
      servedBy?: string;
      servedAt?: string;
    }) => void,
  ) => {
    socketRef.current?.on("order_served_notification", callback);
  };

  const offOrderServedNotification = (
    callback: (data: {
      type: "order_served";
      roomId: string;
      notificationId?: string;
      orderId?: string;
      servedBy?: string;
      servedAt?: string;
    }) => void,
  ) => {
    socketRef.current?.off("order_served_notification", callback);
  };

  const onOrderNew = (callback: (data: ICoffeeOrderSocketPayload) => void) => {
    socketRef.current?.on("order:new", callback);
  };

  const offOrderNew = (callback: (data: ICoffeeOrderSocketPayload) => void) => {
    socketRef.current?.off("order:new", callback);
  };

  const onOrderCreated = (
    callback: (data: ICoffeeOrderSocketPayload) => void,
  ) => {
    socketRef.current?.on("order:created", callback);
  };

  const offOrderCreated = (
    callback: (data: ICoffeeOrderSocketPayload) => void,
  ) => {
    socketRef.current?.off("order:created", callback);
  };

  const onOrderBatchStatusChanged = (
    callback: (data: IOrderBatchStatusChangedSocketPayload) => void,
  ) => {
    socketRef.current?.on("order:batch_status_changed", callback);
  };

  const offOrderBatchStatusChanged = (
    callback: (data: IOrderBatchStatusChangedSocketPayload) => void,
  ) => {
    socketRef.current?.off("order:batch_status_changed", callback);
  };

  const onOrderSupportRequested = (callback: (data: unknown) => void) => {
    socketRef.current?.on("order:support_requested", callback);
  };

  const offOrderSupportRequested = (callback: (data: unknown) => void) => {
    socketRef.current?.off("order:support_requested", callback);
  };

  const onNewBooking = (callback: (data: IBookingSocketData) => void) => {
    socketRef.current?.on("booking_notification", callback);
  };

  const offNewBooking = (callback: (data: IBookingSocketData) => void) => {
    socketRef.current?.off("booking_notification", callback);
  };

  const onScheduleChanged = (
    callback: (data: IRoomScheduleChangedSocketPayload) => void,
  ) => {
    socketRef.current?.on("schedule_changed", callback);
  };

  const offScheduleChanged = (
    callback: (data: IRoomScheduleChangedSocketPayload) => void,
  ) => {
    socketRef.current?.off("schedule_changed", callback);
  };

  // Employee Schedule Events
  const onNewScheduleRegistration = (
    callback: (data: {
      userId: string;
      userName?: string;
      schedules: Array<{
        date: string;
        shiftType: string;
        status: string;
      }>;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.on("new_schedule_registration", callback);
  };

  const offNewScheduleRegistration = (
    callback: (data: {
      userId: string;
      userName?: string;
      schedules: Array<{
        date: string;
        shiftType: string;
        status: string;
      }>;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.off("new_schedule_registration", callback);
  };

  const onScheduleStatusUpdated = (
    callback: (data: {
      scheduleId: string;
      schedule: {
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      };
      status: string;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.on("schedule_status_updated", callback);
  };

  const offScheduleStatusUpdated = (
    callback: (data: {
      scheduleId: string;
      schedule: {
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      };
      status: string;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.off("schedule_status_updated", callback);
  };

  const onScheduleAssigned = (
    callback: (data: {
      schedules: Array<{
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      }>;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.on("schedule_assigned", callback);
  };

  const offScheduleAssigned = (
    callback: (data: {
      schedules: Array<{
        _id: string;
        date: string;
        shiftType: string;
        status: string;
        note?: string;
      }>;
      message: string;
    }) => void,
  ) => {
    socketRef.current?.off("schedule_assigned", callback);
  };

  // Notification listeners
  const onNewNotification = (
    callback: (notification: INotification) => void,
  ) => {
    socketRef.current?.on("new_notification", callback);
  };

  const offNewNotification = (
    callback: (notification: INotification) => void,
  ) => {
    socketRef.current?.off("new_notification", callback);
  };

  // Gift claimed event listener
  const onGiftClaimed = (
    callback: (data: {
      roomId: string;
      scheduleId: string;
      gift: Gift;
    }) => void,
  ) => {
    socketRef.current?.on("gift_claimed", callback);
  };

  const offGiftClaimed = (
    callback: (data: {
      roomId: string;
      scheduleId: string;
      gift: Gift;
    }) => void,
  ) => {
    socketRef.current?.off("gift_claimed", callback);
  };

  const onSongPruneStarted = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.on("song_prune_started", callback);
  };

  const offSongPruneStarted = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.off("song_prune_started", callback);
  };

  const onSongPruneProgress = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.on("song_prune_progress", callback);
  };

  const offSongPruneProgress = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.off("song_prune_progress", callback);
  };

  const onSongPruneFinished = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.on("song_prune_finished", callback);
  };

  const offSongPruneFinished = (callback: (job: SongPruneJob) => void) => {
    socketRef.current?.off("song_prune_finished", callback);
  };

  return {
    socket: socketRef.current,
    joinRoom,
    leaveRoom,
    onNotification,
    offNotification,
    onSupportRequestCreated,
    offSupportRequestCreated,
    onSupportRequestAcknowledged,
    offSupportRequestAcknowledged,
    onSupportRequestExpired,
    offSupportRequestExpired,
    onSupportRequestNotSupported,
    offSupportRequestNotSupported,
    onSupportRequestResolved,
    offSupportRequestResolved,
    onSupportRequestClosed,
    offSupportRequestClosed,
    onNewOrderNotification,
    offNewOrderNotification,
    onOrderServedNotification,
    offOrderServedNotification,
    onOrderNew,
    offOrderNew,
    onOrderCreated,
    offOrderCreated,
    onOrderBatchStatusChanged,
    offOrderBatchStatusChanged,
    onOrderSupportRequested,
    offOrderSupportRequested,
    onNewBooking,
    offNewBooking,
    onScheduleChanged,
    offScheduleChanged,
    onNewScheduleRegistration,
    offNewScheduleRegistration,
    onScheduleStatusUpdated,
    offScheduleStatusUpdated,
    onScheduleAssigned,
    offScheduleAssigned,
    onNewNotification,
    offNewNotification,
    onGiftClaimed,
    offGiftClaimed,
    onSongPruneStarted,
    offSongPruneStarted,
    onSongPruneProgress,
    offSongPruneProgress,
    onSongPruneFinished,
    offSongPruneFinished,
  };
};
