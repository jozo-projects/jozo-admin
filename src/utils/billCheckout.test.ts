import { readFileSync } from "node:fs";
import { MutationObserver, QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { canCheckoutBill, refreshScheduleBillAndOrder, requireServedSuccess } from "./billCheckout";

const modal = readFileSync(new URL("../pages/RoomSchedule/components/ProcessInUseModal.tsx", import.meta.url), "utf8");
const serveModal = readFileSync(new URL("../components/modules/RoomSchedule/OrderDetailsModal.tsx", import.meta.url), "utf8");
const events = readFileSync(new URL("../context/RoomEventsContext.tsx", import.meta.url), "utf8");

describe("canonical bill checkout", () => {
  it("blocks absent/error/fetching/invalidated bill and quantity mutations", () => {
    const ready = { hasBill: true, isError: false, isFetching: false, isInvalidated: false, isMutating: false };
    expect(canCheckoutBill(ready)).toBe(true);
    for (const state of [{ hasBill: false }, { isError: true }, { isFetching: true }, { isInvalidated: true }, { isMutating: true }]) {
      expect(canCheckoutBill({ ...ready, ...state })).toBe(false);
    }
  });

  it("waits for canonical refresh of every bill variant and order, without touching another schedule", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let resolve!: (value: unknown) => void;
    const canonical = { items: [
      { itemId: "drink", price: 10, quantity: 1, gross: 10 },
      { itemId: "drink", price: 20, quantity: 2, gross: 40 },
    ], roomTotal: 100, fnbTotal: 50, totalAmount: 150 };
    const key = ["bill", "schedule", "promo", "end", "start", "date", "date", "phone"];
    client.setQueryData(key, { totalAmount: 120 });
    client.setQueryData(["bill", "other"], { totalAmount: 999 });
    const observer = new QueryObserver(client, { queryKey: key, queryFn: () => new Promise((r) => { resolve = r; }), staleTime: Infinity });
    const unsubscribe = observer.subscribe(() => {});
    let completed = false;
    const refresh = refreshScheduleBillAndOrder(client, "schedule").then(() => { completed = true; });
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(client.getQueryState(key)?.fetchStatus).toBe("fetching");
    resolve(canonical);
    await refresh;
    expect(client.getQueryData(key)).toEqual(canonical);
    expect(client.getQueryState(["bill", "other"])?.isInvalidated).toBe(false);
    unsubscribe();
    client.clear();
  });

  it("keeps the quantity mutation pending until canonical bill refresh finishes", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = ["bill", "schedule", "promo"];
    client.setQueryData(key, { totalAmount: 100 });
    let resolve!: (value: unknown) => void;
    let started!: () => void;
    const refreshing = new Promise<void>((r) => { started = r; });
    const observer = new QueryObserver(client, {
      queryKey: key,
      staleTime: Infinity,
      queryFn: () => new Promise((r) => { resolve = r; started(); }),
    });
    const unsubscribe = observer.subscribe(() => {});
    const mutation = new MutationObserver(client, {
      mutationKey: ["billQuantity", "schedule"],
      mutationFn: async () => undefined,
      onSettled: () => refreshScheduleBillAndOrder(client, "schedule"),
    });
    const pending = mutation.mutate();
    await refreshing;
    expect(mutation.getCurrentResult().isPending).toBe(true);
    expect(client.isMutating({ mutationKey: ["billQuantity", "schedule"] })).toBe(1);
    expect(client.getQueryData(key)).toEqual({ totalAmount: 100 });
    resolve({ totalAmount: 150 });
    await pending;
    expect(mutation.getCurrentResult().isPending).toBe(false);
    expect(client.getQueryData(key)).toEqual({ totalAmount: 150 });
    unsubscribe();
    client.clear();
  });

  it("blocks checkout after a failed refetch even when an old bill is cached", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const key = ["bill", "schedule"];
    client.setQueryData(key, { totalAmount: 100 });
    const observer = new QueryObserver(client, { queryKey: key, staleTime: Infinity, queryFn: async () => { throw new Error("offline"); } });
    const unsubscribe = observer.subscribe(() => {});
    await refreshScheduleBillAndOrder(client, "schedule");
    const state = client.getQueryState(key)!;
    expect(client.getQueryData(key)).toEqual({ totalAmount: 100 });
    expect(canCheckoutBill({ hasBill: !!state.data, isError: state.status === "error", isFetching: state.fetchStatus !== "idle", isInvalidated: state.isInvalidated, isMutating: false })).toBe(false);
    unsubscribe();
    client.clear();
  });

  it("invalidates all bill and order prefixes when room events lack schedule IDs", async () => {
    const client = new QueryClient();
    for (const key of [["bill", "a", "promo"], ["fnbOrderDetail", "a"], ["rooms"]]) client.setQueryData(key, {});
    await refreshScheduleBillAndOrder(client);
    expect(client.getQueryState(["bill", "a", "promo"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["fnbOrderDetail", "a"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["rooms"])?.isInvalidated).toBe(false);
    client.clear();
  });

  it("accepts serve payloads that identify the order, and rejects explicit failures", () => {
    expect(() => requireServedSuccess({ success: true })).not.toThrow();
    expect(() =>
      requireServedSuccess({
        message: "Order marked as served successfully",
        orderId: "1791918111204",
      }),
    ).not.toThrow();
    expect(() => requireServedSuccess({ success: false, message: "rejected" })).toThrow("rejected");
    expect(() => requireServedSuccess(undefined)).toThrow();
  });

  it("wires canonical lines and guards into checkout, not optimistic financial reconstruction", () => {
    expect(modal).not.toContain("const newFnBTotal");
    expect(modal).not.toContain("mergeBillItemsByItemId");
    expect(modal).toContain("items: canonicalBill.items");
    expect(modal).toContain("disabled={isCheckoutBlocked}");
    expect(modal).toContain("if (isCheckoutBlocked || checkoutInProgress.current) return;");
    expect(modal).toContain("await refreshScheduleBillAndOrder(queryClient, schedule._id)");
    expect(serveModal).toContain("requireServedSuccess(body.result ?? body)");
    expect(serveModal).toContain("await refreshScheduleBillAndOrder(queryClient, order.customerInfo.roomScheduleId)");
    expect(events).toContain("onConnect(handleBillReconnect)");
    expect(events).toContain("offConnect(handleBillReconnect)");
    expect(events.match(/refreshScheduleBillAndOrder\(queryClient/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
