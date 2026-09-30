import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSocket } from "@/hooks/useSocket";
import { Gift as GiftType } from "@/@types/Gift";
import { IBookingSocketData } from "@/@types/Booking";
import { OrderData } from "@/pages/RoomSchedule/components/RoomTimelineTable";
import { useToast } from "@/hooks/use-toast";
import {
  applyScheduleChangedToCache,
  getRoomSchedulesQueryKey,
} from "@/hooks/room-schedule";
import {
  IRoomSchedule,
  IRoomScheduleChangedSocketPayload,
} from "@/@types/Room";
import { useQueryClient } from "@tanstack/react-query";
import { parseUTCToLocal } from "@/lib/dayjs";
import {
  COFFEE_ORDER_BOARD_GAME_AUDIO_URLS,
  COFFEE_SUPPORT_BOARD_GAME_AUDIO_URLS,
  ONLINE_BOOKING_AUDIO_URL,
  ORDER_BOX_AUDIO_URLS,
  SUPPORT_BOX_AUDIO_URLS,
} from "@/constants/supportBoxAudio";
import {
  ICoffeeOrderSocketPayload,
  ICoffeeSessionOrder,
  ICoffeeSessionOrderDetail,
  ICoffeeSessionOrderLine,
  ICoffeeSessionOrderLineItem,
  ICoffeeOrderTotals,
  ICompactCoffeeSessionOrderBatch,
  IOrderBatchStatusChangedSocketPayload,
} from "@/@types/CoffeeSessionOrder";
import {
  applyBatchStatusChangedToDetail,
  isOrderCreatedSocketPayload,
  mergeAggregatedIntoDetail,
  summarizeLineItemsQuick,
} from "@/utils/coffeeSessionOrderBatch";
import roomApis from "@/apis/room.apis";
import supportRequestApis from "@/apis/supportRequest.apis";
import type { SupportRequest } from "@/@types/SupportRequest";

type SupportNotification = {
  roomId: string;
  message: string;
  timestamp: number;
};

type OrderNotificationState = {
  roomId: string;
  message: string;
  timestamp: number;
  orderData: OrderData;
};

type GiftNotificationState = {
  roomId: string;
  scheduleId: string;
  gift: GiftType;
  timestamp: number;
};

type SupportNotificationsMap = Record<string, SupportNotification>;
type SupportRequestsMap = Record<string, SupportRequest>;
type OrderNotificationsMap = Record<string, OrderNotificationState[]>;
type GiftNotificationsMap = Record<string, GiftNotificationState>;

type BlinkingMap = Record<string, boolean>;

type CoffeeSupportNotification = {
  tableCode: string;
  message: string;
  timestamp: number;
};

type CoffeeSupportNotificationsMap = Record<string, CoffeeSupportNotification>;

type CoffeeNewOrderNotification = {
  tableCode: string;
  tableId: string;
  coffeeSessionId: string;
  orderId: string;
  message: string;
  timestamp: number;
  lines?: ICoffeeSessionOrderLine[];
  lineItems?: ICoffeeSessionOrderLineItem[];
  orderTotals?: ICoffeeOrderTotals;
  createdBatch?: ICompactCoffeeSessionOrderBatch;
  submittedLineItems?: ICoffeeSessionOrderLineItem[];
};

const buildCoffeeOrderLinesFromAggregates = (
  o: ICoffeeSessionOrder,
): ICoffeeSessionOrderLine[] | undefined => {
  if (o.lines?.length) return o.lines;
  const out: ICoffeeSessionOrderLine[] = [];
  let idx = 0;
  for (const [itemId, q] of Object.entries(o.drinks || {})) {
    const quantity = Number(q) || 0;
    if (quantity > 0) {
      out.push({
        lineId: `dr-${idx++}`,
        itemId,
        category: "drink",
        quantity,
      });
    }
  }
  for (const [itemId, q] of Object.entries(o.snacks || {})) {
    const quantity = Number(q) || 0;
    if (quantity > 0) {
      out.push({
        lineId: `sn-${idx++}`,
        itemId,
        category: "snack",
        quantity,
      });
    }
  }
  return out.length ? out : undefined;
};

type CoffeeNewOrderNotificationsMap = Record<
  string,
  CoffeeNewOrderNotification
>;

