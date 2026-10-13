import type { QueryClient } from "@tanstack/react-query";

export function canCheckoutBill(state: {
  hasBill: boolean;
  isError: boolean;
  isFetching: boolean;
  isInvalidated: boolean;
  isMutating: boolean;
}): boolean {
  return state.hasBill && !state.isError && !state.isFetching &&
    !state.isInvalidated && !state.isMutating;
}

// Bill keys include promotion/time/phone variants. Room-only events cannot
// safely resolve a schedule ID, so invalidate all prefixes rather than guess.
export async function refreshScheduleBillAndOrder(
  queryClient: QueryClient,
  scheduleId?: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: scheduleId ? ["bill", scheduleId] : ["bill"] }),
    queryClient.invalidateQueries({ queryKey: scheduleId ? ["fnbOrderDetail", scheduleId] : ["fnbOrderDetail"] }),
  ]);
}

export function requireServedSuccess(
  result: { success?: boolean; message?: string; orderId?: string } | undefined,
): void {
  if (result?.success === false) {
    throw new Error(result.message || "Không thể xác nhận phục vụ đơn hàng");
  }
  if (result?.success === true || result?.orderId) return;
  throw new Error(result?.message || "Không thể xác nhận phục vụ đơn hàng");
}
