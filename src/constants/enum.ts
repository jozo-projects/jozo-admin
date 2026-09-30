/**
 * Enum for user roles.
 * @enum {string}
 * @property {string} Admin - Administrator with full access
 * @property {string} Staff - Staff member with limited access
 * @property {string} User - Regular user with basic access
 */
export enum Role {
  Admin = "admin",
  Staff = "staff",
  Member = "client",
  User = "user",
}

/**
 * Enum for types of day.
 * @enum {string}
 * @property {string} Weekday - A weekday
 * @property {string} Weekend - A weekend
 * @property {string} Holiday - A holiday
 */
export enum DayType {
  Weekday = "weekday",
  Weekend = "weekend",
  Holiday = "holiday",
}

/**
 * Enum for types of room size.
 * @enum {string}
 * @property {string} Medium - A medium room
 * @property {string} Large - A large room
 * @property {string} Dorm - A dorm zone
 */
export enum RoomType {
  Small = "small",
  Medium = "medium",
  Large = "large",
  Dorm = "dorm",
}

/**
 * Enum for types of room status.
 * @enum {string}
 * @property {string} Available - A room is available
 * @property {string} InUse - A room is in use
 * @property {string} Booked - A room is booked
 * @property {string} Maintenance - A room is in maintenance
 * @property {string} Locked - A room is locked
 * @property {string} Cancelled - A room is cancelled
 */
export enum RoomStatus {
  Available = "available",
  InUse = "in use",
  Booked = "booked",
  Maintenance = "maintenance",
  Locked = "locked",
  Cancelled = "cancelled",
  Finished = "finished",
}

/**
 * Enum for payment methods.
 * @enum {string}
 * @property {string} Cash - Cash payment
 * @property {string} BankTransfer - Bank transfer payment
 */
export enum PaymentMethod {
  Cash = "cash",
  BankTransfer = "bank_transfer",
}

export enum FoodDrinkType {
  Drink = "drink",
  Snack = "snack",
}

export enum FnBCategory {
  SNACK = "snack",
  DRINK = "drink",
}

/**
 * Enum for employee schedule status.
 * @enum {string}
 * @property {string} Pending - Schedule is pending approval
 * @property {string} Approved - Schedule is approved
 * @property {string} InProgress - Schedule is in progress
 * @property {string} Completed - Schedule is completed
 * @property {string} Absent - Employee is absent
 * @property {string} Rejected - Schedule is rejected
 * @property {string} Cancelled - Schedule is cancelled
 */
export enum EmployeeScheduleStatus {
  All = "all",
  Pending = "pending",
  Approved = "approved",
  InProgress = "in-progress",
  Completed = "completed",
  Absent = "absent",
  Rejected = "rejected",
  Cancelled = "cancelled",
}

/**
 * Enum for shift types.
 * @enum {string}
 * @property {string} Morning - Shift 1: 09:00 - 14:00
 * @property {string} Afternoon - Shift 2: 14:00 - 19:00
 * @property {string} All - Shift 3: 19:00 - 01:00
 */
export enum ShiftType {
  All = "shift3", // Shift 3: 19:00 - 01:00
  Morning = "shift1", // Shift 1: 09:00 - 14:00
  Afternoon = "shift2", // Shift 2: 14:00 - 19:00
}