interface RoomEventsContextValue {
  supportNotifications: SupportNotificationsMap;
  supportRequests: SupportRequestsMap;
  orderNotifications: OrderNotificationsMap;
  giftNotifications: GiftNotificationsMap;
  blinkingSupportRooms: BlinkingMap;
  blinkingOrderRooms: BlinkingMap;
  blinkingGiftRooms: BlinkingMap;
  coffeeSupportNotifications: CoffeeSupportNotificationsMap;
  blinkingCoffeeSupportTables: BlinkingMap;
  coffeeNewOrderNotifications: CoffeeNewOrderNotificationsMap;
  blinkingCoffeeNewOrderTables: BlinkingMap;
  clearSupportNotification: (roomId: string) => void;
  clearOrderNotification: (roomId: string, orderId?: string) => void;
  clearGiftNotification: (roomId: string) => void;
  clearCoffeeSupportNotification: (tableCode: string) => void;
  clearCoffeeNewOrderNotification: (tableCode: string) => void;
  /** Gọi sau khi đánh dấu batch đã phục vụ (API/socket) để ẩn icon đơn mới khi khớp. */
  clearCoffeeNewOrderAfterBatchServed: (args: {
    tableCode: string;
    batchId: string;
    coffeeSessionId: string;
  }) => void;
}

const RoomEventsContext = createContext<RoomEventsContextValue | undefined>(
  undefined,
);

interface RoomEventsProviderProps {
  children: React.ReactNode;
}

