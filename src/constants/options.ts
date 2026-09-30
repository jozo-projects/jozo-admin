import { DayType, PaymentMethod, RoomType } from "./enum";

export const ROOM_SIZE_OPTIONS = [
  { value: RoomType.Medium, label: "Medium" },
  { value: RoomType.Large, label: "Large" },
];

export const DAY_TYPE_OPTIONS = [
  { value: DayType.Weekday, label: "Weekday" },
  { value: DayType.Weekend, label: "Weekend" },
  { value: DayType.Holiday, label: "Holiday" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: PaymentMethod.Cash, label: "Tiền mặt" },
  { value: PaymentMethod.BankTransfer, label: "Chuyển khoản" },
];

export const DRINK_OPTIONS = [
  { id: "water", name: "Nước", price: 10000 },
  { id: "soda", name: "Nước ngọt", price: 15000 },
  { id: "tea", name: "Nước trà", price: 15000 },
];

export const SNACK_OPTIONS = [
  { id: "regular", name: "Snack thường", price: 10000 },
  { id: "potato", name: "Snack khoai tây", price: 16000 },
  { id: "medium", name: "Snack tầm trung", price: 12000 },
];
