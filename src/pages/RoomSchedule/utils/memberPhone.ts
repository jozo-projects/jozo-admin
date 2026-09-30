export const PHONE_REGEX = /^0\d{9,10}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidMemberPhone = (phone: string) =>
  PHONE_REGEX.test(phone.trim());

export const isValidMemberEmail = (email?: string | null) => {
  const value = email?.trim() || "";
  return !value || EMAIL_REGEX.test(value);
};

/** Chỉ giữ chữ số, tối đa 11 ký tự (SĐT VN). */
export const sanitizePhoneInput = (value: string) =>
  value.replace(/\D/g, "").slice(0, 11);

/** Rỗng hoặc chỉ chứa ký tự kiểu SĐT → chế độ nhập số; có chữ → tìm theo tên. */
export const isPhoneLikeInput = (value: string) =>
  value.trim() === "" || /^[\d\s+().-]+$/.test(value.trim());

export const getMemberDisplayName = (user: {
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number?: string;
}) =>
  [user.full_name, user.name, user.username, user.email, user.phone_number]
    .map((value) => value?.trim())
    .find(Boolean) || "Thành viên";

export const getScheduleCustomerContact = (options: {
  memberInfo?: {
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  scheduleCustomerName?: string | null;
  scheduleCustomerEmail?: string | null;
}) => ({
  customerName:
    options.memberInfo?.full_name?.trim() ||
    options.memberInfo?.name?.trim() ||
    options.scheduleCustomerName?.trim() ||
    "",
  customerEmail:
    options.memberInfo?.email?.trim() ||
    options.scheduleCustomerEmail?.trim() ||
    "",
});