export const RoomEventsProvider: React.FC<RoomEventsProviderProps> = ({
  children,
}) => {
  const {
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
    onNewBooking,
    offNewBooking,
    onScheduleChanged,
    offScheduleChanged,
    onGiftClaimed,
    offGiftClaimed,
    onOrderNew,
    offOrderNew,
    onOrderCreated,
    offOrderCreated,
    onOrderBatchStatusChanged,
    offOrderBatchStatusChanged,
    onOrderSupportRequested,
    offOrderSupportRequested,
  } = useSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [supportNotifications, setSupportNotifications] =
    useState<SupportNotificationsMap>({});
  const [supportRequests, setSupportRequests] = useState<SupportRequestsMap>(
    {},
  );

  // Rebuild room bells after a full page reload. Realtime events alone cannot
  // restore requests that were created before the socket connected.
  useEffect(() => {
    let cancelled = false;
    void supportRequestApis
      .getAllHistory()
      .then((response) => {
        if (cancelled) return;
        const activeRequests = (response.data.result ?? []).filter(
          (request) => !["resolved", "closed"].includes(request.status),
        );
        setSupportRequests((previous) => ({
          ...previous,
          ...Object.fromEntries(
            activeRequests.map((request) => [request.requestId, request]),
          ),
        }));
      })
      .catch(() => {
        // The socket path remains available if the initial recovery request fails.
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const [orderNotifications, setOrderNotifications] =
    useState<OrderNotificationsMap>({});
  const [giftNotifications, setGiftNotifications] =
    useState<GiftNotificationsMap>({});

  const [blinkingSupportRooms, setBlinkingSupportRooms] = useState<BlinkingMap>(
    {},
  );
  const [blinkingOrderRooms, setBlinkingOrderRooms] = useState<BlinkingMap>({});
  const [blinkingGiftRooms, setBlinkingGiftRooms] = useState<BlinkingMap>({});
  const [coffeeSupportNotifications, setCoffeeSupportNotifications] =
    useState<CoffeeSupportNotificationsMap>({});
  const [blinkingCoffeeSupportTables, setBlinkingCoffeeSupportTables] =
    useState<BlinkingMap>({});
  const [coffeeNewOrderNotifications, setCoffeeNewOrderNotifications] =
    useState<CoffeeNewOrderNotificationsMap>({});
  const [blinkingCoffeeNewOrderTables, setBlinkingCoffeeNewOrderTables] =
    useState<BlinkingMap>({});

  const supportAudioRef = useRef<HTMLAudioElement | null>(null);

  // Text-to-speech cho toàn app: dùng Web Speech API (tts có sẵn trong trình duyệt)
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Web Speech API not supported");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find((voice) =>
      voice.lang?.toLowerCase().startsWith("vi"),
    );
    if (vietnameseVoice) {
      utterance.voice = vietnameseVoice;
    }

    // Dừng đọc cũ (nếu có) rồi đọc mới
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  /** Phát MP3 theo map key (trim); lỗi / không có URL → TTS fallback. Dùng chung ref với mọi alert âm thanh. */
  const playMappedAlertAudio = useCallback(
    (
      urls: Record<string, string>,
      rawLookupKey: string,
      fallbackSpeakText: string,
    ) => {
      const key = rawLookupKey.trim();
      const url = urls[key];
      if (!url || typeof window === "undefined") {
        speak(fallbackSpeakText);
        return;
      }
      const prev = supportAudioRef.current;
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      const audio = new Audio(url);
      supportAudioRef.current = audio;
      void audio.play().catch(() => {
        speak(fallbackSpeakText);
      });
    },
    [speak],
  );

  const playSupportBoxAudio = useCallback(
    (socketRoomId: string, fallbackSpeakText: string) =>
      playMappedAlertAudio(
        SUPPORT_BOX_AUDIO_URLS,
        socketRoomId,
        fallbackSpeakText,
      ),
    [playMappedAlertAudio],
  );

  const playCoffeeBoardGameSupportAudio = useCallback(
    (tableCode: string, fallbackSpeakText: string) =>
      playMappedAlertAudio(
        COFFEE_SUPPORT_BOARD_GAME_AUDIO_URLS,
        tableCode,
        fallbackSpeakText,
      ),
    [playMappedAlertAudio],
  );

  const playOrderBoxAudio = useCallback(
    (socketRoomId: string, fallbackSpeakText: string) =>
      playMappedAlertAudio(
        ORDER_BOX_AUDIO_URLS,
        socketRoomId,
        fallbackSpeakText,
      ),
    [playMappedAlertAudio],
  );

  const playCoffeeBoardGameOrderAudio = useCallback(
    (tableCode: string, fallbackSpeakText: string) =>
      playMappedAlertAudio(
        COFFEE_ORDER_BOARD_GAME_AUDIO_URLS,
        tableCode,
        fallbackSpeakText,
      ),
    [playMappedAlertAudio],
  );

  const playOnlineBookingAudio = useCallback(
    (fallbackSpeakText: string) => {
      if (typeof window === "undefined") {
        speak(fallbackSpeakText);
        return;
      }
      const prev = supportAudioRef.current;
      if (prev) {
        prev.pause();
        prev.currentTime = 0;
      }
      const audio = new Audio(ONLINE_BOOKING_AUDIO_URL);
      supportAudioRef.current = audio;
      void audio.play().catch(() => {
        speak(fallbackSpeakText);
      });
    },
    [speak],
  );

  const clearSupportNotification = useCallback((roomId: string) => {
    setSupportNotifications((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
    setBlinkingSupportRooms((prev) => ({
      ...prev,
      [roomId]: false,
    }));
  }, []);

  const clearOrderNotification = useCallback(
    (roomId: string, orderId?: string) => {
      setOrderNotifications((prev) => {
        const current = prev[roomId] || [];
        const remaining = orderId
          ? current.filter(
              (notification) => notification.orderData.orderId !== orderId,
            )
          : [];
        const next = { ...prev };
        if (remaining.length > 0) next[roomId] = remaining;
        else delete next[roomId];
        return next;
      });
      setBlinkingOrderRooms((prev) => ({
        ...prev,
        [roomId]: false,
      }));
    },
    [],
  );

  const clearGiftNotification = useCallback((roomId: string) => {
    setGiftNotifications((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });
    setBlinkingGiftRooms((prev) => ({
      ...prev,
      [roomId]: false,
    }));
  }, []);

  const clearCoffeeSupportNotification = useCallback((tableCode: string) => {
    setCoffeeSupportNotifications((prev) => {
      const next = { ...prev };
      delete next[tableCode];
      return next;
    });
    setBlinkingCoffeeSupportTables((prev) => ({
      ...prev,
      [tableCode]: false,
    }));
  }, []);

  const clearCoffeeNewOrderNotification = useCallback((tableCode: string) => {
    setCoffeeNewOrderNotifications((prev) => {
      const next = { ...prev };
      delete next[tableCode];
      return next;
    });
    setBlinkingCoffeeNewOrderTables((prev) => ({
      ...prev,
      [tableCode]: false,
    }));
  }, []);

  const clearCoffeeNewOrderAfterBatchServed = useCallback(
    (args: { tableCode: string; batchId: string; coffeeSessionId: string }) => {
      const tc = args.tableCode.trim();
      if (!tc || !args.batchId) return;

      setCoffeeNewOrderNotifications((prev) => {
        const notif = prev[tc];
        if (!notif) return prev;

        const batchMatches = notif.orderId === args.batchId;
        const legacyMatches =
          !notif.createdBatch && notif.coffeeSessionId === args.coffeeSessionId;

        if (batchMatches || legacyMatches) {
          const next = { ...prev };
          delete next[tc];
          return next;
        }
        return prev;
      });
      setBlinkingCoffeeNewOrderTables((prev) => ({
        ...prev,
        [tc]: false,
      }));
    },
    [],
  );

  // Socket subscription & room joining
  useEffect(() => {
    // Admin room để nhận booking/support/order/gift chung
    joinRoom("admin");

    const normalizeSupportRequest = (
      payload: unknown,
    ): SupportRequest | null => {
      const candidate =
        (payload as { result?: SupportRequest } | null)?.result ?? payload;
      if (
        !candidate ||
        typeof candidate !== "object" ||
        !("requestId" in candidate) ||
        !("roomId" in candidate)
      ) {
        console.warn("Ignoring malformed support request payload", payload);
        return null;
      }
      const request = candidate as SupportRequest;
      return {
        ...request,
        requestId: String(request.requestId),
        roomId: String(request.roomId),
      };
    };

    const upsertSupportRequest = (payload: unknown) => {
      const request = normalizeSupportRequest(payload);
      if (!request) return null;
      setSupportRequests((prev) => ({ ...prev, [request.requestId]: request }));
      return request;
    };

    const handleSupportRequestCreated = (payload: unknown) => {
      const request = upsertSupportRequest(payload);
      if (!request) return;
      setBlinkingSupportRooms((prev) => ({ ...prev, [request.roomId]: true }));
      toast({
        title: "Yêu cầu hỗ trợ mới",
        description: `Phòng ${request.roomId} đang chờ nhân viên nhận`,
      });
      playSupportBoxAudio(
        request.roomId,
        `Phòng ${request.roomId} có yêu cầu hỗ trợ mới`,
      );
    };

    const handleSupportRequestUpdated = (payload: unknown) => {
      const request = normalizeSupportRequest(payload);
      if (!request) return;

      if (["resolved", "closed"].includes(request.status)) {
        setSupportRequests((prev) => {
          const next = { ...prev };
          delete next[request.requestId];
          return next;
        });
        setBlinkingSupportRooms((prev) => ({
          ...prev,
          [request.roomId]: false,
        }));
        setSupportNotifications((prev) => {
          const next = { ...prev };
          delete next[request.roomId];
          return next;
        });
        return;
      }

      setSupportRequests((prev) => ({
        ...prev,
        [request.requestId]: request,
      }));
      if (request.status !== "pending") {
        setBlinkingSupportRooms((prev) => ({
          ...prev,
          [request.roomId]: false,
        }));
      }
    };

    const handleSupportRequestClosed = (payload: unknown) => {
      const request = normalizeSupportRequest(payload);
      if (!request) return;
      setSupportRequests((prev) => {
        const next = { ...prev };
        delete next[request.requestId];
        return next;
      });
      setBlinkingSupportRooms((prev) => ({
        ...prev,
        [request.roomId]: false,
      }));
      setSupportNotifications((prev) => {
        const next = { ...prev };
        delete next[request.roomId];
        return next;
      });
    };

    const handleNotification = (data: { roomId: string; message: string }) => {
      const roomId = data.roomId;

      setSupportNotifications((prev) => ({
        ...prev,
        [roomId]: {
          roomId,
          message: data.message,
          timestamp: Date.now(),
        },
      }));

      setBlinkingSupportRooms((prev) => ({
        ...prev,
        [roomId]: true,
      }));

      // Tự tắt nháy sau 15s (nhưng vẫn giữ notification để admin mở màn vẫn thấy)
      setTimeout(() => {
        setBlinkingSupportRooms((prev) => ({
          ...prev,
          [roomId]: false,
        }));
      }, 15000);

      // Toast + voice global
      toast({
        title: "Yêu cầu hỗ trợ mới",
        description: `Phòng ${roomId}: ${data.message}`,
      });
      playSupportBoxAudio(roomId, `Phòng ${roomId} ${data.message}`);
    };

    const handleOrderServedNotification = (data: {
      roomId: string;
      orderId?: string;
    }) => {
      clearOrderNotification(String(data.roomId), data.orderId);
    };

    const handleNewOrderNotification = (data: {
      type: string;
      roomId: string;
      message: string;
      timestamp: number;
      orderData: OrderData;
    }) => {
      if (data.type !== "new_order") return;

      console.log("data", data.orderData);

      const roomId = data.roomId;

      setOrderNotifications((prev) => {
        const current = prev[roomId] || [];
        const notification = {
          roomId,
          message: data.message,
          timestamp: data.timestamp,
          orderData: data.orderData,
        };
        const next = current.some(
          (item) => item.orderData.orderId === data.orderData.orderId,
        )
          ? current.map((item) =>
              item.orderData.orderId === data.orderData.orderId
                ? notification
                : item,
            )
          : [...current, notification];
        return { ...prev, [roomId]: next };
      });

      setBlinkingOrderRooms((prev) => ({
        ...prev,
        [roomId]: true,
      }));

      setTimeout(() => {
        setBlinkingOrderRooms((prev) => ({
          ...prev,
          [roomId]: false,
        }));
      }, 30000);

      toast({
        title: "Đơn hàng mới",
        description: `Phòng ${roomId}: ${data.message}`,
      });
      playOrderBoxAudio(roomId, `Đơn hàng mới từ phòng ${roomId}`);
    };

    const handleGiftClaimed = (data: {
      roomId: string;
      scheduleId: string;
      gift: GiftType;
    }) => {
      const roomId = data.roomId;

      setGiftNotifications((prev) => ({
        ...prev,
        [roomId]: {
          roomId,
          scheduleId: data.scheduleId,
          gift: data.gift,
          timestamp: Date.now(),
        },
      }));

      setBlinkingGiftRooms((prev) => ({
        ...prev,
        [roomId]: true,
      }));

      setTimeout(() => {
        setBlinkingGiftRooms((prev) => ({
          ...prev,
          [roomId]: false,
        }));
      }, 30000);

      toast({
        title: "Quà tặng đã được nhận",
        description: `Phòng ${roomId}: ${data.gift.name}`,
      });
      speak(`Quà tặng đã được nhận tại phòng ${roomId}`);
    };

    const flushCoffeeNewOrderUi = (
      tableCode: string,
      summary: string,
      options?: { batchHint?: string },
    ) => {
      setBlinkingCoffeeNewOrderTables((prev) => ({
        ...prev,
        [tableCode]: true,
      }));

      setTimeout(() => {
        setBlinkingCoffeeNewOrderTables((prev) => ({
          ...prev,
          [tableCode]: false,
        }));
      }, 30000);

      const batchSuffix = options?.batchHint ? ` — ${options.batchHint}` : "";
      toast({
        title: "Đơn hàng coffee mới",
        description: `Bàn ${tableCode}: ${summary}${batchSuffix}`,
      });
      playCoffeeBoardGameOrderAudio(
        tableCode,
        `Đơn hàng mới từ bàn ${tableCode}, ${summary}`,
      );
    };

    const handleCoffeeOrderSocket = (payload: ICoffeeOrderSocketPayload) => {
      queryClient.invalidateQueries({ queryKey: ["coffeeSessions"] });
      const sid = String(payload.coffeeSessionId ?? "").trim();
      if (sid) {
        void queryClient.invalidateQueries({
          queryKey: ["coffeeSessionOrder", sid],
        });
      }

      if (isOrderCreatedSocketPayload(payload)) {
        if (payload.aggregatedOrder && sid) {
          queryClient.setQueriesData(
            { queryKey: ["coffeeSessionOrder", sid] },
            (old: ICoffeeSessionOrderDetail | null | undefined) => {
              if (!old) {
                return old;
              }
              return mergeAggregatedIntoDetail(old, payload.aggregatedOrder);
            },
          );
        }

        const tableCodeRaw = payload.tableCode;
        if (tableCodeRaw == null || String(tableCodeRaw).trim() === "") {
          return;
        }
        const tableCode = String(tableCodeRaw).trim();
        const ts =
          typeof payload.createdAt === "number" &&
          !Number.isNaN(payload.createdAt)
            ? payload.createdAt
            : Date.now();

        const submitted = payload.submittedLineItems ?? [];
        const lineItems: ICoffeeSessionOrderLineItem[] =
          submitted.length > 0 ? submitted : payload.createdBatch.lineItems;
        const summary = summarizeLineItemsQuick(lineItems);
        const lines =
          payload.createdBatch.order?.lines?.length > 0
            ? payload.createdBatch.order.lines
            : undefined;

        setCoffeeNewOrderNotifications((prev) => ({
          ...prev,
          [tableCode]: {
            tableCode,
            tableId: String(payload.tableId ?? ""),
            coffeeSessionId: String(payload.coffeeSessionId ?? ""),
            orderId: payload.createdBatch.batchId,
            message: summary,
            timestamp: ts,
            lines,
            lineItems,
            orderTotals:
              payload.createdBatch.orderTotals ??
              payload.aggregatedOrder?.orderTotals,
            createdBatch: payload.createdBatch,
            submittedLineItems: payload.submittedLineItems,
          },
        }));

        flushCoffeeNewOrderUi(tableCode, summary, {
          batchHint: `đợt ${payload.createdBatch.batchId.slice(0, 8)}…`,
        });
        return;
      }

      const doc = payload.order;
      const innerOrder = payload.order?.order;
      const tableCodeRaw = payload.tableCode;

      if (
        tableCodeRaw == null ||
        String(tableCodeRaw).trim() === "" ||
        !innerOrder
      ) {
        return;
      }

      const tableCode = String(tableCodeRaw).trim();
      const sumQty = (rec: Record<string, number> | undefined) =>
        Object.values(rec ?? {}).reduce((acc, n) => acc + (Number(n) || 0), 0);

      const drinkQty = sumQty(innerOrder.drinks);
      const snackQty = sumQty(innerOrder.snacks);
      const parts: string[] = [];
      if (drinkQty > 0) {
        parts.push(drinkQty === 1 ? "1 đồ uống" : `${drinkQty} đồ uống`);
      }
      if (snackQty > 0) {
        parts.push(snackQty === 1 ? "1 món ăn vặt" : `${snackQty} món ăn vặt`);
      }
      const summary = parts.length > 0 ? parts.join(", ") : "Đơn hàng mới";
      const ts =
        typeof payload.createdAt === "number" &&
        !Number.isNaN(payload.createdAt)
          ? payload.createdAt
          : Date.now();

      const resolvedLines = buildCoffeeOrderLinesFromAggregates(innerOrder);

      setCoffeeNewOrderNotifications((prev) => ({
        ...prev,
        [tableCode]: {
          tableCode,
          tableId: String(payload.tableId ?? ""),
          coffeeSessionId: String(payload.coffeeSessionId ?? ""),
          orderId: String(doc._id ?? ""),
          message: summary,
          timestamp: ts,
          lines: resolvedLines,
          lineItems: doc.lineItems,
          orderTotals: doc.orderTotals,
        },
      }));

      flushCoffeeNewOrderUi(tableCode, summary);
    };

    const handleOrderBatchStatusChanged = (
      payload: IOrderBatchStatusChangedSocketPayload,
    ) => {
      const sid = String(payload.coffeeSessionId ?? "").trim();
      if (!sid) {
        return;
      }

      queryClient.setQueriesData(
        { queryKey: ["coffeeSessionOrder", sid] },
        (old: ICoffeeSessionOrderDetail | null | undefined) => {
          if (!old) {
            return old;
          }
          return applyBatchStatusChangedToDetail(old, payload);
        },
      );

      if (payload.status === "served") {
        const tc = String(payload.tableCode ?? "").trim();
        if (tc) {
          clearCoffeeNewOrderAfterBatchServed({
            tableCode: tc,
            batchId: payload.batchId,
            coffeeSessionId: sid,
          });
        }
      }
    };

    const handleOrderSupportRequested = (payload: unknown) => {
      const p = payload as {
        tableCode?: string;
        note?: string;
        message?: string;
      };
      const rawTableCode = p?.tableCode;
      if (rawTableCode == null || String(rawTableCode).trim() === "") return;

      const tableCode = String(rawTableCode).trim();
      const message = p?.note?.trim() || p?.message?.trim() || "Yêu cầu hỗ trợ";

      setCoffeeSupportNotifications((prev) => ({
        ...prev,
        [tableCode]: {
          tableCode,
          message,
          timestamp: Date.now(),
        },
      }));

      setBlinkingCoffeeSupportTables((prev) => ({
        ...prev,
        [tableCode]: true,
      }));

      setTimeout(() => {
        setBlinkingCoffeeSupportTables((prev) => ({
          ...prev,
          [tableCode]: false,
        }));
      }, 15000);

      queryClient.invalidateQueries({ queryKey: ["coffeeSessions"] });

      toast({
        title: "Yêu cầu hỗ trợ (coffee)",
        description: `Bàn ${tableCode}: ${message}`,
      });
      playCoffeeBoardGameSupportAudio(
        tableCode,
        `Bàn ${tableCode} yêu cầu hỗ trợ`,
      );
    };

    const handleNewBooking = (data: IBookingSocketData) => {
      const bookingData = data.booking;
      const roomId = data.roomId;

      if (!bookingData || !roomId) return;

      const roomName = bookingData.roomName || roomId;

      switch (bookingData.action) {
        case "booked":
          toast({
            title: "Booking mới",
            description: `${roomName}: Đã được đặt`,
          });
          playOnlineBookingAudio(`Phòng ${roomName} vừa được đặt`);
          break;
        case "cancelled":
          toast({
            title: "Booking đã bị hủy",
            description: `${roomName}: Đã bị hủy`,
            variant: "destructive",
          });
          speak(`Booking của phòng ${roomName} đã bị hủy`);
          break;
        default:
          break;
      }
    };

    const handleScheduleChanged = (data: IRoomScheduleChangedSocketPayload) => {
      if (!data.schedule?._id) return;

      const { action, schedule } = data;
      const dateKey =
        schedule.dateOfUse ??
        parseUTCToLocal(schedule.startTime).format("YYYY-MM-DD");

      queryClient.setQueryData(
        getRoomSchedulesQueryKey(dateKey),
        (old: IRoomSchedule[] | undefined) =>
          applyScheduleChangedToCache(old, action, schedule),
      );
    };

    onNotification(handleNotification);
    onSupportRequestCreated(handleSupportRequestCreated);
    onSupportRequestAcknowledged(handleSupportRequestUpdated);
    onSupportRequestExpired(handleSupportRequestUpdated);
    onSupportRequestNotSupported(handleSupportRequestUpdated);
    onSupportRequestResolved(handleSupportRequestUpdated);
    onSupportRequestClosed(handleSupportRequestClosed);
    onNewOrderNotification(handleNewOrderNotification);
    onOrderServedNotification(handleOrderServedNotification);
    onNewBooking(handleNewBooking);
    onScheduleChanged(handleScheduleChanged);
    onGiftClaimed(handleGiftClaimed);
    onOrderNew(handleCoffeeOrderSocket);
    onOrderCreated(handleCoffeeOrderSocket);
    onOrderBatchStatusChanged(handleOrderBatchStatusChanged);
    onOrderSupportRequested(handleOrderSupportRequested);

    return () => {
      offNotification(handleNotification);
      offSupportRequestCreated(handleSupportRequestCreated);
      offSupportRequestAcknowledged(handleSupportRequestUpdated);
      offSupportRequestExpired(handleSupportRequestUpdated);
      offSupportRequestNotSupported(handleSupportRequestUpdated);
      offSupportRequestResolved(handleSupportRequestUpdated);
      offSupportRequestClosed(handleSupportRequestClosed);
      offNewOrderNotification(handleNewOrderNotification);
      offOrderServedNotification(handleOrderServedNotification);
      offNewBooking(handleNewBooking);
      offScheduleChanged(handleScheduleChanged);
      offGiftClaimed(handleGiftClaimed);
      offOrderNew(handleCoffeeOrderSocket);
      offOrderCreated(handleCoffeeOrderSocket);
      offOrderBatchStatusChanged(handleOrderBatchStatusChanged);
      offOrderSupportRequested(handleOrderSupportRequested);
      leaveRoom("management");
      leaveRoom("admin");
    };
  }, [
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
    onNewBooking,
    offNewBooking,
    onScheduleChanged,
    offScheduleChanged,
    onGiftClaimed,
    offGiftClaimed,
    onOrderNew,
    offOrderNew,
    onOrderCreated,
    offOrderCreated,
    onOrderBatchStatusChanged,
    offOrderBatchStatusChanged,
    onOrderSupportRequested,
    offOrderSupportRequested,
    queryClient,
    toast,
    speak,
    playSupportBoxAudio,
    playCoffeeBoardGameSupportAudio,
    playOrderBoxAudio,
    playCoffeeBoardGameOrderAudio,
    playOnlineBookingAudio,
    clearCoffeeNewOrderAfterBatchServed,
    clearOrderNotification,
  ]);

  // Hydrate pending order notifications once on mount (do NOT put inside the
  // socket subscription effect — useSocket helpers are new refs every render,
  // which would re-run that effect and spam this API).
  useEffect(() => {
    let cancelled = false;

    const hydratePendingOrderNotifications = async () => {
      try {
        const response = await roomApis.getPendingOrderNotifications();
        const pending = response.data.result || [];
        if (cancelled || pending.length === 0) return;

        setOrderNotifications((prev) => {
          const next = { ...prev };
          pending.forEach((item) => {
            const notification = {
              roomId: item.roomId,
              message: item.message,
              timestamp: item.timestamp,
              orderData: item.orderData,
            };
            const current = next[item.roomId] || [];
            if (
              !current.some(
                (entry) => entry.orderData.orderId === item.orderData.orderId,
              )
            ) {
              next[item.roomId] = [...current, notification];
            }
          });
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to hydrate pending order notifications", error);
        }
      }
    };

    void hydratePendingOrderNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateActiveSupportRequests = async () => {
      try {
        const roomsResponse = await roomApis.getRooms();
        const rooms = roomsResponse.data.result ?? [];
        const activeResults = await Promise.all(
          rooms.map(async (room) => {
            const roomId = String(room._id ?? room.roomId ?? "");
            if (!roomId) return [];
            const response = await supportRequestApis.getActive(roomId);
            return response.data.result ?? [];
          }),
        );

        if (cancelled) return;
        setSupportRequests((prev) => {
          const next = { ...prev };
          activeResults.flat().forEach((request) => {
            next[request.requestId] = request;
          });
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to hydrate active support requests", error);
        }
      }
    };

    void hydrateActiveSupportRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  // Clear old notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setSupportNotifications((prev) => {
        const next: SupportNotificationsMap = {};
        Object.entries(prev).forEach(([roomId, notif]) => {
          if (now - notif.timestamp < 5 * 60 * 1000) {
            next[roomId] = notif;
          }
        });
        return next;
      });

      setOrderNotifications((prev) => {
        const next: OrderNotificationsMap = {};
        Object.entries(prev).forEach(([roomId, notifications]) => {
          const remaining = notifications.filter(
            (notification) => now - notification.timestamp < 10 * 60 * 1000,
          );
          if (remaining.length > 0) {
            next[roomId] = remaining;
          }
        });
        return next;
      });

      setGiftNotifications((prev) => {
        const next: GiftNotificationsMap = {};
        Object.entries(prev).forEach(([roomId, notif]) => {
          if (now - notif.timestamp < 10 * 60 * 1000) {
            next[roomId] = notif;
          }
        });
        return next;
      });

      setCoffeeSupportNotifications((prev) => {
        const next: CoffeeSupportNotificationsMap = {};
        Object.entries(prev).forEach(([code, notif]) => {
          if (now - notif.timestamp < 5 * 60 * 1000) {
            next[code] = notif;
          }
        });
        return next;
      });

      // Đơn coffee mới: không xóa theo thời gian — chỉ ẩn khi batch đã phục vụ
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const value = useMemo<RoomEventsContextValue>(
    () => ({
      supportNotifications,
      supportRequests,
      orderNotifications,
      giftNotifications,
      blinkingSupportRooms,
      blinkingOrderRooms,
      blinkingGiftRooms,
      coffeeSupportNotifications,
      blinkingCoffeeSupportTables,
      coffeeNewOrderNotifications,
      blinkingCoffeeNewOrderTables,
      clearSupportNotification,
      clearOrderNotification,
      clearGiftNotification,
      clearCoffeeSupportNotification,
      clearCoffeeNewOrderNotification,
      clearCoffeeNewOrderAfterBatchServed,
    }),
    [
      supportNotifications,
      supportRequests,
      orderNotifications,
      giftNotifications,
      blinkingSupportRooms,
      blinkingOrderRooms,
      blinkingGiftRooms,
      coffeeSupportNotifications,
      blinkingCoffeeSupportTables,
      coffeeNewOrderNotifications,
      blinkingCoffeeNewOrderTables,
      clearSupportNotification,
      clearOrderNotification,
      clearGiftNotification,
      clearCoffeeSupportNotification,
      clearCoffeeNewOrderNotification,
      clearCoffeeNewOrderAfterBatchServed,
    ],
  );

  return (
    <RoomEventsContext.Provider value={value}>
      {children}
    </RoomEventsContext.Provider>
  );
};

export const useRoomEvents = (): RoomEventsContextValue => {
  const ctx = useContext(RoomEventsContext);
  if (!ctx) {
    throw new Error("useRoomEvents must be used within RoomEventsProvider");
  }
  return ctx;
};
